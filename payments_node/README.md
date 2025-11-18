# 💳 Microservicio de Pagos

Microservicio completo para gestión de pagos en un sistema de e-commerce, con soporte para múltiples métodos de pago, pagos parciales, refunds automáticos y integración event-driven con otros microservicios.

**Autor:** Bruno Lucero  
**Repositorio:** [https://github.com/brunolucero19/ecommerce-payments-orders](https://github.com/brunolucero19/ecommerce-payments-orders)  
**Tecnologías:** Node.js 20.x, TypeScript 5.5, Express 4.19, MongoDB 8.2, RabbitMQ

---

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Testing](#-testing)
- [Documentación API](#-documentación-api)
- [Integración con Microservicios](#-integración-con-microservicios)
- [Docker](#-docker)

---

## ✨ Características Principales

### Métodos de Pago

- 💳 **Tarjetas de Crédito/Débito**: Procesamiento inmediato con validación
- 🏦 **Transferencia Bancaria**: Estado PENDING con confirmación automática (5s) o manual
- 👛 **Wallet**: Sistema de billetera virtual con depósitos y retiros

### Funcionalidades Avanzadas

- **Pagos Parciales**: Permite dividir un pago en múltiples transacciones
  - Tracking de número de pago (1, 2, 3...)
  - Cálculo automático de monto total pagado
  - Estado `partially_paid` en órdenes
- **Refunds Automáticos**: Cuando una orden se cancela, se reembolsan todos los pagos aprobados
  - 3 reintentos con exponential backoff
  - Refund automático a wallet
  - Procesamiento manual para tarjetas
- **Método Preferido**: Guarda el método de pago más usado por cada usuario
- **Validación de Órdenes**: Integración HTTP con ordersgo para validar antes de crear pago
- **Autenticación JWT**: Validación de tokens con cache en memoria
- **Event-Driven Architecture**: Publica eventos a RabbitMQ para integración con otros servicios

### Estados de Pago

- `PENDING`: Pago creado, esperando confirmación
- `APPROVED`: Pago exitoso
- `REJECTED`: Pago rechazado (con código de error)
- `REFUNDED`: Pago reembolsado

---

## 🏗 Arquitectura

Desarrollado siguiendo **Domain-Driven Design (DDD)** y **Clean Architecture**:

```
src/
├── domain/              # Lógica de Negocio (Capa de Dominio)
│   ├── payment/         # Agregado Payment
│   │   ├── payment.ts         # Entidad Payment (Mongoose Model)
│   │   ├── service.ts         # Casos de uso de pago
│   │   └── valueObjects/      # Card, BankTransfer, Wallet data
│   ├── wallet/          # Agregado Wallet
│   │   ├── wallet.ts          # Entidad Wallet
│   │   └── service.ts         # Lógica de wallet
│   ├── orders/          # Integración con Orders Service
│   │   └── service.ts         # Validación de órdenes
│   └── security/        # Tracking de métodos preferidos
│       └── service.ts
├── rabbit/              # Infraestructura - Mensajería
│   ├── events/
│   │   └── publishers.ts      # Publica: payment.success, payment.partial, etc.
│   └── consumers/
│       ├── logout.ts          # Consume: user.logout (invalida cache)
│       └── orderCanceled.ts   # Consume: order.canceled (refund automático)
├── rest/                # Capa de Presentación - API REST
│   ├── payment/
│   │   ├── controller.ts      # 7 endpoints de pagos
│   │   └── routes.ts
│   ├── wallet/
│   │   ├── controller.ts      # 3 endpoints de wallet
│   │   └── routes.ts
│   └── middleware/
│       └── auth.ts            # Validación JWT con cache
├── server/              # Configuración del Servidor
│   ├── express.ts             # Setup de Express (helmet, cors, compression)
│   ├── swagger.ts             # Especificación OpenAPI 3.0
│   ├── environment.ts         # Validación de variables de entorno
│   └── database.ts            # Conexión a MongoDB
└── server.ts            # Punto de entrada
```

### Patrones Implementados

- **Aggregate Roots**: Payment, Wallet
- **Value Objects**: CardData, BankTransferData, WalletPaymentData
- **Domain Services**: PaymentService, WalletService, OrdersService
- **Repository Pattern**: Abstracción de persistencia con Mongoose
- **Event Sourcing**: Integración via eventos de dominio

---

## 🚀 Instalación

### Prerequisitos

- **Node.js 20.x**: [Descargar](https://nodejs.org/)
- **MongoDB 8.2+**: Puerto 27018 (ver [DOCKER.md](DOCKER.md))
- **RabbitMQ**: [Descargar](https://www.rabbitmq.com/download.html)
- **Auth Service** (opcional): Para validación de tokens JWT - `http://localhost:3000`
- **Orders Service** (opcional): Para validación de órdenes - `http://localhost:3004`

### Instalar Dependencias

```bash
cd payments_node
npm install
```

---

## ⚙️ Configuración

### 1. Variables de Entorno

Copiar `.env.example` y crear `.env`:

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
# Servidor
NODE_ENV=development
PORT=3005

# MongoDB (puerto 27018 para evitar conflictos con otros microservicios)
MONGODB_URI=mongodb://localhost:27018/payments

# RabbitMQ
RABBITMQ_URL=amqp://localhost

# JWT (debe coincidir con Auth Service)
JWT_SECRET=your-secret-key-here

# Servicios externos
AUTH_SERVICE_URL=http://localhost:3000
ORDERS_SERVICE_URL=http://localhost:3004

# Logs
LOG_LEVEL=info
```

### 2. Validación de Configuración

El sistema valida automáticamente las variables al iniciar:

- ✓ Puerto en rango válido (1-65535)
- ✓ URLs de MongoDB y RabbitMQ con formato correcto
- ✓ JWT secret con longitud mínima de 32 caracteres
- ✓ URLs de servicios externos válidas

Ver `src/server/environment.ts` para más detalles.

---

## 💻 Uso

### Opción 1: Docker (Recomendado para producción)

Levanta el microservicio de pagos en Docker:

```bash
# 1. Asegurarse que MongoDB esté corriendo
docker run -d --name mongo_payments -p 27018:27017 mongo:8.2

# 2. Build y ejecutar payments
docker build -t payments_node .
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

Servicios disponibles:

- **API**: http://localhost:3005
- **Swagger UI**: http://localhost:3005/api-docs
- **MongoDB**: localhost:27018

### Opción 2: Desarrollo Local con npm

MongoDB en Docker, microservicio en Node.js:

```bash
# 1. Levantar MongoDB
docker run -d --name mongo_payments -p 27018:27017 mongo:8.2

# 2. Ejecutar en modo desarrollo (con watch)
npm start

# O compilar y ejecutar en producción
npm run build
npm run serve
```

### Scripts Disponibles

```bash
npm start          # Build + watch mode (desarrollo)
npm run build      # Compilar TypeScript
npm run serve      # Ejecutar código compilado
npm test           # Ejecutar tests con cobertura
npm run tslint     # Verificar código con TSLint
```

---

## 🧪 Testing

### Tests Unitarios

```bash
# Ejecutar todos los tests
npm test

# Tests sin cobertura
npm test -- --no-coverage

# Tests en modo watch
npm test -- --watch

# Tests específicos
npm test -- --testPathPattern="payment"
```

### Cobertura Actual

- **Payment Model**: 78.78% statements, 85.71% branches
- **Tests pasando**: 5/5 ✅

Ver [TESTING.md](TESTING.md) para:

- 9 casos de uso detallados para testing manual
- Ejemplos de requests con curl/Postman
- Validaciones por caso de uso
- Guía de debugging

### Testing Manual - Casos de Uso

1. **Pago Exitoso** (Credit Card)
2. **Pago Parcial** (Múltiples transacciones)
3. **Pago Fallido** (Validación de errores)
4. **Transferencia Bancaria** (Confirmación automática)
5. **Orden Cancelada** (Refund automático)
6. **Wallet** (Depósito, retiro, refund)
7. **Método Preferido** (Tracking automático)
8. **Historial** (Paginación)
9. **Aprobación Manual** (Transferencias pendientes)

---

## 📚 Documentación API

### Swagger UI (Interactivo)

```
http://localhost:3005/api-docs
```

Documentación OpenAPI 3.0 completa con:

- Esquemas de datos
- Ejemplos de requests/responses
- Códigos de error
- Try it out interactivo

### Markdown

- [README-API.md](./README-API.md) - Documentación detallada de endpoints
- [DOCUMENTACION.md](./DOCUMENTACION.md) - Especificación de casos de uso

### Endpoints Principales

#### Pagos

```http
POST   /api/payments              # Crear pago
GET    /api/payments/:id          # Obtener pago por ID
GET    /api/payments/order/:orderId  # Pagos de una orden
GET    /api/payments/history      # Historial con paginación
GET    /api/payments/preferred/:userId  # Método preferido
PUT    /api/payments/:id/approve  # Aprobación manual
POST   /api/payments/:id/refund   # Reembolso
```

#### Wallet

```http
POST   /api/wallet/deposit        # Depositar fondos
GET    /api/wallet/balance        # Consultar saldo
POST   /api/wallet/refund         # Reembolso a wallet
```

Todos los endpoints requieren header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔗 Integración con Microservicios

### Eventos Publicados (RabbitMQ)

Exchange: `payments_exchange` (topic)

| Routing Key        | Payload                | Descripción           |
| ------------------ | ---------------------- | --------------------- |
| `payment.success`  | PaymentSuccessMessage  | Pago completo exitoso |
| `payment.partial`  | PaymentPartialMessage  | Pago parcial exitoso  |
| `payment.failed`   | PaymentFailedMessage   | Pago rechazado        |
| `payment.refunded` | PaymentRefundedMessage | Pago reembolsado      |

### Eventos Consumidos

| Exchange               | Routing Key      | Acción                                    |
| ---------------------- | ---------------- | ----------------------------------------- |
| `auth` (fanout)        | -                | `user.logout`: Invalida token en cache    |
| `order_events` (topic) | `order.canceled` | Reembolsa automáticamente pagos aprobados |

### Integración HTTP

- **Auth Service** (`GET /api/auth/validate`): Valida tokens JWT
- **Orders Service** (`GET /api/orders/:orderId`): Valida orden antes de crear pago

### Integración con ordersgo

El microservicio ordersgo (Go) consume los eventos de pagos:

```go
// ordersgo escucha en:
- payment.success  → Actualiza Order status a "paid"
- payment.partial  → Actualiza Order status a "partially_paid"
- payment.failed   → Registra intento fallido
- payment.refunded → Revierte Order status si es necesario
```

Ver `/ordersgo/internal/rabbit/` para implementación de consumers.

---

## 🐳 Docker

### Imágenes

- **Desarrollo**: `Dockerfile` - Multi-stage con watch mode
- **Producción**: `Dockerfile.prod` - Imagen optimizada

### Build

```bash
# Desarrollo
docker build -t payments-node:dev .

# Producción
docker build -f Dockerfile.prod -t payments-node:prod .
```

### Run Individual

```bash
docker run -d \
  --name payments-node \
  -p 3005:3005 \
  -e MONGODB_URI=mongodb://host.docker.internal:27018/payments \
  -e RABBITMQ_URL=amqp://host.docker.internal \
  -e JWT_SECRET=your-secret \
  payments-node:dev
```

### Docker Compose

Ver [DOCKER.md](DOCKER.md) para configuración completa.

---

## 📂 Estructura del Proyecto

```
payments_node/
├── src/
│   ├── domain/              # Lógica de negocio (DDD)
│   │   ├── payment/         # Agregado Payment
│   │   ├── wallet/          # Agregado Wallet
│   │   ├── orders/          # Cliente HTTP Orders
│   │   └── security/        # Métodos preferidos
│   ├── rabbit/              # Event-driven integration
│   │   ├── events/          # Publishers
│   │   └── consumers/       # Consumers (logout, orderCanceled)
│   ├── rest/                # API REST
│   │   ├── payment/         # Payment controller
│   │   ├── wallet/          # Wallet controller
│   │   └── middleware/      # Auth middleware
│   ├── server/              # Configuración
│   │   ├── express.ts
│   │   ├── swagger.ts       # OpenAPI spec
│   │   ├── environment.ts   # Validación .env
│   │   └── database.ts
│   └── server.ts            # Entry point
├── test/                    # Tests (Jest + TypeScript)
│   ├── domain/
│   ├── rabbit/
│   └── rest/
├── coverage/                # Reportes de cobertura
├── dist/                    # Código compilado
├── .env.example             # Plantilla de configuración
├── Dockerfile               # Imagen Docker multi-stage
├── Dockerfile               # Imagen desarrollo
├── Dockerfile.prod          # Imagen producción
├── jest.config.js           # Configuración Jest
├── tsconfig.json            # Configuración TypeScript
├── tslint.json              # Reglas de linting
├── README.md                # Este archivo
├── README-API.md            # Documentación API detallada
├── DOCUMENTACION.md         # Especificación casos de uso
├── TESTING.md               # Guía de testing
└── DOCKER.md                # Guía Docker detallada
```

---

## 🔍 Troubleshooting

### Puerto 27018 en uso

```bash
# Ver qué usa el puerto
netstat -ano | findstr :27018

# Cambiar puerto en .env y variable de entorno SERVER_PORT
```

### RabbitMQ no conecta

```bash
# Verificar que RabbitMQ esté corriendo
rabbitmqctl status

# Ver logs
docker logs rabbitmq
```

### Errores de autenticación

```bash
# Verificar JWT_SECRET en .env
# Debe coincidir con Auth Service
```

### MongoDB no conecta

```bash
# Verificar MongoDB
docker-compose ps mongo

# Ver logs
docker-compose logs mongo
```

---

## 📝 Licencia

MIT

---

## 👤 Autor

**Bruno Lucero**  
GitHub: [@brunolucero19](https://github.com/brunolucero19)

---
