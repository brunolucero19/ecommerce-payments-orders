'use strict'

import { RabbitClient } from '../rabbit'
import { IPayment } from '../../domain/payment/payment'

const EXCHANGE_NAME = 'payments_exchange'

/**
 * Routing keys para los eventos de pagos
 */
export const PaymentEvents = {
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_PARTIAL: 'payment.partial',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_CANCELED: 'payment.canceled',
}

/**
 * Publica evento de pago exitoso
 *
 * Este evento notifica a otros microservicios (ordersgo) que un pago fue aprobado
 * para que puedan actualizar el estado de la orden.
 *
 * @param payment - El pago aprobado
 */
export async function publishPaymentSuccess(payment: IPayment): Promise<void> {
  try {
    // Estructura que espera commongo/rbt.ConsumeRabbitEvent
    const envelope = {
      message: {
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        transactionId: payment.transactionId,
        timestamp: new Date().toISOString(),
      },
      correlation_id: '', // Se puede agregar un ID único si es necesario
      exchange: EXCHANGE_NAME,
      routing_key: PaymentEvents.PAYMENT_SUCCESS,
    }

    await RabbitClient.publishEvent(
      EXCHANGE_NAME,
      PaymentEvents.PAYMENT_SUCCESS,
      envelope
    )

    console.log(
      `[RabbitMQ] Evento publicado: ${PaymentEvents.PAYMENT_SUCCESS}`,
      {
        paymentId: payment.id,
        orderId: payment.orderId,
      }
    )
  } catch (error) {
    console.error(`[RabbitMQ] Error al publicar evento payment_success:`, error)
    throw error
  }
}

/**
 * Publica evento de pago parcial
 *
 * Este evento notifica a ordersgo que se ha procesado un pago parcial
 * y que aún queda saldo pendiente por pagar.
 *
 * @param payment - El pago parcial aprobado
 */
export async function publishPaymentPartial(payment: IPayment): Promise<void> {
  try {
    const envelope = {
      message: {
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        transactionId: payment.transactionId,
        paymentNumber: payment.paymentNumber,
        totalOrderAmount: payment.totalOrderAmount,
        totalPaidSoFar: payment.totalPaidSoFar,
        remainingAmount: payment.totalOrderAmount - payment.totalPaidSoFar,
        timestamp: new Date().toISOString(),
      },
      correlation_id: '',
      exchange: EXCHANGE_NAME,
      routing_key: PaymentEvents.PAYMENT_PARTIAL,
    }

    await RabbitClient.publishEvent(
      EXCHANGE_NAME,
      PaymentEvents.PAYMENT_PARTIAL,
      envelope
    )

    console.log(
      `[RabbitMQ] Evento publicado: ${PaymentEvents.PAYMENT_PARTIAL}`,
      {
        paymentId: payment.id,
        orderId: payment.orderId,
        paymentNumber: payment.paymentNumber,
        totalPaidSoFar: payment.totalPaidSoFar,
        remainingAmount: payment.totalOrderAmount - payment.totalPaidSoFar,
      }
    )
  } catch (error) {
    console.error(`[RabbitMQ] Error al publicar evento payment_partial:`, error)
    throw error
  }
}

/**
 * Publica evento de pago fallido
 *
 * Este evento notifica que un pago fue rechazado para que ordersgo
 * pueda marcar la orden como fallida.
 *
 * @param payment - El pago rechazado
 */
export async function publishPaymentFailed(payment: IPayment): Promise<void> {
  try {
    const envelope = {
      message: {
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        errorCode: payment.errorCode,
        errorMessage: payment.errorMessage,
        timestamp: new Date().toISOString(),
      },
      correlation_id: '',
      exchange: EXCHANGE_NAME,
      routing_key: PaymentEvents.PAYMENT_FAILED,
    }

    await RabbitClient.publishEvent(
      EXCHANGE_NAME,
      PaymentEvents.PAYMENT_FAILED,
      envelope
    )

    console.log(
      `[RabbitMQ] Evento publicado: ${PaymentEvents.PAYMENT_FAILED}`,
      {
        paymentId: payment.id,
        orderId: payment.orderId,
        errorCode: payment.errorCode,
      }
    )
  } catch (error) {
    console.error(`[RabbitMQ] Error al publicar evento payment_failed:`, error)
    throw error
  }
}

/**
 * Publica evento de pago reembolsado
 *
 * Este evento notifica que un pago fue reembolsado (por cancelación de orden,
 * devolución de producto, etc.)
 *
 * @param payment - El pago reembolsado
 * @param reason - Motivo del reembolso
 */
export async function publishPaymentRefunded(
  payment: IPayment,
  reason?: string
): Promise<void> {
  try {
    const envelope = {
      message: {
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        reason: reason || 'Refund processed',
        timestamp: new Date().toISOString(),
      },
      correlation_id: '',
      exchange: EXCHANGE_NAME,
      routing_key: PaymentEvents.PAYMENT_REFUNDED,
    }

    await RabbitClient.publishEvent(
      EXCHANGE_NAME,
      PaymentEvents.PAYMENT_REFUNDED,
      envelope
    )

    console.log(
      `[RabbitMQ] Evento publicado: ${PaymentEvents.PAYMENT_REFUNDED}`,
      {
        paymentId: payment.id,
        orderId: payment.orderId,
        reason,
      }
    )
  } catch (error) {
    console.error(
      `[RabbitMQ] Error al publicar evento payment_refunded:`,
      error
    )
    throw error
  }
}

/**
 * Publica evento de pago cancelado
 *
 * Este evento notifica que un pago fue cancelado antes de ser procesado.
 *
 * @param payment - El pago cancelado
 */
export async function publishPaymentCanceled(payment: IPayment): Promise<void> {
  try {
    const message = {
      paymentId: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      timestamp: new Date().toISOString(),
    }

    await RabbitClient.publishEvent(
      EXCHANGE_NAME,
      PaymentEvents.PAYMENT_CANCELED,
      message
    )

    console.log(
      `[RabbitMQ] Evento publicado: ${PaymentEvents.PAYMENT_CANCELED}`,
      {
        paymentId: payment.id,
        orderId: payment.orderId,
      }
    )
  } catch (error) {
    console.error(
      `[RabbitMQ] Error al publicar evento payment_canceled:`,
      error
    )
    throw error
  }
}
