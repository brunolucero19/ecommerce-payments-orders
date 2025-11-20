'use strict'

import { startLogoutConsumer } from './logout'
import { startOrderCanceledConsumer } from './orderCanceled'

/**
 * Iniciar todos los consumers del microservicio
 */
export async function initConsumers(): Promise<void> {
  console.log('[Consumers] Iniciando consumers de RabbitMQ...')

  // Consumer de logout (invalidación de tokens)
  await startLogoutConsumer()

  // Consumer de orden cancelada (reembolso automático)
  await startOrderCanceledConsumer()

  console.log('[Consumers] Todos los consumers iniciados')
}
