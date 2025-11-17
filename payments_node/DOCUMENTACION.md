# Microservicio de Pagos (Payments)

## Casos de uso

### CU1: Crear pago con tarjeta de crédito/débito

- Precondición: usuario autenticado, orden válida en ordersgo

- Camino normal:

  - Usuario envía datos de tarjeta (número, fecha de expiración, CVV, titular)
  - El servicio valida los datos usando algoritmo de Luhn
  - Valida que la tarjeta no esté vencida
  - Crea el pago en estado PENDING
  - Simula procesamiento con gateway (éxito/error aleatorio)
  - Si es exitoso, marca como APPROVED y publica evento `payment.success` o `payment.partial`
  - Guarda el método como preferido del usuario

- Caminos alternativos:
  - Si el número de tarjeta es inválido, rechaza con error INVALID_NUMBER
  - Si la tarjeta está vencida, rechaza con error EXPIRED_CARD
  - Si falla el procesamiento, marca como REJECTED y publica `payment.failed`
  - Si es un pago parcial (no cubre el total de la orden), publica `payment.partial` en lugar de `payment.success`

### CU2: Crear pago con transferencia bancaria

- Precondición: usuario autenticado, orden válida en ordersgo

- Camino normal:

  - Usuario envía datos de transferencia (CBU, alias, banco)
  - El servicio valida el formato del CBU (22 dígitos)
  - Crea el pago en estado PENDING
  - Programa confirmación asíncrona (5 segundos)
  - Después del delay, simula confirmación bancaria (90% éxito, 10% rechazo)
  - Si es exitoso, marca como APPROVED y publica evento correspondiente
  - Guarda el método como preferido del usuario

- Caminos alternativos:
  - Si el CBU es inválido, rechaza inmediatamente con error INVALID_CBU
  - Si el banco rechaza, marca como REJECTED con error BANK_REJECTED
  - El usuario puede aprobar manualmente el pago PENDING con endpoint `/payments/:id/approve`

### CU3: Crear pago con wallet

- Precondición: usuario autenticado, orden válida en ordersgo, saldo suficiente en wallet

- Camino normal:

  - Usuario selecciona pago con wallet
  - El servicio consulta el saldo disponible
  - Verifica que el saldo sea >= monto del pago
  - Descuenta el monto de la wallet
  - Crea el pago en estado APPROVED
  - Publica evento `payment.success` o `payment.partial`
  - Guarda el método como preferido del usuario

- Caminos alternativos:
  - Si el saldo es insuficiente, rechaza con error INSUFFICIENT_FUNDS
  - No procesa el pago ni descuenta fondos

### CU4: Reembolso automático por orden cancelada

- Precondición: orden con pagos aprobados es cancelada en ordersgo

- Camino normal:

  - El servicio recibe evento `order.canceled` de RabbitMQ
  - Busca todos los pagos APPROVED asociados a la orden
  - Para cada pago:
    - Si es wallet, acredita el monto automáticamente con `walletService.refund()`
    - Si es tarjeta/transferencia, marca como REFUNDED (reembolso manual)
  - Marca el pago como REFUNDED
  - Publica evento `payment.refunded` para cada pago

- Caminos alternativos:
  - Si un reembolso falla, reintenta hasta 3 veces con backoff exponencial
  - Si agota los reintentos, registra error y continúa con los demás pagos
  - No bloquea el reembolso de otros pagos por un fallo individual

### CU5: Consultar historial de pagos del usuario

- Precondición: usuario autenticado

- Camino normal:

  - Usuario consulta su historial
  - El servicio busca todos los pagos del userId
  - Retorna lista paginada con todos los pagos (exitosos, fallidos, pendientes, reembolsados)
  - Incluye información de orden, método, monto, estado, timestamp

- Caminos alternativos:
  - Si no tiene pagos, retorna lista vacía

### CU6: Obtener método de pago preferido

- Precondición: usuario autenticado, al menos un pago exitoso previo

- Camino normal:

  - Usuario consulta su método preferido
  - El servicio busca el último método de pago exitoso
  - Retorna método, fecha de último uso, cantidad de usos exitosos

- Caminos alternativos:
  - Si el usuario nunca realizó un pago exitoso, retorna mensaje indicando que no hay método preferido

### CU7: Aprobar pago PENDING manualmente

- Precondición: pago en estado PENDING (típicamente transferencia bancaria)

