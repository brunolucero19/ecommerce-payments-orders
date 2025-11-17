# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY tslint.json ./

# Instalar todas las dependencias (incluidas devDependencies)
RUN npm install

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build-ts

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --production

# Copiar código compilado desde el stage de build
COPY --from=builder /app/dist ./dist

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar ownership de los archivos
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/server.js"]
