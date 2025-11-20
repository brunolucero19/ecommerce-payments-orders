'use strict'

import {
  Payment,
  IPayment,
  PaymentStatus,
  PaymentMethod,
  PaymentErrorCode,
} from './payment'
import {
  PreferredPaymentMethod,
  IPreferredPaymentMethod,
} from './preferredPaymentMethod'
import { ValidationError, newError } from '../../server/error'
import {
  publishPaymentSuccess,
  publishPaymentPartial,
  publishPaymentFailed,
  publishPaymentRefunded,
} from '../../rabbit/events'
import * as walletService from '../wallet/service'

export interface CreatePaymentData {
  orderId: string
  userId: string
  amount: number
  currency?: string
  method: PaymentMethod
  paymentData?: any
  // Datos de la orden para pagos parciales
  totalOrderAmount: number
  previousPayments?: number // Total pagado en pagos anteriores
}

/**
 * Crea un nuevo pago
 */
export async function createPayment(
  data: CreatePaymentData
): Promise<IPayment> {
  // Validaciones de negocio
  validatePaymentData(data)

  // Calcular número de pago y total pagado hasta ahora
  const existingPayments = await Payment.find({
    orderId: data.orderId,
    status: PaymentStatus.APPROVED,
  }).sort({ paymentNumber: 1 })

  const paymentNumber = existingPayments.length + 1
  const previousTotal = data.previousPayments || 0
  const totalPaidSoFar = previousTotal + data.amount

  // Determinar si es pago parcial o completo
  const isPartialPayment = totalPaidSoFar < data.totalOrderAmount

  const payment = new Payment({
    orderId: data.orderId,
    userId: data.userId,
    amount: data.amount,
    currency: data.currency || 'ARS',
    method: data.method,
    status: PaymentStatus.PENDING,
    paymentData: data.paymentData,
    // Campos para pagos parciales
    partialPayment: isPartialPayment,
    paymentNumber: paymentNumber,
    totalOrderAmount: data.totalOrderAmount,
    totalPaidSoFar: totalPaidSoFar,
  })

  return await payment.save()
}

/**
 * Busca un pago por ID
 */
export async function findById(paymentId: string): Promise<IPayment | null> {
  return await Payment.findById(paymentId)
}

/**
 * Busca todos los pagos por orderId (ordenados por número de pago)
 */
export async function findAllByOrderId(orderId: string): Promise<IPayment[]> {
  return await Payment.find({ orderId }).sort({ paymentNumber: 1 })
}

/**
 * Busca pagos por userId
 */
export async function findByUserId(userId: string): Promise<IPayment[]> {
  return await Payment.find({ userId }).sort({ created: -1 })
}

/**
 * Busca todos los pagos aprobados para una orden
 */
export async function findApprovedPaymentsByOrder(
  orderId: string
): Promise<IPayment[]> {
  return await Payment.find({
    orderId,
    status: PaymentStatus.APPROVED,
  }).sort({ paymentNumber: 1 })
}

/**
 * Aprueba un pago y publica evento de éxito
 */
export async function approvePayment(
  paymentId: string,
  transactionId: string
): Promise<IPayment> {
  const payment = await findById(paymentId)

  if (!payment) {
    throw new ValidationError([newError('payment', 'Pago no encontrado')])
  }

  if (payment.status !== PaymentStatus.PENDING) {
    throw new ValidationError([
      newError('status', 'El pago debe estar en estado PENDING'),
    ])
  }

  payment.approve(transactionId)
  const savedPayment = await payment.save()

  // Guardar método preferido cuando el pago es exitoso
  await savePreferredMethod(savedPayment.userId)

  // Publicar evento según si es pago parcial o completo
  try {
    if (savedPayment.partialPayment) {
      // Pago parcial: aún queda saldo por pagar
      await publishPaymentPartial(savedPayment)
      console.log(
        `[PaymentService] Pago parcial #${savedPayment.paymentNumber} aprobado. ` +
          `Total pagado: $${savedPayment.totalPaidSoFar} de $${savedPayment.totalOrderAmount}`
      )
    } else {
      // Pago completo: orden totalmente pagada
      await publishPaymentSuccess(savedPayment)
      console.log(
        `[PaymentService] Orden completamente pagada con pago #${savedPayment.paymentNumber}`
      )
    }
  } catch (error) {
    console.error('[PaymentService] Error al publicar evento de pago:', error)
  }

  return savedPayment
}

/**
 * Rechaza un pago y publica evento de fallo
 */
export async function rejectPayment(
  paymentId: string,
  errorMessage: string,
  errorCode?: PaymentErrorCode
): Promise<IPayment> {
  const payment = await findById(paymentId)

  if (!payment) {
    throw new ValidationError([newError('payment', 'Pago no encontrado')])
  }

  payment.reject(errorMessage, errorCode)
  const savedPayment = await payment.save()

  // Publicar evento de pago fallido
  try {
    await publishPaymentFailed(savedPayment)
  } catch (error) {
    console.error(
      '[PaymentService] Error al publicar evento payment.failed:',
      error
    )
  }

  return savedPayment
}

/**
 * Programa la confirmación de una transferencia bancaria
 * Simula el proceso asíncrono de confirmación del banco (5 segundos fue lo que elegí)
 */
