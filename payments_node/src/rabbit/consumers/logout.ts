'use strict'

import { RabbitClient } from '../rabbit'
import { securityService } from '../../domain/security'

/**
 * Consumer de eventos de logout desde authgo
 */

/**
 * Estructura del mensaje de logout desde authgo
 */
interface LogoutMessage {
  type?: string // 'logout'
  message: string // Token completo con "Bearer "
  correlation_id?: string
  exchange?: string
  routing_key?: string
}

/**
 * Procesa un evento de logout
 *
 * @param message - Mensaje recibido desde RabbitMQ
 */
async function processLogout(message: LogoutMessage): Promise<void> {
  try {
    console.log('[Logout Consumer] Procesando logout')

    // Extraer token del mensaje
    const token = message.message

    if (!token || typeof token !== 'string') {
      console.error(
        '[Logout Consumer] Token no presente o inválido en el mensaje'
      )
      return
    }

    // Invalidar token del caché
    securityService.invalidate(token)

    console.log(
      `[Logout Consumer] Token invalidado: ${token.substring(0, 20)}...`
    )
  } catch (error: any) {
    console.error('[Logout Consumer] Error procesando logout:', error.message)
  }
}

/**
 * Inicia el consumer de logout
 *
 * Se conecta al exchange 'auth' (fanout) y procesa mensajes de logout.
 * El nombre de la cola para este servicio es: 'payments_logout'
 */
export async function startLogoutConsumer(): Promise<void> {
  const EXCHANGE = 'auth'
  const EXCHANGE_TYPE = 'fanout'
  const QUEUE = 'payments_logout'

  try {
    console.log('[Logout Consumer] Iniciando consumer de logout...')

    await consumeFanoutQueue(EXCHANGE, EXCHANGE_TYPE, QUEUE, processLogout)

    console.log('[Logout Consumer] Consumer iniciado exitosamente')
  } catch (error: any) {
    console.error('[Logout Consumer] Error iniciando consumer:', error.message)
    setTimeout(() => {
      console.log('[Logout Consumer] Reintentando conexión...')
      startLogoutConsumer()
    }, 5000)
  }
}

/**
 * Consume mensajes de un exchange fanout
 *
 * @param exchange - Nombre del exchange
 * @param exchangeType - Tipo de exchange ('fanout')
 * @param queue - Nombre de la cola
 * @param callback - Función a ejecutar cuando llega un mensaje
 */
async function consumeFanoutQueue(
  exchange: string,
  exchangeType: string,
  queue: string,
  callback: (message: LogoutMessage) => Promise<void>
): Promise<void> {
  try {
    const channel = await RabbitClient.getChannel()

    // Declarar exchange tipo fanout (durable: false para coincidir con authgo)
    await channel.assertExchange(exchange, exchangeType, { durable: false })

    // Declarar cola (única para este servicio)
    await channel.assertQueue(queue, { durable: true })

    // Bind queue al exchange (sin routing key para fanout)
    await channel.bindQueue(queue, exchange, '')

    console.log(`[Logout Consumer] Esperando mensajes en cola ${queue}...`)

    // Consumir mensajes
    channel.consume(queue, async (msg: any) => {
      if (msg) {
        try {
          const content: LogoutMessage = JSON.parse(msg.content.toString())
          console.log(`[Logout Consumer] Mensaje recibido:`, content)

          await callback(content)
          channel.ack(msg)
        } catch (err: any) {
          console.error(
            '[Logout Consumer] Error procesando mensaje:',
            err.message
          )
          // Marcar como procesado incluso si falla (evita reintento infinito)
          channel.ack(msg)
        }
      }
    })
  } catch (err: any) {
    console.error('[Logout Consumer] Error en consumeFanoutQueue:', err.message)
    throw err
  }
}
