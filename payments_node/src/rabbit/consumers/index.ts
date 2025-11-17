'use strict'

/**
 * Inicializa todos los consumers de RabbitMQ
 */
import { startLogoutConsumer } from './logout'
import { startOrderCanceledConsumer } from './orderCanceled'

/**
 * Inicia todos los consumers del microservicio
 *
 * Debe llamarse al iniciar el servidor
 */
export async function initConsumers(): Promise<void> {
  console.log('[Consumers] Iniciando consumers de RabbitMQ...')

  // Consumer de logout (invalidación de tokens)
  await startLogoutConsumer()

  // Consumer de orden cancelada (reembolso automático)
  await startOrderCanceledConsumer()

  console.log('[Consumers] Todos los consumers iniciados')
}
