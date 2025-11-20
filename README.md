# Microservicios de Payments & Orders

> Sistema de microservicios para gestión de órdenes y pagos con arquitectura event-driven y Event Sourcing

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Go](https://img.shields.io/badge/Go-1.21+-blue.svg)](https://golang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%20%7C%208.2-brightgreen.svg)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-orange.svg)](https://www.rabbitmq.com/)

**Autor:** Bruno Lucero  
**Universidad:** UTN - Arquitectura de Microservicios  
**Repositorio:** [https://github.com/brunolucero19/ecommerce-payments-orders](https://github.com/brunolucero19/ecommerce-payments-orders)

---

## Si te gusta este proyecto, ¡dale una estrella!

Si te resulta útil o interesante, **por favor considera darle una ⭐ en GitHub**. ¡Tu apoyo es muy importante!

---

## Contenido

- **payments_node**: Microservicio de pagos y wallet (Node.js + TypeScript + DDD)
- **ordersgo**: Microservicio de órdenes (Go + Event Sourcing + CQRS)

---

## Características Principales

### Payments Node

Microservicio de pagos con soporte para múltiples métodos (tarjetas, transferencias, wallet), pagos parciales y reembolsos automáticos. Implementa DDD y Clean Architecture con API REST documentada en Swagger.

### Orders Go

Microservicio de órdenes basado en Event Sourcing y CQRS. Gestiona el ciclo de vida completo de las órdenes con auditabilidad total. Expone interfaces REST y GraphQL.

---

## Arquitectura

### Diagrama de Componentes

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
│  ┌─────────────┐  ┌─────────────┐         │
│  │   Events    │  │ Projections │         │
│  │   Store     │→ │  (Orders)   │         │
│  └─────────────┘  └─────────────┘         │
└──────┬────────────────────────────┬───────┘
       │                            │
       │ HTTP (validar orden)  RabbitMQ (eventos)
       │                            │
┌──────▼────────────────────────────▼───────┐
│      payments_node (Port 3005)            │
│      DDD + Clean Architecture             │
│  ┌────────────┐  ┌─────────────┐          │
│  │  Payment   │  │   Wallet    │          │
│  │  Domain    │  │   Domain    │          │
│  └────────────┘  └─────────────┘          │
└──────┬────────────────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│  MongoDB + RabbitMQ     │
│  - Orders (27017)       │
│  - Payments (27018)     │
│  - RabbitMQ (5672)      │
└─────────────────────────┘
```

---

## Cómo Probar el Proyecto

### Prerequisitos

- **Docker** (obligatorio)
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

## Instalación y Ejecución

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

Ver en: [https://github.com/nmarsollier/ecommerce](https://github.com/nmarsollier/ecommerce)

#### 3.1. Orders Service

**Con Docker (recomendado, sin necesidad de Go)**

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

#### 3.2. Payments Service

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

# Verificar RabbitMQ Management UI
# http://localhost:15672 (usuario: guest, password: guest)
```

---

## Integración Entre Servicios

### Comunicación

- **HTTP/REST**: Payments valida órdenes en Orders antes de procesar pagos
- **RabbitMQ**: Comunicación asíncrona mediante eventos (payment._, order._)
- **Event-Driven**: Cambios de estado propagados automáticamente entre servicios

---

## Configuración

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

## Documentación Detallada

### Payments Node

- [README.md](./payments_node/README.md) - Documentación completa
- [README-API.md](./payments_node/README-API.md) - Endpoints con ejemplos
- [DOCUMENTACION.md](./payments_node/DOCUMENTACION.md) - Documentación completa

### Orders Go

- [README.md](./ordersgo/README.md) - Documentación completa
- [README-API.md](./ordersgo/README-API.md) - Documentación de API

## Tecnologías Utilizadas

### Payments Node

| Categoría         | Tecnologías                |
| ----------------- | -------------------------- |
| **Runtime**       | Node.js 20.x               |
| **Lenguaje**      | TypeScript 5.5             |
| **Framework**     | Express 4.19               |
| **Base de Datos** | MongoDB 8.2 + Mongoose 8.6 |
| **Mensajería**    | RabbitMQ (amqplib)         |
| **Testing**       | Jest + Supertest           |
| **Documentación** | Swagger UI (OpenAPI 3.0)   |
| **Arquitectura**  | DDD + Clean Architecture   |

### Orders Go

| Categoría             | Tecnologías           |
| --------------------- | --------------------- |
| **Lenguaje**          | Go 1.21+              |
| **Framework REST**    | Gin                   |
| **Framework GraphQL** | gqlgen                |
| **Base de Datos**     | MongoDB 6.0           |
| **Mensajería**        | RabbitMQ              |
| **Arquitectura**      | Event Sourcing + CQRS |
| **Documentación**     | Swagger (swaggo)      |

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](./payments_node/LICENSE) para más detalles.

---

## Autor

**Bruno Lucero**

- GitHub: [@brunolucero19](https://github.com/brunolucero19)

---
