# 🧪 Guía Completa de Pruebas - Pagos y Órdenes

Esta guía te permite probar **todos los casos de uso** del sistema de pagos y órdenes paso a paso.

---

## 📋 Prerequisitos

- Docker instalado y corriendo
- Postman, curl o cualquier cliente HTTP
- Puertos libres: 3000, 3001, 3002, 3004, 3005, 5672, 15672, 27017, 27018

---

## 🚀 Paso 1: Levantar Toda la Infraestructura

### 1.1. Levantar MongoDB y RabbitMQ

```cmd
REM MongoDB para Orders
docker run -d --name mongo_orders -p 27017:27017 mongo:6.0

REM MongoDB para Payments
docker run -d --name mongo_payments -p 27018:27018 mongo:8.2

REM RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

**Verificar:**

```cmd
docker ps
```

Deberías ver 3 contenedores corriendo.

### 1.2. Levantar Microservicios (Con Docker - Sin Go)

```cmd
REM Ir a la carpeta raíz de tus microservicios, por ejemplo:
cd "C:\Users\bruno\Documentos\UTN\4° Año\Arquitectura de Microservicios\e-commerce"

REM Auth Service
cd authgo
docker build -t authgo .
docker run -d --name authgo -p 3000:3000 authgo

REM Catalog Service
cd ..\cataloggo
docker build -t cataloggo .
docker run -d --name cataloggo -p 3002:3002 cataloggo

REM Cart Service
cd ..\cartgo
docker build -t cartgo .
docker run -d --name cartgo -p 3003:3003 cartgo

REM Orders Service (IMPORTANTE: usar Dockerfile.local con código actualizado)
cd "ecommerce-payments-orders\ordersgo"
docker build -f Dockerfile.local -t ordersgo .
docker run -d --name ordersgo -p 3004:3004 ^
  -e MONGO_URL=mongodb://host.docker.internal:27017 ^
  -e RABBIT_URL=amqp://host.docker.internal ^
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 ^
  ordersgo

REM Payments Service
cd ..\payments_node
docker build -t payments_node .
docker run -d --name payments_node -p 3005:3005 ^
  -e MONGO_URL=mongodb://host.docker.internal:27018 ^
  -e RABBIT_URL=amqp://host.docker.internal ^
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 ^
  -e ORDERS_SERVICE_URL=http://host.docker.internal:3004 ^
  payments_node
```

### 1.3. Verificar que Todo Esté Corriendo

```cmd
REM Ver todos los contenedores
docker ps

REM Deberías ver 8 contenedores:
REM - rabbitmq
REM - mongo_orders
REM - mongo_payments
REM - authgo
REM - cataloggo
REM - cartgo
REM - ordersgo
REM - payments_node
```

**Health checks:**

```cmd
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3004/health
curl http://localhost:3005/health
```

Todos deberían responder 200 OK.

---

## 📊 Paso 2: Ver Logs en Tiempo Real

### Opción 1: Logs Individuales

```cmd
REM Ver logs de ordersgo
docker logs -f ordersgo

REM Ver logs de payments
docker logs -f payments_node

REM Ver logs de RabbitMQ
docker logs -f rabbitmq
```

Presiona `Ctrl+C` para salir.

### Opción 2: Logs de Todos los Servicios (PowerShell)

```powershell
# En una ventana PowerShell
docker-compose -f payments_node/docker-compose.yml logs -f
```

### Opción 3: RabbitMQ Management UI

Abre en el navegador: **http://localhost:15672**

- Usuario: `guest`
- Password: `guest`

Aquí puedes ver:

- **Queues**: Colas de mensajes y consumers conectados
- **Exchanges**: exchanges configurados
- **Connections**: Servicios conectados

---

## 🧪 Caso de Uso 1: Pago Completo Exitoso

### 1. Login (Obtener Token JWT)

```cmd
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"password\":\"testpass\"}"
```

**Respuesta esperada:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "123"
}
```

**Guardar el token:**

