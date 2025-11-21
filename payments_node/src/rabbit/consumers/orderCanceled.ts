'use strict'

import { RabbitClient } from '../rabbit'
import { PaymentMethod, PaymentStatus } from '../../domain/payment/payment'
import * as paymentService from '../../domain/payment/service'
import * as walletService from '../../domain/wallet/service'
import { publishPaymentRefunded } from '../events/publishers'

const EXCHANGE = 'payments_exchange'
const ROUTING_KEY = 'order.canceled'
const QUEUE = 'payments_order_canceled'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface OrderCanceledEvent {
  orderId: string
  userId: string
  canceledAt: string
  reason?: string
}

/**
 * Procesa un evento de orden cancelada y reembolsa todos los pagos aprobados.
 */
async function processOrderCanceled(event: any): Promise<void> {
  const { orderId, reason } = event.message || event

  console.log(`[OrderCanceled] Procesando cancelación de orden ${orderId}`)

  try {
    // Buscar todos los pagos aprobados para esta orden
    const approvedPayments = await paymentService.findApprovedPaymentsByOrder(
      orderId
    )

    if (approvedPayments.length === 0) {
      console.log(
        `[OrderCanceled] No hay pagos aprobados para la orden ${orderId}`
      )
      return
    }

    console.log(
      `[OrderCanceled] Encontrados ${approvedPayments.length} pagos aprobados para reembolsar`
    )

    // Reembolsar cada pago individualmente con reintentos
    for (const payment of approvedPayments) {
      await refundPaymentWithRetry(
        (payment._id as any).toString(),
        reason || 'Orden cancelada'
      )
    }

    console.log(
      `[OrderCanceled] Completado procesamiento de cancelación para orden ${orderId}`
    )
  } catch (error) {
    console.error(
      `[OrderCanceled] Error procesando cancelación de orden ${orderId}:`,
      error
    )
    throw error // Re-lanzar para que RabbitMQ sepa que falló
  }
}

/**
 * Reembolsa un pago con lógica de reintentos.
 */
async function refundPaymentWithRetry(
  paymentId: string,
  reason: string,
  attempt: number = 1
): Promise<void> {
  try {
    console.log(
      `[OrderCanceled] Reembolsando pago ${paymentId} (intento ${attempt}/${MAX_RETRIES})`
    )

    // Obtener el pago
    const payment = await paymentService.findById(paymentId)

    if (!payment) {
      console.error(`[OrderCanceled] Pago ${paymentId} no encontrado`)
      return
    }

    // Verificar que esté aprobado
    if (payment.status !== PaymentStatus.APPROVED) {
      console.warn(
        `[OrderCanceled] Pago ${paymentId} no está aprobado (estado: ${payment.status}), saltando`
      )
      return
    }

    // Reembolsar el pago (esto ya maneja wallet/tarjeta y publica el evento)
    await paymentService.refundPayment(paymentId, reason)

    console.log(`[OrderCanceled] Pago ${paymentId} reembolsado exitosamente`)
  } catch (error) {
    console.error(
      `[OrderCanceled] Error reembolsando pago ${paymentId} (intento ${attempt}):`,
      error
    )

    // Reintentar si no hemos llegado al máximo
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1) // Backoff exponencial
      console.log(`[OrderCanceled] Reintentando en ${delay}ms...`)

      await new Promise((resolve) => setTimeout(resolve, delay))
      await refundPaymentWithRetry(paymentId, reason, attempt + 1)
    } else {
      // Ya agotamos los reintentos
      console.error(
        `[OrderCanceled] Agotados reintentos para pago ${paymentId}. Requiere intervención manual.`
      )
    }
  }
}

/**
 * Inicia el consumer de orden cancelada.
 */
export async function startOrderCanceledConsumer(): Promise<void> {
  try {
    console.log('[OrderCanceled] Iniciando consumer de orden cancelada...')

    const channel = await RabbitClient.getChannel()

    // Asegurar que el exchange existe (ya se crea en initializeExchanges)
    await channel.assertExchange(EXCHANGE, 'topic', { durable: false })

    // Crear la cola
    await channel.assertQueue(QUEUE, { durable: true })

    // Bindear la cola al exchange con el routing key
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY)

    console.log(`[OrderCanceled] Esperando eventos en ${QUEUE}...`)

    // Consumir mensajes
    await channel.consume(
      QUEUE,
      async (msg: any) => {
        if (!msg) {
          return
        }

        try {
          const event = JSON.parse(msg.content.toString())
          console.log(`[OrderCanceled] Evento recibido:`, event)

          await processOrderCanceled(event)

          // Acknowledge del mensaje
          channel.ack(msg)
        } catch (error) {
          console.error('[OrderCanceled] Error procesando mensaje:', error)
          // NACK sin requeue - el mensaje va a dead letter si está configurado
          // o se descarta definitivamente
          channel.nack(msg, false, false)
        }
      },
      { noAck: false }
    )

    console.log('[OrderCanceled] Consumer iniciado exitosamente')
  } catch (error) {
    console.error('[OrderCanceled] Error iniciando consumer:', error)
    // Reintentar conexión después de 5 segundos
    setTimeout(() => {
      console.log('[OrderCanceled] Reintentando conexión...')
      startOrderCanceledConsumer()
    }, 5000)
  }
}
