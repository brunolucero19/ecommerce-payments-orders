# Microservicio de Pagos

Microservicio encargado de gestionar los pagos del sistema de e-commerce.

Se integra con el microservicio de Orders mediante RabbitMQ para procesar las órdenes que requieren pago.

**Autor:** Bruno Lucero  
**Repositorio:** [https://github.com/brunolucero19/microservicio-pagos](https://github.com/brunolucero19/microservicio-pagos)

## Arquitectura

Este microservicio está desarrollado siguiendo los principios de **Domain-Driven Design (DDD)**:

- **Domain Layer**: Contiene las entidades del dominio y la lógica de negocio (Payment, Transaction)
- **Infrastructure Layer**: Implementaciones de RabbitMQ, base de datos MongoDB y servicios externos
- **Application Layer**: Casos de uso y orquestación de la lógica de negocio
- **Presentation Layer**: API REST con Express

## Dependencias

### Node.js 20.x

Seguir los pasos de instalación del sitio oficial [nodejs.org](https://nodejs.org/en/)

### MongoDB

La base de datos se almacena en MongoDB.

**Instalación:**

- **Windows/Mac**: Descargar desde [mongodb.com](https://www.mongodb.com/try/download/community)
- **Linux**:

```bash
sudo apt-get install mongodb
```

### RabbitMQ

Este microservicio consume eventos de órdenes desde RabbitMQ y publica eventos de pagos.

**Instalación:**

- **Windows/Mac**: Descargar desde [rabbitmq.com](https://www.rabbitmq.com/download.html)
- **Linux**:

```bash
sudo apt-get install rabbitmq-server
```

## Configuración

Crear un archivo `.env` en la raíz del proyecto (usar `.env.example` como plantilla):

```bash
cp .env.example .env
```

Editar `.env` con los valores correspondientes. Ver `.env.example` para detalles.

## Instalación y Ejecución

### Opción 1: Docker Compose (Recomendado)

Levanta MongoDB y el microservicio en contenedores:

```bash
# Levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

Accede a:

- API: http://localhost:3005
- Swagger: http://localhost:3005/api-docs

Ver [DOCKER.md](DOCKER.md) para más detalles.

### Opción 2: Desarrollo Local

Levanta solo MongoDB con Docker y ejecuta el microservicio con Node.js:

```bash
# 1. Levantar MongoDB
docker-compose up -d mongo

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm start

# O en modo producción
npm run build
npm run serve
```

**Nota:** Los demás microservicios usan MongoDB 6.0 en puerto 27017. RabbitMQ se levanta por separado.

## Testing

```bash
npm test
```

## Documentación API

La documentación de la API se puede consultar en:

- [README-API.md](./README-API.md) - Documentación en Markdown
- [http://localhost:3005](http://localhost:3005) - Documentación web (cuando el servidor está ejecutándose)

## Docker

### Build

```bash
docker build -t payments-node .
```

### Run

```bash
docker run -it --name payments-node -p 3005:3005 payments-node
```

## Estructura del Proyecto

```
payments_node/
├── src/
│   ├── domain/           # Entidades y lógica de dominio
│   │   └── payment/      # Agregado de Payment
│   ├── rabbit/           # Configuración y consumidores de RabbitMQ
│   ├── rest/             # Controllers y rutas REST
│   ├── server/           # Configuración del servidor Express
│   └── server.ts         # Punto de entrada
├── test/                 # Tests unitarios y de integración
└── dist/                 # Código compilado
```

## Integración con otros microservicios

### Orders (ordersgo)

- **Consume**: `order-placed` - Cuando se crea una nueva orden
- **Publica**: `payment-processed` - Cuando se procesa un pago exitosamente
- **Publica**: `payment-failed` - Cuando falla un pago

### Auth (ecommerce_auth_node)

- Valida tokens JWT para autenticación de usuarios en las peticiones HTTP

## Licencia

MIT
