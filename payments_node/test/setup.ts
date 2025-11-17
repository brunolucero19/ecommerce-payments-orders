/**
 * Setup global para tests
 */

// Mock de variables de entorno para tests
process.env.NODE_ENV = 'test'
process.env.PORT = '3005'
process.env.MONGODB_URI = 'mongodb://localhost:27018/payments_test'
process.env.RABBITMQ_URL = 'amqp://localhost'
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.AUTH_SERVICE_URL = 'http://localhost:3000'
process.env.ORDERS_SERVICE_URL = 'http://localhost:3004'
process.env.LOG_LEVEL = 'error'

// Suprimir logs durante tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