```cmd
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Crear una Orden

```cmd
curl -X POST http://localhost:3004/api/orders ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"user123\",\"articles\":[{\"articleId\":\"art1\",\"quantity\":2,\"unitPrice\":500}],\"totalPrice\":1000}"
```

**Respuesta esperada:**

```json
{
  "id": "674abc123...",
  "userId": "user123",
  "status": "placed",
  "totalPrice": 1000
}
```

**Guardar el orderId:**

```cmd
set ORDER_ID=674abc123...
```

### 3. Crear Pago (Tarjeta de Crédito)

```cmd
curl -X POST http://localhost:3005/api/payments ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"amount\":1000,\"method\":\"credit_card\",\"cardData\":{\"number\":\"4111111111111111\",\"holder\":\"John Doe\",\"expiry\":\"12/25\",\"cvv\":\"123\"}}"
```

**Respuesta esperada:**

```json
{
  "id": "pay123...",
  "orderId": "674abc123...",
  "status": "APPROVED",
  "transactionId": "txn_...",
  "amount": 1000,
  "method": "credit_card"
}
```

### 4. Verificar Estado de la Orden

```cmd
curl http://localhost:3004/api/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %TOKEN%"
```

**Respuesta esperada:**

```json
{
  "id": "674abc123...",
  "status": "paid",  ← DEBE SER "paid"
  "totalPrice": 1000,
  "payments": [
    {
      "paymentId": "pay123...",
      "status": "approved",
      "amount": 1000
    }
  ]
}
```

### 5. Ver Logs de la Integración

```cmd
REM En ventana 1: Ver cómo payments_node publica el evento
docker logs -f payments-node

REM En ventana 2: Ver cómo ordersgo consume el evento
docker logs -f ordersgo

REM Busca líneas como:
REM [payments] Published event: payment.success
REM [ordersgo] Consumed event: payment.success
REM [ordersgo] Order status updated: paid
```

### 6. Ver en RabbitMQ

1. Ir a http://localhost:15672
2. Click en **Queues**
3. Buscar la cola `payments_queue` o similar
4. Ver que el mensaje fue procesado (Ready: 0, Unacked: 0)

---

## 🧪 Caso de Uso 2: Pago Parcial (2 Pagos)

### 1. Crear Orden ($1000)

```cmd
curl -X POST http://localhost:3004/api/orders ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"user123\",\"articles\":[{\"articleId\":\"art2\",\"quantity\":1,\"unitPrice\":1000}],\"totalPrice\":1000}"
```

Guardar `ORDER_ID`.

### 2. Primer Pago Parcial ($400)

```cmd
curl -X POST http://localhost:3005/api/payments ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"amount\":400,\"paymentNumber\":1,\"method\":\"credit_card\",\"cardData\":{\"number\":\"4111111111111111\",\"holder\":\"Jane Doe\",\"expiry\":\"12/25\",\"cvv\":\"123\"}}"
```

### 3. Verificar Estado (Parcialmente Pagado)

```cmd
curl http://localhost:3004/api/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado esperado:**

```json
{
  "status": "partially_paid",  ← Estado parcial
  "totalPrice": 1000,
  "totalPaid": 400
}
```

### 4. Segundo Pago ($600)

```cmd
curl -X POST http://localhost:3005/api/payments ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"amount\":600,\"paymentNumber\":2,\"method\":\"credit_card\",\"cardData\":{\"number\":\"4111111111111111\",\"holder\":\"Jane Doe\",\"expiry\":\"12/25\",\"cvv\":\"123\"}}"
```

### 5. Verificar Estado Final (Completamente Pagado)

```cmd
curl http://localhost:3004/api/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado esperado:**

```json
{
  "status": "paid",  ← Ahora está completamente pagado
  "totalPrice": 1000,
  "totalPaid": 1000,
  "payments": [
    { "amount": 400, "status": "approved" },
    { "amount": 600, "status": "approved" }
  ]
}
```

---

## 🧪 Caso de Uso 3: Refund Automático (Orden Cancelada)

### 1. Crear Orden y Pagar

```cmd
REM Crear orden
curl -X POST http://localhost:3004/api/orders ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"user123\",\"articles\":[{\"articleId\":\"art3\",\"quantity\":1,\"unitPrice\":500}],\"totalPrice\":500}"

REM Guardar ORDER_ID

REM Pagar
curl -X POST http://localhost:3005/api/payments ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"amount\":500,\"method\":\"credit_card\",\"cardData\":{\"number\":\"4111111111111111\",\"holder\":\"Test User\",\"expiry\":\"12/25\",\"cvv\":\"123\"}}"

