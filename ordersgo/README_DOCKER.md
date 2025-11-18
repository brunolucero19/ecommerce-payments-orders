# ⚠️ IMPORTANTE: Dockerfile Actualizado

## Problema con Dockerfile Original

El `Dockerfile` original en este directorio **descarga código viejo de GitHub** (`nmarsollier/ordersgo`), NO usa el código local actualizado con:

- ✅ 4 nuevos consumers de eventos de pagos
- ✅ PaymentEvent mejorado con campos adicionales
- ✅ Lógica de Event Sourcing actualizada
- ✅ Integración completa con payments_node

## ✅ Solución: Usar Dockerfile.local

Para construir la imagen con el **código local actualizado**, usa:

```bash
# En lugar de:
docker build -t ordersgo .

# Usa esto:
docker build -f Dockerfile.local -t ordersgo .
```

## 📝 Diferencias

### Dockerfile (❌ NO USAR - código viejo)

```dockerfile
FROM golang:1.22.6-bullseye
WORKDIR /go/src/github.com/nmarsollier/ordersgo
# Descarga código de GitHub (viejo)
CMD ["go", "run", "/go/src/github.com/nmarsollier/ordersgo"]
```

### Dockerfile.local (✅ USAR - código actualizado)

```dockerfile
FROM golang:1.22.6-bullseye
WORKDIR /app
COPY . .  # Copia código LOCAL
RUN go build -o ordersgo .
CMD ["./ordersgo"]
```

## 🚀 Comandos Correctos

### Build

```bash
docker build -f Dockerfile.local -t ordersgo .
```

### Run

```bash
docker run -d --name ordersgo -p 3004:3004 \
  -e MONGO_URL=mongodb://host.docker.internal:27017 \
  -e RABBIT_URL=amqp://host.docker.internal \
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 \
  ordersgo
```

### Windows CMD

```cmd
docker build -f Dockerfile.local -t ordersgo .
docker run -d --name ordersgo -p 3004:3004 ^
  -e MONGO_URL=mongodb://host.docker.internal:27017 ^
  -e RABBIT_URL=amqp://host.docker.internal ^
  -e AUTH_SERVICE_URL=http://host.docker.internal:3000 ^
  ordersgo
```

## 🔍 Verificar que Funciona

Después de levantar el contenedor, verifica los logs:

```bash
docker logs ordersgo
```

Deberías ver:

```
✅ Connected to RabbitMQ
✅ Registered consumer: payment.success
✅ Registered consumer: payment.partial
✅ Registered consumer: payment.failed
✅ Registered consumer: payment.refunded
✅ Server listening on port 3004
```

Si ves estos mensajes, significa que está usando el **código actualizado correctamente** con los nuevos consumers de pagos.

## 🎯 Resumen

**SIEMPRE usa `Dockerfile.local`** para construir la imagen de ordersgo:

```bash
docker build -f Dockerfile.local -t ordersgo .
```

Esto garantiza que la imagen incluya todas las actualizaciones de integración con el microservicio de pagos.