- Camino normal:

  - Admin o webhook llama al endpoint `/payments/:id/approve`
  - El servicio valida que el pago esté en estado PENDING
  - Aprueba el pago con transaction ID
  - Publica evento correspondiente
  - Guarda método como preferido

- Caminos alternativos:
  - Si el pago no está en PENDING, retorna error
  - Si no se proporciona transaction ID, genera uno automáticamente

### CU8: Gestionar wallet del usuario

- Precondición: usuario autenticado

- Camino normal:

  - **Depositar**: Usuario deposita fondos, se acreditan a su wallet
  - **Consultar saldo**: Usuario consulta su saldo disponible
  - **Reembolsar**: Sistema acredita reembolso por cancelación/devolución

- Caminos alternativos:
  - Si el usuario no tiene wallet, se crea automáticamente con saldo 0
  - Los montos deben ser siempre positivos y mayores a 0

### CU9: Pagos parciales múltiples

- Precondición: orden con monto mayor al pago individual

- Camino normal:

  - Usuario realiza primer pago por monto parcial (ej: $500 de $1500)
  - El servicio calcula: paymentNumber=1, totalPaidSoFar=$500, partialPayment=true
  - Publica evento `payment.partial` (no `payment.success`)
  - Usuario realiza segundo pago ($600)
  - El servicio calcula: paymentNumber=2, totalPaidSoFar=$1100, partialPayment=true
  - Usuario realiza tercer pago ($400)
  - El servicio calcula: paymentNumber=3, totalPaidSoFar=$1500, partialPayment=false
  - Publica evento `payment.success` (orden completamente pagada)

- Caminos alternativos:
  - Si un pago parcial es rechazado, no afecta los pagos anteriores exitosos
  - El usuario puede combinar diferentes métodos de pago (tarjeta + wallet)

## Modelo de datos

**Payment**

- \_id: string (generado por MongoDB)
- orderId: string (referencia a la orden en ordersgo)
- userId: string (referencia al usuario en authgo)
- amount: number (monto de este pago individual)
- currency: string (default: "ARS")
- method: enum ["credit_card", "debit_card", "bank_transfer", "wallet"]
- status: enum ["pending", "approved", "rejected", "refunded"]
  - **pending**: Pago creado, esperando procesamiento
  - **approved**: Pago exitoso
  - **rejected**: Pago rechazado por validaciones o gateway
  - **refunded**: Pago reembolsado por cancelación de orden
- transactionId: string (opcional) -
  - ID único de la transacción del gateway/banco (ej: "BANK-1731758400000-ABC123")
  - Se genera automáticamente al aprobar el pago
  - Necesario para trazabilidad, auditoría y conciliación bancaria
- paymentData: object (opcional) - Datos seguros del método de pago
  - **Tarjeta**: últimos 4 dígitos, fecha expiración, titular (NO se guarda CVV ni número completo por seguridad)
  - **Transferencia**: CBU, alias, nombre del banco
  - **Wallet**: referencia al usuario (walletPayment: true)
- errorMessage: string (opcional)
  - Descripción legible del error cuando status=rejected
  - Ejemplo: "Saldo insuficiente en la wallet", "Tarjeta vencida"
  - Se muestra al usuario para entender qué falló
- errorCode: string (opcional) -
  - Código técnico del error para procesamiento automático
  - Valores posibles: EXPIRED_CARD, INSUFFICIENT_FUNDS, INVALID_NUMBER, INVALID_CBU, BANK_REJECTED, etc.
  - Permite a otros servicios manejar errores programáticamente
- partialPayment: boolean (indica si es pago parcial o completo)
- paymentNumber: number (número de pago en la secuencia: 1, 2, 3...)
- totalOrderAmount: number (monto total de la orden completa)
- totalPaidSoFar: number (total acumulado pagado hasta este pago incluido)
- created: Date - timestamp automático de Mongoose (createdAt)
- updated: Date - timestamp automático de Mongoose (updatedAt, se actualiza en cada save())

**Wallet**

- \_id: string (generado por MongoDB)
- userId: string (único, cada usuario tiene una wallet)
- balance: number (saldo disponible, no puede ser negativo)
- currency: string (default: "ARS")
- created: Date (timestamp automático de Mongoose)
- updated: Date (timestamp automático de Mongoose)

**PreferredPaymentMethod**

- \_id: string (generado por MongoDB)
- userId: string (único, cada usuario tiene un solo método preferido)
- method: enum ["credit_card", "debit_card", "bank_transfer", "wallet"]
- lastUsed: Date (última vez que usó este método con éxito)
- successCount: number (cantidad de pagos exitosos con este método, se incrementa automáticamente)
- created: Date (timestamp automático de Mongoose)
- updated: Date (timestamp automático de Mongoose)