REM Verificar que esté pagado
curl http://localhost:3004/api/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %TOKEN%"
```

### 2. Cancelar la Orden

```cmd
curl -X DELETE http://localhost:3004/api/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %TOKEN%"
```

### 3. Ver Logs del Refund Automático

```cmd
docker logs -f payments-node
```

**Buscar líneas como:**

```
[Consumer] Received order.canceled event for order: 674abc...
[RefundService] Found 1 approved payments for order
[RefundService] Attempting refund for payment: pay123... (attempt 1/3)
[RefundService] Refund successful for payment: pay123...
[Publisher] Published event: payment.refunded
```

### 4. Verificar Estado del Pago

```cmd
curl http://localhost:3005/api/payments/%PAYMENT_ID% ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado esperado:**

```json
{
  "id": "pay123...",
  "status": "REFUNDED",  ← Estado cambiado a REFUNDED
  "amount": 500
}
```

### 5. Verificar Orden

```cmd
curl http://localhost:3004/api/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %TOKEN%"
```

Estado debería volver a `payment_defined` si todos los pagos fueron reembolsados.

---

## 🧪 Caso de Uso 4: Transferencia Bancaria (PENDING → APPROVED)

### 1. Crear Orden

```cmd
curl -X POST http://localhost:3004/api/orders ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"user123\",\"articles\":[{\"articleId\":\"art4\",\"quantity\":1,\"unitPrice\":800}],\"totalPrice\":800}"
```

### 2. Crear Pago con Transferencia Bancaria

```cmd
curl -X POST http://localhost:3005/api/payments ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"amount\":800,\"method\":\"bank_transfer\",\"bankTransferData\":{\"bank\":\"Banco Nación\",\"accountNumber\":\"12345678\",\"accountHolder\":\"Test User\"}}"
```

**Respuesta esperada:**

```json
{
  "id": "pay456...",
  "status": "PENDING",  ← Estado PENDING
  "message": "Bank transfer pending confirmation"
}
```

### 3. Verificar Estado (Aún Pendiente)

```cmd
curl http://localhost:3005/api/payments/pay456... ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado:**

```json
{
  "status": "PENDING"
}
```

### 4. Esperar Confirmación Automática (5 segundos)

```cmd
REM Espera 5 segundos y vuelve a consultar
timeout /t 6

curl http://localhost:3005/api/payments/pay456... ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado esperado (90% probabilidad):**

```json
{
  "status": "APPROVED"  ← Confirmado automáticamente
}
```

### 5. Opción: Aprobación Manual

Si quedó en PENDING, puedes aprobarlo manualmente:

```cmd
curl -X PUT http://localhost:3005/api/payments/pay456.../approve ^
  -H "Authorization: Bearer %TOKEN%"
```

---

## 🧪 Caso de Uso 5: Wallet (Billetera Virtual)

### 1. Depositar en Wallet

```cmd
curl -X POST http://localhost:3005/api/wallet/deposit ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"user123\",\"amount\":2000}"
```

**Respuesta:**

```json
{
  "userId": "user123",
  "balance": 2000
}
```

### 2. Consultar Balance

```cmd
curl http://localhost:3005/api/wallet/balance?userId=user123 ^
  -H "Authorization: Bearer %TOKEN%"
```

### 3. Pagar con Wallet

```cmd
REM Crear orden
curl -X POST http://localhost:3004/api/orders ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"user123\",\"articles\":[{\"articleId\":\"art5\",\"quantity\":1,\"unitPrice\":500}],\"totalPrice\":500}"

REM Pagar con wallet
curl -X POST http://localhost:3005/api/payments ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"amount\":500,\"method\":\"wallet\",\"walletData\":{\"userId\":\"user123\"}}"
```

### 4. Verificar Balance Después del Pago

```cmd
curl http://localhost:3005/api/wallet/balance?userId=user123 ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado esperado:**

```json
{
  "balance": 1500  ← 2000 - 500 = 1500
}
```

---

## 🧪 Caso de Uso 6: Método Preferido

### 1. Consultar Método Preferido (Primera Vez)

```cmd
curl http://localhost:3005/api/payments/preferred/user123 ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado esperado:**

