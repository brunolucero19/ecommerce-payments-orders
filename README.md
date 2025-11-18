# 🛒 Microservicios: Pagos y Órdenes

Sistema de microservicios para gestión de órdenes y pagos, con arquitectura event-driven y Event Sourcing.

**Autor:** Bruno Lucero  
**Universidad:** UTN - Arquitectura de Microservicios  
**Repositorio:** [https://github.com/brunolucero19/ecommerce-payments-orders](https://github.com/brunolucero19/ecommerce-payments-orders)

---

## 📋 Contenido

- **payments_node**: Microservicio de pagos (Node.js + TypeScript + DDD)
- **ordersgo**: Microservicio de órdenes (Go + Event Sourcing)

---

## 🏗️ Arquitectura

```
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│   authgo    │  │  cataloggo   │  │   cartgo    │
│  Port 3000  │  │  Port 3001   │  │  Port 3002  │
│   (JWT)     │  │  (Artículos) │  │  (Carrito)  │
└──────┬──────┘  └──────┬───────┘  └──────┬──────┘
       │                └──────┬───────────┘
       │                       │
┌──────▼───────────────────────▼────────────┐
│         ordersgo (Port 3004)              │
│         Event Sourcing + CQRS             │
└──────┬────────────────────────────┬───────┘
       │                            │
       │ HTTP (validar)     RabbitMQ│(eventos)
       │                            │
┌──────▼────────────────────────────▼───────┐
│      payments_node (Port 3005)            │
│      DDD + Clean Architecture             │
└──────┬────────────────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│  MongoDB + RabbitMQ     │
│  - Orders (27017)       │
│  - Payments (27018)     │
└─────────────────────────┘
```

### Flujo de Integración

```
1. Login → authgo (obtener JWT token)
2. Crear orden → ordersgo (valida con cataloggo/cartgo)
3. Crear pago → payments_node (valida orden + publica evento)
4. ordersgo consume evento → actualiza estado de orden
5. Si orden cancelada → payments_node hace refund automático
```

---

## 🚀 Cómo Probar el Proyecto

### Prerequisitos

- **Docker + Docker Compose** (obligatorio)
- **Node.js 20.x** (solo si ejecutas payments_node localmente)
- **Go 1.21+** (solo si ejecutas ordersgo localmente, **NO es necesario si usas Docker**)

### Servicios Necesarios para Flujo Completo

Para que funcione completamente necesitas:

1. **authgo** (puerto 3000) - Para obtener JWT tokens
2. **cataloggo** (puerto 3001) - Orders valida artículos aquí
3. **cartgo** (puerto 3002) - Orders valida carritos aquí
4. **ordersgo** (puerto 3004) - Gestión de órdenes
5. **payments_node** (puerto 3005) - Procesamiento de pagos

Más infraestructura:

- **RabbitMQ** (puerto 5672) - Comunicación por eventos
- **MongoDB Orders** (puerto 27017)
- **MongoDB Payments** (puerto 27018)

---

## 🔧 Instalación y Ejecución

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/brunolucero19/ecommerce-payments-orders.git
cd ecommerce-payments-orders
```

### Paso 2: Levantar Infraestructura

```bash
# RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# MongoDB para Orders (puerto 27017)
docker run -d --name mongo_orders -p 27017:27017 mongo:6.0

# MongoDB para Payments (puerto 27018)
docker run -d --name mongo_payments -p 27018:27018 mongo:8.2
```

### Paso 3: Levantar Microservicios

**IMPORTANTE:** Debes tener los otros microservicios del e-commerce (authgo, cataloggo, cartgo) corriendo también.

#### 3.1. Auth Service (requerido para JWT)

**Opción A: Con Docker (sin necesidad de Go)**

```bash
cd authgo
docker build -t authgo .
docker run -d --name authgo -p 3000:3000 authgo
```

**Opción B: Con Go instalado**

```bash
cd authgo
go run main.go  # Puerto 3000
```

#### 3.2. Catalog Service (requerido para validar artículos)

**Opción A: Con Docker (sin necesidad de Go)**

```bash
cd cataloggo
docker build -t cataloggo .
docker run -d --name cataloggo -p 3001:3001 cataloggo
```

**Opción B: Con Go instalado**

```bash
cd cataloggo
go run main.go  # Puerto 3001
```

#### 3.3. Cart Service (requerido para validar carritos)

**Opción A: Con Docker (sin necesidad de Go)**

```bash
cd cartgo
docker build -t cartgo .
docker run -d --name cartgo -p 3002:3002 cartgo
```

**Opción B: Con Go instalado**

```bash
cd cartgo
go run main.go  # Puerto 3002
```

#### 3.4. Orders Service

**Opción A: Con Docker (recomendado, sin necesidad de Go)**

```bash
cd ordersgo

# Build de la imagen (IMPORTANTE: usar Dockerfile.local con código actualizado)
docker build -f Dockerfile.local -t ordersgo .

# Ejecutar el contenedor
docker run -d --name ordersgo \
  -p 3004:3004 \
  -e MONGO_URL=mongodb://host.docker.internal:27017 \
  -e RABBIT_URL=amqp://host.docker.internal \
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 \
  ordersgo
```

**En Windows CMD usa:**

```cmd
docker build -f Dockerfile.local -t ordersgo .
docker run -d --name ordersgo -p 3004:3004 ^
  -e MONGO_URL=mongodb://host.docker.internal:27017 ^
  -e RABBIT_URL=amqp://host.docker.internal ^
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 ^
  ordersgo
```

**Opción B: Con Go instalado**

```bash
cd ordersgo
go run main.go  # Puerto 3004
```

#### 3.5. Payments Service

**Opción A: Docker** (recomendado si no tienes Node.js)

```bash
cd payments_node
docker build -t payments_node .
docker run -d --name payments_node -p 3005:3005 \
  -e MONGO_URL=mongodb://host.docker.internal:27018 \
  -e RABBIT_URL=amqp://host.docker.internal \
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 \
  -e ORDERS_SERVICE_URL=http://host.docker.internal:3004 \
  payments_node
```

**Opción B: Desarrollo Local con npm**

```bash
cd payments_node

# Asegurarse que MongoDB esté corriendo en puerto 27018
# docker run -d --name mongo_payments -p 27018:27017 mongo:8.2

# Instalar y ejecutar
npm install
npm start  # Puerto 3005
```

### Paso 4: Verificar que Todo Esté Corriendo

```bash
# Verificar contenedores Docker
docker ps

# Deberías ver: rabbitmq, mongo_orders, mongo_payments, y todos los servicios que levantaste con Docker

# Verificar servicios (esperan respuesta)
curl http://localhost:3000/health  # authgo
curl http://localhost:3001/health  # cataloggo
curl http://localhost:3002/health  # cartgo
curl http://localhost:3004/health  # ordersgo
curl http://localhost:3005/health  # payments_node

# Verificar RabbitMQ Management UI
# http://localhost:15672 (usuario: guest, password: guest)
```

---

## 🐳 Guía Rápida: Todo con Docker (SIN Go ni Node.js)

Si **NO tienes Go ni Node.js instalado**, puedes levantar todo con Docker:

### 1. Infraestructura

```cmd
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name mongo_orders -p 27017:27017 mongo:6.0
docker run -d --name mongo_payments -p 27018:27018 mongo:8.2
```

### 2. Microservicios con Docker

```cmd
REM Auth Service
cd authgo
docker build -t authgo .
docker run -d --name authgo -p 3000:3000 authgo

REM Catalog Service
cd ..\cataloggo
docker build -t cataloggo .
docker run -d --name cataloggo -p 3001:3001 cataloggo

REM Cart Service
cd ..\cartgo
docker build -t cartgo .
docker run -d --name cartgo -p 3002:3002 cartgo

REM Orders Service (IMPORTANTE: usar Dockerfile.local)
cd ..\ecommerce-payments-orders\ordersgo
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

### 3. Verificar

```cmd
docker ps
REM Deberías ver 8 contenedores corriendo
```

### 4. Ver logs de ordersgo

```cmd
docker logs -f ordersgo
```

### 5. Detener todo

```cmd
docker stop authgo cataloggo cartgo ordersgo payments_node
docker stop rabbitmq mongo_orders mongo_payments
```

---

## 🧪 Probar el Flujo Completo

### 1. Obtener Token JWT

```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"password\":\"testpass\"}"
```

Guarda el token que te devuelve: `export TOKEN="tu-jwt-token"`

### 2. Crear una Orden

```bash
curl -X POST http://localhost:3004/api/orders ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"user123\",\"items\":[{\"articleId\":\"art1\",\"quantity\":2}],\"totalPrice\":1000}"
```

Guarda el `orderId` que te devuelve: `set ORDER_ID=tu-order-id`

### 3. Crear un Pago (Tarjeta de Crédito)

```bash
curl -X POST http://localhost:3005/api/payments ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"amount\":1000,\"method\":\"credit_card\",\"cardData\":{\"number\":\"4111111111111111\",\"holder\":\"John Doe\",\"expiry\":\"12/25\",\"cvv\":\"123\"}}"
```

### 4. Verificar Estado de la Orden

```bash
curl http://localhost:3004/api/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %TOKEN%"
```

Deberías ver `status: "paid"` si el pago fue exitoso.

---

## 📚 Características de Payments Node

### Métodos de Pago

- **Tarjeta de Crédito/Débito**: Procesamiento inmediato
- **Transferencia Bancaria**: Estado PENDING → confirmación automática en 5s
- **Wallet**: Billetera virtual con depósitos/retiros

### Funcionalidades

- ✅ **Pagos Parciales**: Dividir un pago en múltiples transacciones
- ✅ **Refunds Automáticos**: Cuando se cancela una orden (3 reintentos)
- ✅ **Método Preferido**: Guarda el método más usado por usuario
- ✅ **Estados**: PENDING, APPROVED, REJECTED, REFUNDED
- ✅ **Swagger**: http://localhost:3005/api-docs

### Eventos Publicados (RabbitMQ)

- `payment.success` - Pago completo exitoso
- `payment.partial` - Pago parcial exitoso
- `payment.failed` - Pago rechazado
- `payment.refunded` - Pago reembolsado

### Eventos Consumidos

- `user.logout` - Invalida tokens en cache
- `order.canceled` - Trigger para refund automático

---

## 📚 Características de Orders Go

### Event Sourcing

- Eventos inmutables como fuente de verdad
- Projections para materializar estado actual
- Auditabilidad completa de cambios

### Estados de Orden

- `placed` → `validated` → `payment_defined` → `paid`
- `partially_paid` (pagos parciales)

### Eventos Consumidos

- `payment.success` → Status: Paid
- `payment.partial` → Status: PartiallyPaid
- `payment.failed` → Registra intento
- `payment.refunded` → Revierte estado

### Eventos Publicados

- `order.canceled` → Trigger para refunds

---

## 🔑 Configuración

### Payments Node (.env)

```env
PORT=3005
MONGODB_URI=mongodb://localhost:27018/payments
RABBITMQ_URL=amqp://localhost
JWT_SECRET=tu-secret-minimo-32-caracteres
AUTH_SERVICE_URL=http://localhost:3000
ORDERS_SERVICE_URL=http://localhost:3004
```

### Orders Go (.env)

```env
PORT=3004
MONGODB_URI=mongodb://localhost:27017/orders
RABBITMQ_URL=amqp://localhost
JWT_SECRET=tu-secret-minimo-32-caracteres
```

**IMPORTANTE:** `JWT_SECRET` debe ser el mismo en todos los microservicios.

---

## 🧪 Testing

### Payments Node

```bash
cd payments_node
npm test  # 5 tests pasando, 78% cobertura
```

Ver [payments_node/TESTING.md](./payments_node/TESTING.md) para 9 casos de uso manuales detallados.

### Orders Go

```bash
cd ordersgo
go test ./...
```

---

## 📖 Documentación Detallada

- [payments_node/README.md](./payments_node/README.md) - Documentación completa de Payments
- [payments_node/README-API.md](./payments_node/README-API.md) - Endpoints con ejemplos
- [payments_node/TESTING.md](./payments_node/TESTING.md) - Casos de prueba
- [payments_node/DOCKER.md](./payments_node/DOCKER.md) - Configuración Docker
- [ordersgo/README.md](./ordersgo/README.md) - Documentación completa de Orders

---

## 🔄 Casos de Uso

### 1. Pago Completo

```
1. Login → authgo
2. Crear orden → ordersgo (status: "payment_defined")
3. Crear pago tarjeta (amount: totalPrice)
4. payments_node publica payment.success
5. ordersgo actualiza → status: "paid"
```

### 2. Pago Parcial

```
1. Crear pago 1 (amount: 400 de 1000)
2. payments_node publica payment.partial
3. ordersgo → status: "partially_paid"
4. Crear pago 2 (amount: 600)
5. payments_node publica payment.success
6. ordersgo → status: "paid"
```

### 3. Refund Automático

```
1. Cliente cancela orden
2. ordersgo publica order.canceled
3. payments_node detecta evento
4. Busca pagos APPROVED de esa orden
5. Refund automático (3 reintentos con backoff)
6. Publica payment.refunded por cada pago
7. ordersgo actualiza estado
```

### 4. Transferencia Bancaria

```
1. Crear pago con method: "bank_transfer"
2. Response: { status: "PENDING" }
3. Confirmación automática en 5s (90% éxito)
4. O aprobación manual: PUT /api/payments/:id/approve
```

---

## 🐳 Docker

### Payments Node

```bash
cd payments_node

# Build imagen
docker build -t payments_node .

# Run contenedor
docker run -d --name payments_node -p 3005:3005 \
  -e MONGO_URL=mongodb://host.docker.internal:27018 \
  -e RABBIT_URL=amqp://host.docker.internal \
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 \
  -e ORDERS_SERVICE_URL=http://host.docker.internal:3004 \
  payments_node

# Ver logs
docker logs -f payments_node

# Detener
docker stop payments_node && docker rm payments_node
```

### Orders Go

```bash
cd ordersgo

# Build (con código local actualizado)
docker build -f Dockerfile.local -t ordersgo .

# Run
docker run -p 3004:3004 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/orders \
  -e RABBITMQ_URL=amqp://host.docker.internal \
  -e JWT_SECRET=tu-secret \
  ordersgo
```

---

## 🔍 Troubleshooting

### Puerto en uso

```bash
netstat -ano | findstr :3005   # Ver qué proceso usa el puerto
netstat -ano | findstr :27018
```

### RabbitMQ no conecta

```bash
docker ps | findstr rabbitmq   # Verificar que esté corriendo
docker logs rabbitmq           # Ver logs
docker restart rabbitmq        # Reiniciar
```

### JWT inválido

```bash
# Verificar que JWT_SECRET sea idéntico en:
# - authgo/.env
# - ordersgo/.env
# - payments_node/.env
```

### Eventos no se procesan

Accede a RabbitMQ Management: http://localhost:15672 (guest/guest)

- Ve a "Queues"
- Verifica que haya consumers conectados
- Revisa mensajes pendientes

### MongoDB connection failed

```bash
# Verificar que estén corriendo
docker ps | findstr mongo

# Ver logs
docker logs mongo_orders
docker logs mongo_payments

# Verificar puertos
netstat -ano | findstr :27017
netstat -ano | findstr :27018
```

---

## 🛠️ Tecnologías

### Payments Node

- Node.js 20.x + TypeScript 5.5
- Express 4.19 + Mongoose 8.6
- RabbitMQ (amqplib)
- Jest (testing)
- Swagger UI (OpenAPI 3.0)

### Orders Go

- Go 1.21+
- MongoDB 6.0
- RabbitMQ
- Gin (REST) + gqlgen (GraphQL)

---

## 📝 Licencia

MIT

## 👤 Autor

**Bruno Lucero**  
GitHub: [@brunolucero19](https://github.com/brunolucero19)