## Interfaz REST

### Crear pago

`POST /api/payments`

**Headers**

- Authorization: Bearer token (requerido)

**Body**

```json
{
  "orderId": "order123",
  "amount": 1500,
  "method": "credit_card",
  "paymentData": {
    "cardNumber": "4532015112830366",
    "expiryDate": "12/25",
    "cvv": "123",
    "cardHolderName": "Juan Perez"
  }
}
```

Para transferencia bancaria:

```json
{
  "orderId": "order456",
  "amount": 2500,
  "method": "bank_transfer",
  "paymentData": {
    "cbu": "2850590940090418135201",
    "alias": "JUAN.PEREZ",
    "bankName": "Banco Galicia"
  }
}
```

Para wallet:

```json
{
  "orderId": "order789",
  "amount": 1000,
  "method": "wallet"
}
```

**Response**

`201 CREATED`

```json
{
  "id": "payment123",
  "orderId": "order123",
  "userId": "user456",
  "amount": 1500,
  "currency": "ARS",
  "method": "credit_card",
  "status": "pending",
  "partialPayment": false,
  "paymentNumber": 1,
  "totalOrderAmount": 1500,
  "totalPaidSoFar": 1500,
  "remainingAmount": 0,
  "created": "2025-11-16T10:30:00.000Z",
  "message": "Transferencia en proceso de confirmación"
}
```

`400 BAD REQUEST`

```json
{
  "messages": [
    {
      "path": "cardNumber",
      "message": "Número de tarjeta inválido (algoritmo de Luhn)"
    }
  ]
}
```

`401 UNAUTHORIZED`
si el token no es válido

`404 NOT FOUND`
si la orden no existe en ordersgo

### Consultar pago por ID

`GET /api/payments/:id`

**Headers**

- Authorization: Bearer token (requerido)

**Response**

`200 OK`

```json
{
  "id": "payment123",
  "orderId": "order123",
  "userId": "user456",
  "amount": 1500,
  "currency": "ARS",
  "method": "credit_card",
  "status": "approved",
  "transactionId": "txn789",
  "partialPayment": false,
  "paymentNumber": 1,
  "created": "2025-11-16T10:30:00.000Z",
  "updated": "2025-11-16T10:31:00.000Z"
}
```

`404 NOT FOUND`
si el pago no existe

### Consultar pagos de una orden

`GET /api/payments/order/:orderId`

**Headers**

- Authorization: Bearer token (requerido)

**Response**

`200 OK`

```json
{
  "id": "payment123",
  "orderId": "order123",
  "amount": 1500,
  "method": "wallet",
  "status": "approved",
  "partialPayment": true,
  "paymentNumber": 1,
  "totalPaidSoFar": 1500,
  "remainingAmount": 500,
  "created": "2025-11-16T10:30:00.000Z"
}
```

### Consultar historial de pagos

`GET /api/payments/history`

**Headers**

- Authorization: Bearer token (requerido)

**Params query**

- limit: número (opcional, default: 10)
- offset: número (opcional, default: 0)

**Response**

`200 OK`

```json
{
  "payments": [
    {
      "id": "payment123",
      "orderId": "order123",
      "amount": 1500,
      "method": "credit_card",
      "status": "approved",
      "created": "2025-11-16T10:30:00.000Z"
    },
    {
      "id": "payment124",
      "orderId": "order124",
      "amount": 2000,
      "method": "wallet",
      "status": "rejected",
      "errorMessage": "Saldo insuficiente",
      "created": "2025-11-16T09:15:00.000Z"
    }
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
}
```

### Obtener método de pago preferido

`GET /api/payments/preferred`

**Headers**

- Authorization: Bearer token (requerido)

**Response**

`200 OK`

```json
{
  "method": "credit_card",
  "lastUsed": "2025-11-16T10:30:00.000Z",
  "successCount": 5
}
```

`200 OK` (sin método preferido)

```json
{
  "message": "No hay método de pago preferido"
}
```

### Aprobar pago manualmente

`PUT /api/payments/:id/approve`

**Headers**

- Authorization: Bearer token (requerido)

**Body** (opcional)

```json
{
  "transactionId": "BANK-12345"
}
```

**Response**

`200 OK`

