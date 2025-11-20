# Documentación de la API - Payments Microservice

API REST para gestión de pagos en e-commerce. Soporta múltiples métodos de pago (tarjetas, transferencias, billetera), pagos parciales y reembolsos automáticos.

## 📚 Documentación Interactiva

La documentación completa e interactiva con Swagger está disponible cuando el servidor está en ejecución:

**🔗 [http://localhost:3005/api-docs](http://localhost:3005/api-docs)**

Desde la interfaz de Swagger puedes:

- Ver todos los endpoints disponibles
- Probar las APIs directamente desde el navegador
- Ver ejemplos de request/response
- Consultar los schemas de datos

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Iniciar servidor
npm run serve
```

El servidor se ejecuta en el puerto **3005** por defecto.

## 🔐 Autenticación

Todos los endpoints de la API (excepto `/health`) requieren autenticación mediante **JWT Bearer Token**.

Debes incluir el header:

```
Authorization: Bearer <token>
```

El token se obtiene del servicio de autenticación (authgo) en el puerto 3000.

## 📋 Resumen de Endpoints

### Payments

| Método | Endpoint                       | Descripción                          |
| ------ | ------------------------------ | ------------------------------------ |
| POST   | `/api/payments`                | Crear un nuevo pago                  |
| GET    | `/api/payments/:id`            | Obtener pago por ID                  |
| GET    | `/api/payments/order/:orderId` | Obtener todos los pagos de una orden |
| GET    | `/api/payments/history`        | Historial de pagos del usuario       |
| GET    | `/api/payments/preferred`      | Método de pago preferido             |
| PUT    | `/api/payments/:id/approve`    | Aprobar pago manualmente             |
| POST   | `/api/payments/:id/refund`     | Reembolsar un pago                   |

### Wallet

| Método | Endpoint              | Descripción      |
| ------ | --------------------- | ---------------- |
| POST   | `/api/wallet/deposit` | Depositar dinero |
| GET    | `/api/wallet/balance` | Consultar saldo  |

### Health

| Método | Endpoint  | Descripción               |
| ------ | --------- | ------------------------- |
| GET    | `/health` | Health check del servicio |

## 💳 Métodos de Pago Soportados

- **CREDIT_CARD**: Tarjeta de crédito (validación Luhn)
- **DEBIT_CARD**: Tarjeta de débito (validación Luhn)
- **BANK_TRANSFER**: Transferencia bancaria (confirmación asíncrona, 5 segundos)
- **WALLET**: Billetera virtual (saldo interno)

## 📊 Estados de Pago

- **PENDING**: Pago creado, esperando confirmación
- **APPROVED**: Pago aprobado exitosamente
- **REJECTED**: Pago rechazado
- **REFUNDED**: Pago reembolsado

## 🔄 Eventos RabbitMQ

### Eventos Publicados

El microservicio publica eventos en el exchange `payments_exchange` (tipo topic):

#### `payment.success` (routing key: `payment.success`)

Publicado cuando un pago es aprobado y la orden está completamente pagada.

```json
{
  "paymentId": "507f1f77bcf86cd799439011",
  "orderId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439013",
  "amount": 25000.0,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "transactionId": "TXN-1731744000000-ABC123"
}
```

#### `payment.partial` (routing key: `payment.partial`)

Publicado cuando un pago es aprobado pero aún queda saldo por pagar.

```json
{
  "paymentId": "507f1f77bcf86cd799439011",
  "orderId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439013",
  "amount": 15000.0,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "transactionId": "TXN-1731744000000-ABC123",
  "paymentNumber": 1,
  "totalPaidSoFar": 15000.0,
  "totalOrderAmount": 25000.0,
  "remainingAmount": 10000.0
}
```

#### `payment.failed` (routing key: `payment.failed`)

Publicado cuando un pago es rechazado.

```json
{
  "paymentId": "507f1f77bcf86cd799439011",
  "orderId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439013",
  "amount": 25000.0,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "reason": "Tarjeta expirada",
  "errorCode": "EXPIRED_CARD"
}
```

#### `payment.refunded` (routing key: `payment.refunded`)

Publicado cuando un pago es reembolsado.

```json
{
  "paymentId": "507f1f77bcf86cd799439011",
  "orderId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439013",
  "amount": 25000.0,
  "currency": "ARS",
  "method": "WALLET",
  "reason": "Orden cancelada por el usuario"
}
```

### Eventos Consumidos

#### `user.logout` (exchange: `auth`, tipo: fanout)

Consumido del exchange `auth` para invalidar tokens en el cache cuando un usuario cierra sesión.

#### `order.canceled` (exchange: `order_events`, routing key: `order.canceled`)

Consumido del exchange `order_events` para procesar reembolsos automáticos cuando una orden es cancelada.

```json
{
  "orderId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439013",
  "reason": "Cancelado por el usuario"
}
```

**Comportamiento:**

- Busca todos los pagos APPROVED de la orden
- Para cada pago WALLET: acredita automáticamente en la billetera
- Para cada pago con TARJETA: marca como REFUNDED (requiere procesamiento manual)
- Reintentos: 3 intentos con backoff exponencial (1s, 2s, 4s)
- Publica evento `payment.refunded` por cada reembolso exitoso

## 🧪 Ejemplos de Uso

### Crear Pago con Tarjeta

```bash
curl -X POST http://localhost:3005/api/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "507f1f77bcf86cd799439012",
    "amount": 15000.50,
    "method": "CREDIT_CARD",
    "paymentData": {
      "cardNumber": "4532015112830366",
      "cardHolder": "JUAN PEREZ",
      "expiryDate": "12/26",
      "cvv": "123"
    }
  }'
