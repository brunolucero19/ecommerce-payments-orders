# Testing - Microservicio de Pagos

## 📋 Resumen

Se ha implementado una estructura de testing básica para el microservicio de pagos usando **Jest** y **TypeScript**.

## 🧪 Tests Implementados

### 1. **Payment Enums and Constants** ✅

Archivo: `test/domain/payment/payment.test.ts`

Tests que validan las constantes del dominio:

- **PaymentStatus**: Verifica estados (PENDING, APPROVED, REJECTED, REFUNDED)
- **PaymentMethod**: Verifica métodos de pago (CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, WALLET)
- **PaymentErrorCode**: Verifica códigos de error (EXPIRED_CARD, INSUFFICIENT_FUNDS, etc.)

**Resultados**: ✅ 5/5 tests pasando

## 🚀 Ejecutar Tests

```bash
# Ejecutar todos los tests con cobertura
npm test

# Ejecutar tests sin cobertura
npm test -- --no-coverage

# Ejecutar tests en modo watch
npm test -- --watch

# Ejecutar tests específicos
npm test -- --testPathPattern="payment"
```

## 📊 Cobertura Actual

```
File                        | % Stmts | % Branch | % Funcs | % Lines
----------------------------|---------|----------|---------|--------
domain/payment/payment.ts   |   78.78 |    85.71 |      50 |   78.78
```

## 🎯 Casos de Uso Validados

### ✅ Implementado

1. **Enumeraciones y Constantes**
   - Estados de pago correctos
   - Métodos de pago disponibles
   - Códigos de error definidos

### 📝 Casos de Uso para Testing Manual

Dado que el servicio tiene dependencias externas (MongoDB, RabbitMQ, Auth Service, Orders Service), se recomienda testing manual para:

#### 1. **Pago Exitoso (CREDIT_CARD)**

```bash
POST /api/payments
{
  "orderId": "order123",
  "amount": 1500,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "paymentData": {
    "cardNumber": "4111111111111111",
    "cardHolder": "Juan Perez",
    "expirationMonth": "12",
    "expirationYear": "2025",
    "cvv": "123"
  }
}
```

**Validar**:

- ✓ Payment creado con status PENDING
- ✓ Evento `payment.success` publicado en RabbitMQ
- ✓ Order status actualizado a "paid" en ordersgo

#### 2. **Pago Parcial**

```bash
POST /api/payments
{
  "orderId": "order456",
  "amount": 500,
  "currency": "ARS",
  "method": "DEBIT_CARD",
  "partialPayment": true,
  "paymentData": {...}
}
```

**Validar**:

- ✓ Payment creado con paymentNumber=1
- ✓ Evento `payment.partial` publicado
- ✓ Order status = "partially_paid"
- ✓ Segundo pago marca order como "paid"

#### 3. **Pago Fallido**

```bash
POST /api/payments
{
  "orderId": "order789",
  "amount": 2000,
  "currency": "ARS",
  "method": "CREDIT_CARD",
  "paymentData": {
    "cardNumber": "4000000000000002", // Tarjeta inválida
    ...
  }
}
```

**Validar**:

- ✓ Payment creado y rechazado automáticamente
- ✓ Evento `payment.failed` publicado
- ✓ ErrorCode y errorMessage presentes
- ✓ Order status no cambia

#### 4. **Transferencia Bancaria con Confirmación Automática**

```bash
POST /api/payments
{
  "orderId": "order111",
  "amount": 3000,
  "currency": "ARS",
  "method": "BANK_TRANSFER",
  "paymentData": {
    "cbu": "0000003100010000000001",
    "holderName": "Maria Lopez"
  }
}
```

**Validar**:

- ✓ Payment creado con status PENDING
- ✓ Esperar 5 segundos
- ✓ Payment automáticamente aprobado (90% probabilidad)
- ✓ Evento `payment.success` publicado
- ✓ Order status actualizado

#### 5. **Orden Cancelada con Refund Automático**

```bash
# 1. Crear pago aprobado
POST /api/payments {...}

# 2. Cancelar orden en ordersgo
# (ordersgo publica order.canceled)
```

**Validar**:

- ✓ Consumer `orderCanceled` recibe evento
- ✓ Encuentra pagos aprobados para la orden
- ✓ Ejecuta refund con 3 reintentos
- ✓ Payment status cambia a REFUNDED
- ✓ Evento `payment.refunded` publicado
- ✓ Si método=WALLET, fondos devueltos automáticamente

#### 6. **Wallet**

**Depositar fondos:**

```bash
POST /api/wallet/deposit
{
  "amount": 5000
}
```

**Pagar con wallet:**

```bash
POST /api/payments
{
  "orderId": "order222",
  "amount": 2000,
  "currency": "ARS",
  "method": "WALLET"
}
```

**Validar**:

- ✓ Balance suficiente
- ✓ Monto deducido del wallet
- ✓ Payment aprobado
- ✓ Refund devuelve fondos al wallet

#### 7. **Método de Pago Preferido**

```bash
# 1. Realizar varios pagos exitosos con CREDIT_CARD

# 2. Consultar método preferido
GET /api/payments/preferred/:userId
```

**Validar**:

- ✓ Retorna CREDIT_CARD
- ✓ Se guarda en cada pago exitoso

#### 8. **Historial de Pagos con Paginación**

```bash
GET /api/payments/history?page=1&limit=10
```

**Validar**:

- ✓ Retorna pagos del usuario autenticado
- ✓ Paginación funciona correctamente
- ✓ Incluye todos los estados (approved, rejected, refunded)

#### 9. **Aprobación Manual de Transferencia**

```bash
PUT /api/payments/:paymentId/approve
{
  "transactionId": "manual_txn_123"
}
```

**Validar**:

- ✓ Solo funciona con payments PENDING
- ✓ Cambia status a APPROVED
- ✓ Publica evento `payment.success`

## 🔒 Autenticación en Tests Manuales

Todos los endpoints requieren header de autorización:

```bash
Authorization: Bearer <JWT_TOKEN>
```

Para obtener token:

```bash
POST http://localhost:3000/api/auth/login
{
  "username": "user@example.com",
  "password": "password"
}
```

## 🐛 Debug

Para ver logs detallados durante testing manual:

```bash
# Cambiar en .env
LOG_LEVEL=debug

# Restart service
npm start
```

## 📦 Dependencias de Testing

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "node-mocks-http": "^1.15.1",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2",
    "ts-jest": "^29.2.5"
  }
}
```

## 📝 Notas

### Limitaciones Actuales

- Los tests unitarios son básicos (solo enums/constantes)
- Tests de servicio requieren mocking complejo debido a Mongoose
- Tests de integración necesitan MongoDB y RabbitMQ corriendo

### Recomendaciones para Extender

1. **Tests de Integración**: Usar Docker con MongoDB y RabbitMQ de prueba
2. **Tests E2E**: Usar toda la stack (auth, orders, payments, rabbit)
3. **Tests de Contratos**: Validar eventos publicados/consumidos
4. **Tests de Carga**: Simular múltiples pagos concurrentes

## ✅ Conclusión

Se ha implementado:

- ✅ Configuración de Jest con TypeScript
- ✅ Tests básicos de dominio (enums y constantes)
- ✅ Estructura de directorios para tests
- ✅ Cobertura de código habilitada
- ✅ Documentación de casos de uso para testing manual

El testing manual es necesario para validar la integración completa con:

- MongoDB (persistencia)
- RabbitMQ (eventos)
- Auth Service (autenticación)
- Orders Service (validación de órdenes)
- ordersgo (consumers de eventos de pago)