```json
{
  "id": "payment123",
  "orderId": "order123",
  "status": "approved",
  "transactionId": "BANK-12345",
  "message": "Pago aprobado exitosamente"
}
```

`400 BAD REQUEST`

```json
{
  "messages": [
    {
      "path": "status",
      "message": "No se puede aprobar un pago en estado approved. Solo se pueden aprobar pagos PENDING."
    }
  ]
}
```

### Reembolsar pago

`POST /api/payments/:id/refund`

**Headers**

- Authorization: Bearer token (requerido)

**Body** (opcional)

```json
{
  "reason": "Orden cancelada por el usuario"
}
```

**Response**

`200 OK`

```json
{
  "id": "payment123",
  "orderId": "order123",
  "amount": 1500,
  "status": "refunded",
  "created": "2025-11-16T10:30:00.000Z",
  "updated": "2025-11-16T11:00:00.000Z"
}
```

### Depositar fondos en wallet

`POST /api/wallet/deposit`

**Headers**

- Authorization: Bearer token (requerido)

**Body**

```json
{
  "amount": 5000
}
```

**Response**

`200 OK`

```json
{
  "userId": "user456",
  "balance": 7500,
  "currency": "ARS"
}
```

### Consultar saldo de wallet

`GET /api/wallet/balance`

**Headers**

- Authorization: Bearer token (requerido)

**Response**

`200 OK`

```json
{
  "userId": "user456",
  "balance": 7500,
  "currency": "ARS"
}
```

### Reembolsar a wallet

`POST /api/wallet/refund`

**Headers**

- Authorization: Bearer token (requerido)

**Body**

```json
{
  "amount": 1500,
  "reason": "Reembolso por cancelación de orden"
}
```

**Response**

`200 OK`

```json
{
  "userId": "user456",
  "balance": 9000,
  "currency": "ARS"
}
```

## Interfaz asincrónica (RabbitMQ)

### Eventos publicados

#### Pago exitoso completo

Publica en topic exchange `payments_exchange` con routing key `payment.success`

**Body**

```json
{
  "paymentId": "payment123",
  "orderId": "order123",
  "userId": "user456",
  "amount": 1500,
  "currency": "ARS",
  "method": "credit_card",
  "transactionId": "txn789",
  "timestamp": "2025-11-16T10:30:00.000Z"
}
```

#### Pago parcial exitoso

Publica en topic exchange `payments_exchange` con routing key `payment.partial`

**Body**

```json
{
  "paymentId": "payment123",
  "orderId": "order123",
  "userId": "user456",
  "amount": 500,
  "currency": "ARS",
  "method": "wallet",
  "paymentNumber": 1,
  "totalPaidSoFar": 500,
  "totalOrderAmount": 1500,
  "remainingAmount": 1000,
  "timestamp": "2025-11-16T10:30:00.000Z"
}
```

#### Pago fallido

Publica en topic exchange `payments_exchange` con routing key `payment.failed`

**Body**

```json
{
  "paymentId": "payment124",
  "orderId": "order124",
  "userId": "user456",
  "amount": 2000,
  "currency": "ARS",
  "method": "credit_card",
  "reason": "Tarjeta rechazada",
  "errorCode": "INSUFFICIENT_FUNDS",
  "timestamp": "2025-11-16T10:35:00.000Z"
}
```

#### Pago reembolsado

Publica en topic exchange `payments_exchange` con routing key `payment.refunded`

**Body**

```json
{
  "paymentId": "payment123",
  "orderId": "order123",
  "userId": "user456",
  "amount": 1500,
  "currency": "ARS",
  "method": "wallet",
  "reason": "Orden cancelada",
  "timestamp": "2025-11-16T11:00:00.000Z"
}
```

### Eventos consumidos

#### Orden cancelada

Recibe de topic exchange `order_events` con routing key `order.canceled`

Cola: `payments_order_canceled`

**Body**

```json
{
  "orderId": "order123",
  "userId": "user456",
  "canceledAt": "2025-11-16T11:00:00.000Z",
  "reason": "Cancelada por el usuario"
}
```

**Procesamiento**:

- Busca todos los pagos APPROVED de la orden
- Reembolsa cada pago (automático para wallet, manual para tarjetas)
- Publica evento `payment.refunded` por cada reembolso

#### Usuario logout

Recibe de fanout exchange `auth`

Cola: `payments_logout`

**Body**

```json
{
  "type": "logout",
  "message": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Procesamiento**:

- Invalida el token del caché de seguridad
- Elimina la sesión del usuario