```

### Crear Pago con Billetera

```bash
curl -X POST http://localhost:3005/api/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "507f1f77bcf86cd799439012",
    "amount": 10000.00,
    "method": "WALLET",
    "paymentData": {}
  }'
```

### Consultar Saldo de Billetera

```bash
curl -X GET http://localhost:3005/api/wallet/balance \
  -H "Authorization: Bearer <token>"
```

### Depositar en Billetera

```bash
curl -X POST http://localhost:3005/api/wallet/deposit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000.00
  }'
```

### Aprobar Pago Manualmente

```bash
curl -X PUT http://localhost:3005/api/payments/507f1f77bcf86cd799439011/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "MANUAL-TXN-123"
  }'
```

## 🛠️ Códigos de Error

| Código             | Descripción                |
| ------------------ | -------------------------- |
| EXPIRED_CARD       | Tarjeta expirada           |
| INSUFFICIENT_FUNDS | Fondos insuficientes       |
| INVALID_NUMBER     | Número de tarjeta inválido |
| INVALID_CVV        | CVV inválido               |
| PROCESSING_ERROR   | Error de procesamiento     |
| INVALID_CBU        | CBU inválido               |
| BANK_REJECTED      | Rechazado por el banco     |
| TIMEOUT            | Timeout en la operación    |
| VALIDATION_ERROR   | Error de validación        |

## 📦 Pagos Parciales

El sistema soporta **múltiples pagos por orden**. Características:

- Cada pago tiene un `paymentNumber` secuencial (1, 2, 3...)
- El campo `partialPayment` indica si aún queda saldo por pagar
- El campo `totalPaidSoFar` acumula el total pagado hasta el momento
- El campo `remainingAmount` muestra el saldo pendiente
- Se publica `payment.partial` si queda saldo, o `payment.success` si se completa la orden

**Ejemplo:**

1. Orden de $25.000
2. Primer pago: $15.000 → `payment.partial` (queda $10.000)
3. Segundo pago: $10.000 → `payment.success` (orden completa)

## 🔧 Variables de Entorno

Ver archivo `.env.example` para la lista completa de variables requeridas.

Variables principales:

- `SERVER_PORT`: Puerto del servidor (default: 3005)
- `MONGO_URL`: URL de conexión a MongoDB
- `RABBIT_URL`: URL de conexión a RabbitMQ
- `JWT_SECRET`: Secret para validación de tokens
- `AUTH_SERVICE_URL`: URL del servicio de autenticación (authgo)
- `ORDERS_SERVICE_URL`: URL del servicio de órdenes (ordersgo)

## 📄 Más Información

Para documentación completa del negocio y casos de uso, consultar: `DOCUMENTACION.md`
