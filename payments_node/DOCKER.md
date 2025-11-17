# Docker - Payments Microservice

Guía para ejecutar el microservicio de pagos con Docker.

## 🚀 Inicio Rápido

### Opción 1: Solo MongoDB (Recomendado para desarrollo)

Levanta solo MongoDB y ejecutas el microservicio con `npm start` en el host:

```bash
# Levantar solo MongoDB
docker-compose up -d mongo

# Ver logs de mongo
docker-compose logs -f mongo

# En otra terminal, ejecutar el microservicio
npm start
```

### Opción 2: MongoDB + Payments (Todo en Docker)

Levanta MongoDB y el microservicio payments en contenedores:

```bash
# Levantar todos los servicios
docker-compose up -d

# Ver logs de todos los servicios
docker-compose logs -f

# Ver solo logs de payments
docker-compose logs -f payments
```

### Detener servicios

```bash
# Detener todos
docker-compose down

# Solo detener payments (mantener mongo corriendo)
docker-compose stop payments
```

### Detener y eliminar volúmenes (⚠️ borra la base de datos)

```bash
docker-compose down -v
```

## 📦 Servicios Incluidos

El `docker-compose.yml` incluye 2 servicios:

| Servicio     | Puerto | Descripción                 | Estado por defecto |
| ------------ | ------ | --------------------------- | ------------------ |
| **mongo**    | 27018  | Base de datos MongoDB 8.2.1 | Se levanta siempre |
| **payments** | 3005   | API REST del microservicio  | Se levanta siempre |

**Notas importantes:**

- Los demás microservicios tienen sus propias bases de datos (MongoDB 6.0 en puerto 27017)
- RabbitMQ se levanta por separado y es compartido entre todos los microservicios
- Puedes elegir ejecutar payments con `npm start` (Opción 1) o en Docker (Opción 2)

### Acceso a los servicios

- **API Payments:** http://localhost:3005
- **API Docs (Swagger):** http://localhost:3005/api-docs
- **Health Check:** http://localhost:3005/health
- **MongoDB Payments:** mongodb://localhost:27018/payments_db
- **Mongosh:** `mongosh mongodb://localhost:27018/payments_db`

## 🔧 Configuración

### Variables de Entorno

#### Opción 1: npm start (archivo .env)

Cuando ejecutas el microservicio con `npm start`, edita el archivo `.env`:

```bash
SERVER_PORT=3005
LOG_LEVEL=debug
MONGO_URL=mongodb://127.0.0.1:27018/payments_db  # MongoDB en contenedor
RABBIT_URL=amqp://localhost  # RabbitMQ en el host
JWT_SECRET=+b59WQF+kUDr0TGxevzpRV3ixMvyIQuD1O
AUTH_SERVICE_URL=http://localhost:3000
ORDERS_SERVICE_URL=http://localhost:3004
```

#### Opción 2: Docker (docker-compose.yml)

Cuando ejecutas con `docker-compose up`, las variables están en el archivo `docker-compose.yml`:

```yaml
environment:
  SERVER_PORT: 3005
  LOG_LEVEL: debug
  MONGO_URL: mongodb://mongo:27017/payments_db # Usa el nombre del servicio 'mongo'
  RABBIT_URL: amqp://host.docker.internal # RabbitMQ en el host
  JWT_SECRET: +b59WQF+kUDr0TGxevzpRV3ixMvyIQuD1O
  AUTH_SERVICE_URL: http://host.docker.internal:3000
  ORDERS_SERVICE_URL: http://host.docker.internal:3004
```

**Nota:** `host.docker.internal` permite que el contenedor acceda a servicios en el host.

## 🏗️ Build Manual del Dockerfile

El `Dockerfile` está preparado para crear una imagen optimizada del microservicio, pero **no se usa en desarrollo local**.

### Build de la imagen (opcional)

```bash
docker build -t payments-service:latest .
```

### Run del contenedor (opcional, para testing)