```json
{
  "userId": "user123",
  "preferredMethod": null  ← No hay método preferido aún
}
```

### 2. Hacer Varios Pagos con Tarjeta

```cmd
REM Hacer 3 pagos con credit_card
REM (repite el proceso de crear orden + pagar con credit_card 3 veces)
```

### 3. Consultar Método Preferido (Después de 3 Pagos)

```cmd
curl http://localhost:3005/api/payments/preferred/user123 ^
  -H "Authorization: Bearer %TOKEN%"
```

**Resultado esperado:**

```json
{
  "userId": "user123",
  "preferredMethod": "credit_card"  ← Ahora es credit_card
}
```

---

## 🧪 Caso de Uso 7: Historial de Pagos

```cmd
REM Página 1 (primeros 10)
curl "http://localhost:3005/api/payments/history?page=1&limit=10" ^
  -H "Authorization: Bearer %TOKEN%"

REM Filtrar por usuario
curl "http://localhost:3005/api/payments/history?userId=user123&page=1&limit=10" ^
  -H "Authorization: Bearer %TOKEN%"

REM Filtrar por orden
curl "http://localhost:3005/api/payments/history?orderId=%ORDER_ID%&page=1&limit=10" ^
  -H "Authorization: Bearer %TOKEN%"
```

---

## 📊 Verificar Todo el Sistema

### 1. Ver Estadísticas en RabbitMQ

http://localhost:15672

- **Queues**: Ver cantidad de mensajes procesados
- **Connections**: Ver servicios conectados
- **Exchanges**: Ver eventos publicados

### 2. Ver Base de Datos (Opcional)

```cmd
REM Conectar a MongoDB Orders
docker exec -it mongo_orders mongosh

> use orders
> db.orders.find().pretty()
> db.events.find().pretty()  ← Ver eventos de Event Sourcing
> exit

REM Conectar a MongoDB Payments
docker exec -it mongo_payments mongosh

> use payments
> db.payments.find().pretty()
> db.wallets.find().pretty()
> exit
```

### 3. Ver Swagger UI

Abre en el navegador: **http://localhost:3005/api-docs**

Aquí puedes:

- Ver todos los endpoints
- Probar desde la interfaz
- Ver esquemas y ejemplos

---

## 🛑 Detener Todo

```cmd
REM Detener servicios
docker stop authgo cataloggo cartgo ordersgo

REM Detener payments
cd payments_node
docker-compose down

REM Detener infraestructura
docker stop rabbitmq mongo_orders mongo_payments

REM Eliminar contenedores (opcional)
docker rm authgo cataloggo cartgo ordersgo rabbitmq mongo_orders mongo_payments
```

---

## ✅ Checklist de Pruebas Completas

- [ ] ✅ Todos los contenedores levantados (8 servicios)
- [ ] ✅ Health checks OK (5 servicios responden)
- [ ] ✅ Pago completo exitoso → orden "paid"
- [ ] ✅ Pago parcial → orden "partially_paid" → "paid"
- [ ] ✅ Orden cancelada → refund automático → pago "REFUNDED"
- [ ] ✅ Transferencia bancaria → PENDING → APPROVED (5s)
- [ ] ✅ Wallet → depósito → pago → balance actualizado
- [ ] ✅ Método preferido → se guarda después de 3+ pagos
- [ ] ✅ Historial → paginación funciona
- [ ] ✅ RabbitMQ → eventos publicados y consumidos
- [ ] ✅ Logs → se ven las integraciones
- [ ] ✅ Swagger UI → documentación accesible

---

## 🎓 Listo para Entregar

Si **todas las pruebas pasan**, el proyecto está listo para entregar al profesor con:

✅ Ambos microservicios funcionando
✅ Integración event-driven completa
✅ Event Sourcing implementado
✅ Refunds automáticos
✅ Pagos parciales
✅ Múltiples métodos de pago
✅ Documentación completa
✅ Testing funcional

---

## 📝 Notas Finales

- **Tiempo de prueba completa:** ~15-20 minutos
- **Puertos usados:** 3000-3005, 5672, 15672, 27017, 27018
- **Logs en tiempo real:** `docker logs -f <servicio>`
- **Documentación:** README.md, README-API.md, TESTING.md, esta guía
