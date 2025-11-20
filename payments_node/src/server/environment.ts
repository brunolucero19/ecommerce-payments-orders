'use strict'

import dotenv from 'dotenv'
let config: Config

/**
 * Configuración del servidor de pagos
 * Todas las configuraciones del servidor se encuentran en este módulo.
 */
export function getConfig(environment: any): Config {
  if (!config) {
    // El archivo .env es un archivo que si esta presente se leen las propiedades
    // desde ese archivo, sino se toman estas de aca para entorno dev.
    dotenv.config({ path: '.env' })

    config = {
      port: process.env.SERVER_PORT || '3005',
      logLevel: process.env.LOG_LEVEL || 'debug',
      mongoDb: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/payments_db',
      jwtSecret: process.env.JWT_SECRET || '+b59WQF+kUDr0TGxevzpRV3ixMvyIQuD1O',
      rabbitUrl: process.env.RABBIT_URL || 'amqp://localhost',
      authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
      ordersServiceUrl:
        process.env.ORDERS_SERVICE_URL || 'http://localhost:3004',
    }

    // Validar configuración crítica
    validateConfig(config)
  }
  return config
}

/**
 * Valida que la configuración tenga valores válidos
 * Lanza error si alguna variable crítica está mal configurada
 */
function validateConfig(cfg: Config): void {
  const errors: string[] = []

  // Validar puerto
  const port = parseInt(cfg.port, 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(
      `SERVER_PORT inválido: ${cfg.port}. Debe ser un número entre 1 y 65535`
    )
  }

  // Validar MongoDB URL
  if (
    !cfg.mongoDb.startsWith('mongodb://') &&
    !cfg.mongoDb.startsWith('mongodb+srv://')
  ) {
    errors.push(
      `MONGO_URL inválido: ${cfg.mongoDb}. Debe comenzar con mongodb:// o mongodb+srv://`
    )
  }

  // Validar RabbitMQ URL
  if (
    !cfg.rabbitUrl.startsWith('amqp://') &&
    !cfg.rabbitUrl.startsWith('amqps://')
  ) {
    errors.push(
      `RABBIT_URL inválido: ${cfg.rabbitUrl}. Debe comenzar con amqp:// o amqps://`
    )
  }

  // Validar JWT Secret (al menos 20 caracteres para seguridad mínima)
  if (cfg.jwtSecret.length < 20) {
    errors.push(
      'JWT_SECRET muy corto. Debe tener al menos 20 caracteres para seguridad'
    )
  }

  // Validar URLs de servicios
  if (
    !cfg.authServiceUrl.startsWith('http://') &&
    !cfg.authServiceUrl.startsWith('https://')
  ) {
    errors.push(
      `AUTH_SERVICE_URL inválido: ${cfg.authServiceUrl}. Debe comenzar con http:// o https://`
    )
  }

  if (
    !cfg.ordersServiceUrl.startsWith('http://') &&
    !cfg.ordersServiceUrl.startsWith('https://')
  ) {
    errors.push(
      `ORDERS_SERVICE_URL inválido: ${cfg.ordersServiceUrl}. Debe comenzar con http:// o https://`
    )
  }

  // Validar log level
  const validLogLevels = ['debug', 'info', 'warn', 'error']
  if (!validLogLevels.includes(cfg.logLevel.toLowerCase())) {
    errors.push(
      `LOG_LEVEL inválido: ${
        cfg.logLevel
      }. Debe ser uno de: ${validLogLevels.join(', ')}`
    )
  }

  // Si hay errores, lanzar excepción con todos los mensajes
  if (errors.length > 0) {
    console.error('Error en la configuración de variables de entorno:')
    errors.forEach((error) => console.error(`   - ${error}`))
    console.error(
      '\nRevisa el archivo .env o las variables de entorno del sistema'
    )
    console.error('Consulta .env.example para ver la configuración esperada\n')
    throw new Error('Configuración inválida. Ver errores arriba.')
  }

  // Log de configuración exitosa (solo en debug)
  if (cfg.logLevel === 'debug') {
    console.log('Configuración cargada exitosamente:')
    console.log(`   - Puerto: ${cfg.port}`)
    console.log(`   - Log Level: ${cfg.logLevel}`)
    console.log(`   - MongoDB: ${maskSensitiveUrl(cfg.mongoDb)}`)
    console.log(`   - RabbitMQ: ${maskSensitiveUrl(cfg.rabbitUrl)}`)
    console.log(`   - Auth Service: ${cfg.authServiceUrl}`)
    console.log(`   - Orders Service: ${cfg.ordersServiceUrl}`)
    console.log(`   - JWT Secret: ${cfg.jwtSecret.substring(0, 10)}...****\n`)
  }
}

/**
 * Enmascara credenciales en URLs para logging seguro
 */
function maskSensitiveUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    if (urlObj.username || urlObj.password) {
      return `${urlObj.protocol}//*****:*****@${urlObj.host}${urlObj.pathname}`
    }
    return url
  } catch {
    // Si no es una URL válida, devolver tal cual
    return url
  }
}

export interface Config {
  port: string
  logLevel: string
  mongoDb: string
  jwtSecret: string
  rabbitUrl: string
  authServiceUrl: string
  ordersServiceUrl: string
}
