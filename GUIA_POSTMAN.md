# 📮 Guía Completa de Pruebas con Postman

Guía paso a paso para probar **TODOS** los casos de uso del sistema e-commerce completo usando Postman.

---

## 📋 Índice

1. [Variables de Entorno Postman](#1-variables-de-entorno-postman)
2. [Autenticación](#2-autenticación)
3. [Catálogo de Productos](#3-catálogo-de-productos)
4. [Carrito de Compras](#4-carrito-de-compras)
5. [Órdenes](#5-órdenes)
6. [Pagos - Todos los Casos de Uso](#6-pagos---todos-los-casos-de-uso)
7. [Billetera Virtual](#7-billetera-virtual)
8. [Verificación de Estados](#8-verificación-de-estados)

---

## 1. Variables de Entorno Postman

Crea estas variables en Postman (botón "Environments"):

```
AUTH_URL = http://localhost:3000
CATALOG_URL = http://localhost:3002
CART_URL = http://localhost:3003
ORDERS_URL = http://localhost:3004
PAYMENTS_URL = http://localhost:3005

TOKEN = (se llenará automáticamente al hacer login)
USER_ID = (se llenará automáticamente al hacer login)
ARTICLE_ID = (se llenará después de crear un artículo)
ORDER_ID = (se llenará después de hacer checkout)
PAYMENT_ID = (se llenará después de crear un pago)
```

---

## 2. Autenticación

### 2.1. Registrar Usuario

**POST** `{{AUTH_URL}}/v1/users`

Body (JSON):

```json
{
  "name": "Juan Perez",
  "login": "juan.perez",
  "password": "password123"
}
```

**Respuesta esperada:**

```json
{
  "id": "673aef1c36f6db049d192788",
  "name": "Juan Perez",
  "login": "juan.perez"
}
```

### 2.2. Iniciar Sesión

**POST** `{{AUTH_URL}}/v1/users/signin`

Body (JSON):

```json
{
  "login": "juan.perez",
  "password": "password123"
}
```

**Respuesta esperada:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "673aef1c36f6db049d192788",
    "name": "Juan Perez",
    "login": "juan.perez"
  }
}
```

**🔧 Script Post-response (Tests tab):**

```javascript
if (pm.response.code === 200) {
  const response = pm.response.json()
  pm.environment.set('TOKEN', response.token)
  pm.environment.set('USER_ID', response.user.id)
  console.log('Token guardado:', response.token)
}
```

### 2.3. Obtener Perfil

**GET** `{{AUTH_URL}}/v1/users/current`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

---

## 3. Catálogo de Productos

### 3.1. Crear Artículo

**POST** `{{CATALOG_URL}}/v1/articles`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "name": "Notebook Lenovo ThinkPad",
  "description": "Notebook empresarial de alta gama",
  "image": "https://ejemplo.com/notebook.jpg",
  "price": 850000,
  "stock": 10
}
```

**🔧 Script Post-response:**

```javascript
if (pm.response.code === 200) {
  const response = pm.response.json()
  pm.environment.set('ARTICLE_ID', response.id)
  console.log('Article ID guardado:', response.id)
}
```

### 3.2. Listar Todos los Artículos

**GET** `{{CATALOG_URL}}/v1/articles`

### 3.3. Buscar Artículo por ID

**GET** `{{CATALOG_URL}}/v1/articles/{{ARTICLE_ID}}`

### 3.4. Actualizar Artículo

**POST** `{{CATALOG_URL}}/v1/articles/{{ARTICLE_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "name": "Notebook Lenovo ThinkPad X1",
  "description": "Notebook empresarial actualizada",
  "image": "https://ejemplo.com/notebook-x1.jpg",
  "price": 900000,
  "stock": 8
}
```

### 3.5. Deshabilitar Artículo

**DELETE** `{{CATALOG_URL}}/v1/articles/{{ARTICLE_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

---

## 4. Carrito de Compras

### 4.1. Ver Carrito Actual

**GET** `{{CART_URL}}/v1/cart`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

### 4.2. Agregar Artículo al Carrito

**POST** `{{CART_URL}}/v1/cart/{{ARTICLE_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "quantity": 2
}
```

### 4.3. Incrementar Cantidad

**POST** `{{CART_URL}}/v1/cart/{{ARTICLE_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "quantity": 1
}
```

### 4.4. Decrementar Cantidad (cantidad negativa)

**POST** `{{CART_URL}}/v1/cart/{{ARTICLE_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "quantity": -1
}
```

### 4.5. Eliminar Artículo del Carrito

**DELETE** `{{CART_URL}}/v1/cart/{{ARTICLE_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

### 4.6. Hacer Checkout (Crear Orden)

**POST** `{{CART_URL}}/v1/cart/checkout`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

**✅ Esto crea la orden automáticamente**

---

## 5. Órdenes

### 5.1. Listar Mis Órdenes

**GET** `{{ORDERS_URL}}/v1/orders`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

**Respuesta esperada:**

```json
[
  {
    "id": "673af59c36f6db049d19278a",
    "cartId": "673af58c36f6db049d192789",
    "status": "PLACED",
    "created": "2024-11-18T15:30:00Z",
    "updated": "2024-11-18T15:30:00Z",
    "articles": 2,
    "totalPrice": 1700000,
    "totalPayment": 0
  }
]
```

**🔧 Script Post-response:**

```javascript
if (pm.response.code === 200) {
  const orders = pm.response.json()
  if (orders.length > 0) {
    pm.environment.set('ORDER_ID', orders[0].id)
    console.log('Order ID guardado:', orders[0].id)
  }
}
```

### 5.2. Ver Detalle de Orden

**GET** `{{ORDERS_URL}}/v1/orders/{{ORDER_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

**Respuesta esperada:**

```json
{
  "id": "673af59c36f6db049d19278a",
  "orderId": "673af59c36f6db049d19278a",
  "cartId": "673af58c36f6db049d192789",
  "userId": "673aef1c36f6db049d192788",
  "status": "PLACED",
  "created": "2024-11-18T15:30:00Z",
  "updated": "2024-11-18T15:30:00Z",
  "articles": [
    {
      "articleId": "673af50c36f6db049d192786",
      "quantity": 2,
      "unitaryPrice": 850000,
      "isValidated": true,
      "isValid": true
    }
  ],
  "payments": []
}
```

**📊 Estados de Orden:**

- `PLACED`: Orden creada, esperando validación de artículos
- `VALIDATED`: Artículos validados, listo para pagar
- `PAYMENT_DEFINED`: Pago procesado (parcial o completo)
- `PAID`: Orden completamente pagada

---

## 6. Pagos - Todos los Casos de Uso

### 6.1. Caso 1: Pago Completo con Tarjeta de Crédito ✅

Pago único que cubre el total de la orden.

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 1700000,
  "method": "CREDIT_CARD",
  "paymentData": {
    "cardNumber": "4532015112830366",
    "cardHolder": "JUAN PEREZ",
    "expiryDate": "12/26",
    "cvv": "123"
  }
}
```

**Respuesta esperada:**

```json
{
  "_id": "673af6ac36f6db049d19278b",
  "orderId": "673af59c36f6db049d19278a",
  "userId": "673aef1c36f6db049d192788",
  "amount": 1700000,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "status": "APPROVED",
  "transactionId": "TXN-1731944108123-ABC123",
  "partialPayment": false,
  "paymentNumber": 1,
  "totalPaidSoFar": 1700000,
  "remainingAmount": 0,
  "createdAt": "2024-11-18T15:35:08.123Z"
}
```

**🔧 Script Post-response:**

```javascript
if (pm.response.code === 201) {
  const payment = pm.response.json()
  pm.environment.set('PAYMENT_ID', payment._id)
  console.log('Payment ID guardado:', payment._id)
}
```

**✅ Verificar:**

- Estado del pago: `APPROVED`
- `partialPayment`: false
- `remainingAmount`: 0
- Orden cambia a estado `PAID`

---

### 6.2. Caso 2: Pago Completo con Tarjeta de Débito ✅

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 1700000,
  "method": "DEBIT_CARD",
  "paymentData": {
    "cardNumber": "5425233430109903",
    "cardHolder": "MARIA GONZALEZ",
    "expiryDate": "08/27",
    "cvv": "456"
  }
}
```

---

### 6.3. Caso 3: Pago con Transferencia Bancaria ✅

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 1700000,
  "method": "BANK_TRANSFER",
  "paymentData": {
    "cbu": "0170099520000001234567",
    "accountHolder": "JUAN PEREZ"
  }
}
```

**⏱️ Nota:** La transferencia tarda 5 segundos en procesarse (simulado).

---

### 6.4. Caso 4: Pago con Billetera ✅

Primero deposita dinero en la billetera:

**POST** `{{PAYMENTS_URL}}/api/wallet/deposit`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "amount": 2000000
}
```

Luego paga con la billetera:

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 1700000,
  "method": "WALLET",
  "paymentData": {}
}
```

---

### 6.5. Caso 5: Pago Parcial (Primera Parte) 💰

Pagar solo una parte del total de la orden.

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 1000000,
  "method": "CREDIT_CARD",
  "paymentData": {
    "cardNumber": "4532015112830366",
    "cardHolder": "JUAN PEREZ",
    "expiryDate": "12/26",
    "cvv": "123"
  }
}
```

**Respuesta esperada:**

```json
{
  "_id": "673af7bc36f6db049d19278c",
  "orderId": "673af59c36f6db049d19278a",
  "userId": "673aef1c36f6db049d192788",
  "amount": 1000000,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "status": "APPROVED",
  "transactionId": "TXN-1731944380123-DEF456",
  "partialPayment": true,
  "paymentNumber": 1,
  "totalPaidSoFar": 1000000,
  "remainingAmount": 700000,
  "createdAt": "2024-11-18T15:39:40.123Z"
}
```

**✅ Verificar:**

- `partialPayment`: true
- `remainingAmount`: 700000
- `paymentNumber`: 1
- Orden está en estado `PAYMENT_DEFINED` (no `PAID`)

---

### 6.6. Caso 6: Pago Parcial (Segunda Parte - Completar) 💰

Completar el pago de la orden.

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 700000,
  "method": "DEBIT_CARD",
  "paymentData": {
    "cardNumber": "5425233430109903",
    "cardHolder": "JUAN PEREZ",
    "expiryDate": "08/27",
    "cvv": "456"
  }
}
```

**Respuesta esperada:**

```json
{
  "_id": "673af8dc36f6db049d19278d",
  "orderId": "673af59c36f6db049d19278a",
  "userId": "673aef1c36f6db049d192788",
  "amount": 700000,
  "currency": "ARS",
  "method": "DEBIT_CARD",
  "status": "APPROVED",
  "transactionId": "TXN-1731944668123-GHI789",
  "partialPayment": false,
  "paymentNumber": 2,
  "totalPaidSoFar": 1700000,
  "remainingAmount": 0,
  "createdAt": "2024-11-18T15:44:28.123Z"
}
```

**✅ Verificar:**

- `partialPayment`: false
- `remainingAmount`: 0
- `paymentNumber`: 2
- Orden cambia a estado `PAID`

---

### 6.7. Caso 7: Pago Rechazado (Tarjeta Expirada) ❌

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 1700000,
  "method": "CREDIT_CARD",
  "paymentData": {
    "cardNumber": "4532015112830366",
    "cardHolder": "JUAN PEREZ",
    "expiryDate": "12/20",
    "cvv": "123"
  }
}
```

**Respuesta esperada:**

```json
{
  "_id": "673af9fc36f6db049d19278e",
  "orderId": "673af59c36f6db049d19278a",
  "userId": "673aef1c36f6db049d192788",
  "amount": 1700000,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "status": "REJECTED",
  "errorCode": "EXPIRED_CARD",
  "errorMessage": "La tarjeta ha expirado",
  "createdAt": "2024-11-18T15:49:00.123Z"
}
```

**✅ Verificar:**

- `status`: REJECTED
- `errorCode`: EXPIRED_CARD
- Orden sigue en estado anterior (no cambia)

---

### 6.8. Caso 8: Pago Rechazado (Fondos Insuficientes en Billetera) ❌

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 9999999,
  "method": "WALLET",
  "paymentData": {}
}
```

**Respuesta esperada:**

```json
{
  "_id": "673afa1c36f6db049d19278f",
  "orderId": "673af59c36f6db049d19278a",
  "userId": "673aef1c36f6db049d192788",
  "amount": 9999999,
  "currency": "ARS",
  "method": "WALLET",
  "status": "REJECTED",
  "errorCode": "INSUFFICIENT_FUNDS",
  "errorMessage": "Saldo insuficiente en billetera",
  "createdAt": "2024-11-18T15:50:00.123Z"
}
```

---

### 6.9. Caso 9: Pago Rechazado (Número de Tarjeta Inválido) ❌

**POST** `{{PAYMENTS_URL}}/api/payments`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "orderId": "{{ORDER_ID}}",
  "amount": 1700000,
  "method": "CREDIT_CARD",
  "paymentData": {
    "cardNumber": "1234567890123456",
    "cardHolder": "JUAN PEREZ",
    "expiryDate": "12/26",
    "cvv": "123"
  }
}
```

**Respuesta esperada:**

```json
{
  "error": "Número de tarjeta inválido"
}
```

---

### 6.10. Caso 10: Reembolso de Pago 💸

**POST** `{{PAYMENTS_URL}}/api/payments/{{PAYMENT_ID}}/refund`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "reason": "Cliente solicitó cancelación"
}
```

**Respuesta esperada:**

```json
{
  "_id": "673af6ac36f6db049d19278b",
  "orderId": "673af59c36f6db049d19278a",
  "userId": "673aef1c36f6db049d192788",
  "amount": 1700000,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "status": "REFUNDED",
  "transactionId": "TXN-1731944108123-ABC123",
  "refundedAt": "2024-11-18T16:00:00.123Z",
  "refundReason": "Cliente solicitó cancelación"
}
```

**✅ Verificar:**

- `status`: REFUNDED
- Si era pago con WALLET: el dinero se acredita automáticamente

---

## 7. Billetera Virtual

### 7.1. Consultar Saldo

**GET** `{{PAYMENTS_URL}}/api/wallet/balance`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

**Respuesta esperada:**

```json
{
  "userId": "673aef1c36f6db049d192788",
  "balance": 300000,
  "currency": "ARS"
}
```

### 7.2. Depositar Dinero

**POST** `{{PAYMENTS_URL}}/api/wallet/deposit`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

Body (JSON):

```json
{
  "amount": 500000
}
```

**Respuesta esperada:**

```json
{
  "userId": "673aef1c36f6db049d192788",
  "balance": 800000,
  "currency": "ARS",
  "message": "Depósito exitoso"
}
```

### 7.3. Ver Historial de Transacciones de Billetera

**GET** `{{PAYMENTS_URL}}/api/wallet/transactions`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

---

## 8. Verificación de Estados

### 8.1. Ver Historial de Pagos del Usuario

**GET** `{{PAYMENTS_URL}}/api/payments/history`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

**Respuesta esperada:**

```json
[
  {
    "_id": "673af6ac36f6db049d19278b",
    "orderId": "673af59c36f6db049d19278a",
    "amount": 1700000,
    "method": "CREDIT_CARD",
    "status": "APPROVED",
    "createdAt": "2024-11-18T15:35:08.123Z"
  },
  {
    "_id": "673af7bc36f6db049d19278c",
    "orderId": "673af59c36f6db049d19278a",
    "amount": 1000000,
    "method": "CREDIT_CARD",
    "status": "APPROVED",
    "createdAt": "2024-11-18T15:39:40.123Z"
  }
]
```

### 8.2. Ver Pagos de una Orden Específica

**GET** `{{PAYMENTS_URL}}/api/payments/order/{{ORDER_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

### 8.3. Ver Detalle de un Pago

**GET** `{{PAYMENTS_URL}}/api/payments/{{PAYMENT_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

### 8.4. Ver Método de Pago Preferido

**GET** `{{PAYMENTS_URL}}/api/payments/preferred`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

**Respuesta esperada:**

```json
{
  "method": "CREDIT_CARD",
  "usageCount": 5,
  "lastUsed": "2024-11-18T15:35:08.123Z"
}
```

### 8.5. Verificar Estado de Orden con Pagos

**GET** `{{ORDERS_URL}}/v1/orders/{{ORDER_ID}}`

Headers:

```
Authorization: Bearer {{TOKEN}}
```

**Respuesta esperada:**

```json
{
  "id": "673af59c36f6db049d19278a",
  "orderId": "673af59c36f6db049d19278a",
  "cartId": "673af58c36f6db049d192789",
  "userId": "673aef1c36f6db049d192788",
  "status": "PAID",
  "created": "2024-11-18T15:30:00Z",
  "updated": "2024-11-18T15:44:28Z",
  "articles": [
    {
      "articleId": "673af50c36f6db049d192786",
      "quantity": 2,
      "unitaryPrice": 850000,
      "isValidated": true,
      "isValid": true
    }
  ],
  "payments": [
    {
      "amount": 1000000,
      "method": "CREDIT_CARD"
    },
    {
      "amount": 700000,
      "method": "DEBIT_CARD"
    }
  ]
}
```

---

## 🎯 Flujo Completo Recomendado

### Flujo 1: Compra Exitosa con Pago Completo

1. ✅ Registrar usuario (2.1)
2. ✅ Iniciar sesión (2.2)
3. ✅ Crear artículo en catálogo (3.1)
4. ✅ Agregar artículo al carrito (4.2)
5. ✅ Ver carrito (4.1)
6. ✅ Hacer checkout (4.6) → **Crea la orden**
7. ✅ Listar órdenes y guardar ORDER_ID (5.1)
8. ✅ Ver detalle de orden (5.2) → Estado: `VALIDATED`
9. ✅ Pagar orden completa con tarjeta (6.1)
10. ✅ Verificar orden (5.2) → Estado: `PAID`

### Flujo 2: Compra con Pagos Parciales

1-8. (Mismo que Flujo 1) 9. ✅ Pagar primera parte (6.5) → `partialPayment: true` 10. ✅ Ver detalle de orden (5.2) → Estado: `PAYMENT_DEFINED` 11. ✅ Pagar segunda parte (6.6) → `partialPayment: false` 12. ✅ Verificar orden (5.2) → Estado: `PAID`

### Flujo 3: Pago con Billetera

1-8. (Mismo que Flujo 1) 9. ✅ Depositar dinero en billetera (7.2) 10. ✅ Consultar saldo (7.1) 11. ✅ Pagar con billetera (6.4) 12. ✅ Verificar orden (5.2) → Estado: `PAID`

### Flujo 4: Pago Rechazado y Reintento

1-8. (Mismo que Flujo 1) 9. ✅ Intentar pago con tarjeta expirada (6.7) → `REJECTED` 10. ✅ Ver detalle de orden (5.2) → Estado sigue en `VALIDATED` 11. ✅ Reintentar con tarjeta válida (6.1) → `APPROVED` 12. ✅ Verificar orden (5.2) → Estado: `PAID`

### Flujo 5: Reembolso

1-10. (Mismo que Flujo 1, pero con pago WALLET) 11. ✅ Solicitar reembolso (6.10) 12. ✅ Verificar saldo de billetera (7.1) → Dinero devuelto 13. ✅ Ver historial de pagos (8.1) → Estado: `REFUNDED`

---

## 📊 Estados y Transiciones

### Estados de Orden

```
PLACED → VALIDATED → PAYMENT_DEFINED → PAID
         ↓
      INVALID (si artículos no disponibles)
```

### Estados de Pago

```
PENDING → APPROVED
       → REJECTED

APPROVED → REFUNDED
```

---

## 🧪 Validaciones Importantes

### Tarjetas de Crédito/Débito

- ✅ Número debe pasar validación Luhn
- ✅ Fecha de expiración debe ser futura
- ✅ CVV debe tener 3 o 4 dígitos
- ✅ Titular no puede estar vacío

### Transferencia Bancaria

- ✅ CBU debe tener 22 dígitos
- ✅ Tarda 5 segundos (simulado)

### Billetera

- ✅ Saldo debe ser suficiente
- ✅ Depósito mínimo: $100
- ✅ Reembolsos se acreditan instantáneamente

### Pagos Parciales

- ✅ Monto debe ser menor al `remainingAmount`
- ✅ Monto debe ser mayor a 0
- ✅ Se pueden hacer múltiples pagos hasta cubrir el total

---

## 🔍 Troubleshooting

### Problema: Token expirado

**Solución:** Volver a hacer login (2.2)

### Problema: Orden no se crea al hacer checkout

**Solución:**

1. Verificar que hay artículos en el carrito (4.1)
2. Verificar logs de RabbitMQ
3. Verificar que ordersgo esté corriendo

### Problema: Pago rechazado sin motivo claro

**Solución:** Ver logs de payments_node con `docker logs payments_node`

### Problema: Estado de orden no se actualiza después del pago

**Solución:**

1. Verificar que RabbitMQ esté corriendo
2. Verificar conexión entre payments_node y ordersgo
3. Ver logs de ambos servicios

---

## 📝 Notas Finales

- **Todos los endpoints** (excepto /health) requieren el header `Authorization: Bearer {{TOKEN}}`
- **Usar Postman Environment** para manejar variables automáticamente
- **Los scripts Post-response** automatizan guardar IDs importantes
- **Consultar Swagger** en `http://localhost:3005/api-docs` para más detalles
- **Monitorear logs** con `docker logs -f <container_name>` durante las pruebas

---

**¡Listo para probar! 🚀**

Sigue los flujos recomendados y verifica cada paso. Todos los casos de uso están cubiertos.