```bash
docker run -d \
  --name payments \
  -p 3005:3005 \
  -e MONGO_URL=mongodb://host.docker.internal:27018/payments_db \
  -e RABBIT_URL=amqp://host.docker.internal \
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 \
  -e ORDERS_SERVICE_URL=http://host.docker.internal:3004 \
  payments-service:latest
```

**Nota:** En desarrollo normal, ejecuta el microservicio con `npm start` en lugar de Docker.

## 🔍 Debugging

### Entrar al contenedor

```bash
# Shell interactivo
docker exec -it payments_service sh

# Ver estructura de archivos
docker exec payments_service ls -la /app
```

### Verificar salud de los servicios

```bash
# Health check del microservicio (debe estar corriendo con npm start)
curl http://localhost:3005/health

# Health check de mongo
docker exec payments_mongo mongosh --eval "db.runCommand('ping')"
```

### Inspeccionar volúmenes

```bash
# Listar volúmenes
docker volume ls

# Inspeccionar volumen de mongo
docker volume inspect payments_node_mongo_data
```

## 🧹 Limpieza

### Eliminar contenedores

```bash
docker-compose down
```

### Eliminar volúmenes

```bash
docker-compose down -v
```

### Eliminar imágenes

```bash
docker rmi payments-service:latest
```

### Limpieza completa del sistema

```bash
# ⚠️ Cuidado: elimina TODO lo no usado
docker system prune -a --volumes
```

## 📊 Volúmenes

El `docker-compose.yml` crea 1 volumen persistente:

- **mongo_data:** Almacena la base de datos MongoDB 8.2.1

Los datos persisten entre reinicios del contenedor.

## 🌐 Networking

El microservicio (corriendo con `npm start`) se comunica con:

- `localhost:27018` → MongoDB (contenedor)
- `localhost:5672` → RabbitMQ (corriendo en el host o contenedor separado)
- `localhost:3000` → authgo (corriendo en el host)
- `localhost:3004` → ordersgo (corriendo en el host)

## ⚠️ Troubleshooting

### Error: "Cannot connect to MongoDB"

**Causa:** MongoDB no está listo cuando payments intenta conectarse.

**Solución:** El `docker-compose.yml` ya incluye `depends_on` con health checks. Si persiste:

```bash
# Reiniciar solo payments
docker-compose restart payments
```

### Error: "Cannot connect to RabbitMQ"

**Causa:** RabbitMQ no está corriendo en el host.

**Solución:** Levantar RabbitMQ (corriendo en el host o contenedor separado):

```bash
# Si RabbitMQ está instalado localmente
net start RabbitMQ  # Windows
sudo systemctl start rabbitmq-server  # Linux
```

### Error: "Port already in use"

**Causa:** El puerto 27018 (MongoDB) ya está en uso.

**Solución:** Cambiar el puerto en `docker-compose.yml`:

```yaml
# Cambiar puerto de mongo
ports:
  - '27019:27017' # Usar puerto 27019 en el host
```

Y actualizar `.env`:

```bash
MONGO_URL=mongodb://127.0.0.1:27019/payments_db
```

### Ver logs de error

```bash
# Ver últimas 100 líneas de logs
docker-compose logs --tail=100 payments
```

## 🔐 Seguridad

### Buenas prácticas implementadas:

✅ Multi-stage build (imagen más pequeña)  
✅ Usuario no-root (`nodejs`)  
✅ Health checks automáticos  
✅ `.dockerignore` para excluir archivos sensibles  
✅ Variables de entorno en lugar de hardcodear valores

### Para producción:

- Cambiar `JWT_SECRET` por uno seguro
- Usar Docker Secrets para credenciales
- Implementar límites de recursos (CPU, memoria)
- Usar registry privado para imágenes
- Habilitar logging centralizado

## 📚 Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [RabbitMQ Docker Hub](https://hub.docker.com/_/rabbitmq)