export async function scheduleBankTransferConfirmation(
  paymentId: string
): Promise<void> {
  // Simular delay de confirmación bancaria (5 segundos fue lo que elegí)
  setTimeout(async () => {
    try {
      const payment = await findById(paymentId)

      if (!payment) {
        console.error(`[BankTransfer] Pago ${paymentId} no encontrado`)
        return
      }

      // Si el pago ya no está PENDING, no hacer nada
      if (payment.status !== PaymentStatus.PENDING) {
        console.log(
          `[BankTransfer] Pago ${paymentId} ya no está PENDING (estado: ${payment.status})`
        )
        return
      }

      // Simular 90% éxito, 10% rechazo
      const isApproved = Math.random() > 0.1

      if (isApproved) {
        // Aprobar transferencia
        const transactionId = `BANK-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)
          .toUpperCase()}`

        // Aprobar directamente
        await approvePayment(paymentId, transactionId)

        console.log(
          `[BankTransfer] Transferencia ${paymentId} confirmada exitosamente. Transaction ID: ${transactionId}`
        )
      } else {
        // Rechazar transferencia
        await rejectPayment(
          paymentId,
          'Transferencia rechazada por el banco',
          PaymentErrorCode.BANK_REJECTED
        )

        console.log(`[BankTransfer] Transferencia ${paymentId} rechazada`)
      }
    } catch (error) {
      console.error(
        `[BankTransfer] Error procesando confirmación del pago ${paymentId}:`,
        error
      )
    }
  }, 5000) // 5 segundos para testing
}

/**
 * Reembolsa un pago aprobado y publica evento de reembolso
 */
export async function refundPayment(
  paymentId: string,
  reason?: string
): Promise<IPayment> {
  const payment = await findById(paymentId)

  if (!payment) {
    throw new ValidationError([newError('payment', 'Pago no encontrado')])
  }

  if (payment.status !== PaymentStatus.APPROVED) {
    throw new ValidationError([
      newError('status', 'Solo se pueden reembolsar pagos aprobados'),
    ])
  }

  // Si el pago fue con wallet, devolver el dinero
  if (payment.method === PaymentMethod.WALLET) {
    try {
      console.log(
        `[PaymentService] Devolviendo ${payment.amount} ${payment.currency} a wallet del usuario ${payment.userId}`
      )
      await walletService.deposit(payment.userId, payment.amount)
      console.log('[PaymentService] Saldo devuelto exitosamente a wallet')
    } catch (error) {
      console.error('[PaymentService] Error al devolver saldo a wallet:', error)
      throw new ValidationError([
        newError('wallet', 'Error al devolver el saldo a la wallet'),
      ])
    }
  }

  // Cambiar estado a refunded usando el método del modelo
  payment.refund()
  const savedPayment = await payment.save()

  // Publicar evento de pago reembolsado
  try {
    await publishPaymentRefunded(savedPayment, reason)
  } catch (error) {
    console.error(
      '[PaymentService] Error al publicar evento payment.refunded:',
      error
    )
  }

  return savedPayment
}

/**
 * Validaciones de negocio para crear un pago
 */
function validatePaymentData(data: CreatePaymentData): void {
  const errors = []

  if (!data.orderId || data.orderId.trim().length === 0) {
    errors.push(newError('orderId', 'El ID de la orden es requerido'))
  }

  if (!data.userId || data.userId.trim().length === 0) {
    errors.push(newError('userId', 'El ID del usuario es requerido'))
  }

  if (!data.amount || data.amount <= 0) {
    errors.push(newError('amount', 'El monto debe ser mayor a 0'))
  }

  if (!data.method) {
    errors.push(newError('method', 'El método de pago es requerido'))
  }

  if (errors.length > 0) {
    throw new ValidationError(errors)
  }
}

/**
 * Busca pagos con filtros y paginación
 */
export async function findByFilters(
  filters: any,
  limit: number = 10,
  offset: number = 0
): Promise<IPayment[]> {
  return await Payment.find(filters)
    .sort({ created: -1 })
    .limit(limit)
    .skip(offset)
}

/**
 * Cuenta pagos que coinciden con los filtros
 */
export async function countByFilters(filters: any): Promise<number> {
  return await Payment.countDocuments(filters)
}

/**
 * Guarda o actualiza el método de pago preferido del usuario
 * Se llama automáticamente cuando un pago es exitoso
 *
 * Determina el método preferido contando los pagos aprobados por método
 */
export async function savePreferredMethod(userId: string): Promise<void> {
  try {
    // Contar pagos aprobados por cada método para este usuario
    const paymentsByMethod = await Payment.aggregate([
      {
        $match: {
          userId,
          status: PaymentStatus.APPROVED,
        },
      },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          lastUsed: {
            $max: {
              $ifNull: ['$updated', '$created'],
            },
          },
        },
      },
      {
        $sort: { count: -1, lastUsed: -1 },
      },
    ])

    if (paymentsByMethod.length === 0) {
      return // No hay pagos aprobados aún
    }

    // El método preferido es el que tiene más pagos aprobados
    const preferred = paymentsByMethod[0]

    const existing = await PreferredPaymentMethod.findOne({ userId })

    if (existing) {
      // Actualizar método existente con el más usado
      existing.method = preferred._id
      existing.lastUsed = preferred.lastUsed
      existing.successCount = preferred.count
      await existing.save()
    } else {
      // Crear nuevo registro
      const newPreferred = new PreferredPaymentMethod({
        userId,
        method: preferred._id,
        lastUsed: preferred.lastUsed,
        successCount: preferred.count,
      })
      await newPreferred.save()
    }
  } catch (error) {
    console.error('[PreferredMethod] Error guardando método preferido:', error)
  }
}

/**
 * Obtiene el método de pago preferido del usuario
 */
export async function getPreferredMethod(
  userId: string
): Promise<IPreferredPaymentMethod | null> {
  return await PreferredPaymentMethod.findOne({ userId })
}
