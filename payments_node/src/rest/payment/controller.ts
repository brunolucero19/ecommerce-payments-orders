'use strict'

import { Request, Response } from 'express'
import * as paymentService from '../../domain/payment/service'
import * as walletService from '../../domain/wallet/service'
import { ordersService } from '../../domain/orders'
import { PaymentMethod, PaymentStatus } from '../../domain/payment/payment'
import {
  CardData,
  BankTransferData,
  WalletPaymentData,
} from '../../domain/payment/valueObjects'
import { handle, ValidationError, newError } from '../../server/error'

/**
 * POST /api/payments
 *
 * Crea un nuevo pago validando los datos según el método de pago
 *
 * Body:
 * {
 *   "orderId": "order123",
 *   "userId": "user456",
 *   "amount": 1500,
 *   "method": "credit_card" | "debit_card" | "bank_transfer" | "wallet",
 *   "paymentData": {
 *     // Para tarjeta:
 *     "cardNumber": "4532015112830366",
 *     "expiryDate": "12/25",
 *     "cvv": "123",
 *     "cardHolderName": "Juan Perez"
 *
 *     // Para transferencia:
 *     "cbu": "2850590940090418135201",
 *     "alias": "JUAN.PEREZ",
 *     "bankName": "Banco Galicia"
 *
 *     // Para wallet: (no requiere paymentData adicional)
 *   }
 * }
 *
 * Response:
 * {
 *   "id": "...",
 *   "orderId": "order123",
 *   "userId": "user456",
 *   "amount": 1500,
 *   "method": "credit_card",
 *   "status": "pending",
 *   "created": "..."
 * }
 */
export async function createPayment(req: Request, res: Response) {
  try {
    // El userId y token vienen de req (inyectados por validateToken middleware)
    const userId = req.user!.id
    const token = req.token!
    const { orderId, amount, method, paymentData } = req.body

    // Validaciones básicas
    if (!orderId || !amount || !method) {
      throw new ValidationError([
        newError('body', 'orderId, amount y method son campos requeridos'),
      ])
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError([
        newError('amount', 'El monto debe ser un número mayor a 0'),
      ])
    }

    // Validar que el método de pago sea válido
    if (!Object.values(PaymentMethod).includes(method)) {
      throw new ValidationError([
        newError(
          'method',
          `Método de pago inválido. Valores permitidos: ${Object.values(
            PaymentMethod
          ).join(', ')}`
        ),
      ])
    }

    // IMPORTANTE: Validar que la orden existe en ordersgo antes de procesar el pago
    let order
    try {
      order = await ordersService.validateOrderForPayment(
        orderId,
        amount,
        token
      )
    } catch (error: any) {
      throw new ValidationError([
        newError('orderId', error.message || 'Error validando orden'),
      ])
    }

    // Validar paymentData según el método de pago
    let validatedPaymentData: any = {}

    switch (method) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        // Validar datos de tarjeta con Value Object
        if (!paymentData) {
          throw new ValidationError([
            newError(
              'paymentData',
              'Se requieren datos de tarjeta para este método de pago'
            ),
          ])
        }

        const cardData = new CardData(
          paymentData.cardNumber,
          paymentData.expiryDate,
          paymentData.cvv,
          paymentData.cardHolderName
        )

        // Guardar solo datos seguros (NO el CVV ni el número completo)
        validatedPaymentData = cardData.toStorageObject()
        break

      case PaymentMethod.BANK_TRANSFER:
        // Validar datos de transferencia con Value Object
        if (!paymentData || !paymentData.cbu) {
          throw new ValidationError([
            newError(
              'paymentData',
              'Se requiere CBU para transferencia bancaria'
            ),
          ])
        }

        const transferData = new BankTransferData(
          paymentData.cbu,
          paymentData.alias,
          paymentData.bankName
        )

        validatedPaymentData = transferData.toStorageObject()
        break

      case PaymentMethod.WALLET:
        // Validar que el usuario tenga saldo suficiente
        const walletData = new WalletPaymentData(userId)

        const hasBalance = await walletService.hasBalance(userId, amount)
        if (!hasBalance) {
          throw new ValidationError([
            newError(
              'wallet',
              'Saldo insuficiente en la wallet para procesar el pago'
            ),
          ])
        }

        validatedPaymentData = walletData.toStorageObject()
        break
    }

    // Crear el pago con información de la orden para pagos parciales
    console.log('[Controller] Creando pago con datos:', {
      orderId,
      userId,
      amount,
      method,
      totalOrderAmount: order.totalPrice,
      previousPayments: order.totalPayment,
    })

    const payment = await paymentService.createPayment({
      orderId,
      userId,
      amount,
      method,
      paymentData: validatedPaymentData,
      totalOrderAmount: order.totalPrice,
      previousPayments: order.totalPayment,
    })

    // Aprobar automáticamente según el método de pago
    let approvedPayment = payment

    switch (method) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        // Tarjetas: aprobación instantánea (ya pasó validación Luhn)
        const txnId = `CARD-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)
          .toUpperCase()}`
        approvedPayment = await paymentService.approvePayment(payment.id, txnId)
        console.log(
          `[Controller] Pago con tarjeta aprobado automáticamente: ${txnId}`
        )
        break

      case PaymentMethod.WALLET:
        // Wallet: deducir saldo y aprobar
        const withdrawSuccess = await walletService.withdraw(userId, amount)
        if (!withdrawSuccess) {
          throw new ValidationError([
            newError('wallet', 'No se pudo deducir el saldo de la wallet'),
          ])
        }
        const walletTxnId = `WALLET-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)
          .toUpperCase()}`
        approvedPayment = await paymentService.approvePayment(
          payment.id,
          walletTxnId
        )
        console.log(
          `[Controller] Pago con wallet aprobado automáticamente: ${walletTxnId}`
        )
        break

      case PaymentMethod.BANK_TRANSFER:
        // Transferencias: proceso asíncrono de confirmación (5 segundos)
        paymentService.scheduleBankTransferConfirmation(payment.id)
        console.log(
          '[Controller] Transferencia bancaria en proceso de confirmación'
        )
        break
    }

    return res.status(201).send({
      id: approvedPayment._id,
      orderId: approvedPayment.orderId,
      userId: approvedPayment.userId,
      amount: approvedPayment.amount,
      currency: approvedPayment.currency,
      method: approvedPayment.method,
      status: approvedPayment.status,
      transactionId: approvedPayment.transactionId,
      paymentData: approvedPayment.paymentData,
      partialPayment: approvedPayment.partialPayment,
      paymentNumber: approvedPayment.paymentNumber,
      totalOrderAmount: approvedPayment.totalOrderAmount,
      totalPaidSoFar: approvedPayment.totalPaidSoFar,
      remainingAmount:
        approvedPayment.totalOrderAmount - approvedPayment.totalPaidSoFar,
      created: approvedPayment.created,
      updated: approvedPayment.updated,
      message:
        method === PaymentMethod.BANK_TRANSFER
          ? 'Transferencia en proceso de confirmación'
          : approvedPayment.status === PaymentStatus.APPROVED
          ? 'Pago aprobado exitosamente'
          : undefined,
    })
  } catch (err) {
    return handle(res, err)
  }
}

/**
 * GET /api/payments/:id
 *
 * Consulta un pago por su ID
 *
 * Response:
 * {
 *   "id": "...",
 *   "orderId": "order123",
 *   "userId": "user456",
 *   "amount": 1500,
 *   "method": "credit_card",
 *   "status": "approved",
 *   "transactionId": "txn789",
 *   "created": "...",
 *   "updated": "..."
 * }
 */
export async function getPaymentById(req: Request, res: Response) {
  try {
    const { id } = req.params

    if (!id) {
      throw new ValidationError([newError('id', 'El ID del pago es requerido')])
    }

    const payment = await paymentService.findById(id)

    if (!payment) {
      return res.status(404).send({
        error: 'Pago no encontrado',
      })
    }

    return res.status(200).send({
      id: payment._id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionId,
      errorMessage: payment.errorMessage,
      errorCode: payment.errorCode,
      paymentData: payment.paymentData,
      created: payment.created,
      updated: payment.updated,
    })
  } catch (err) {
    return handle(res, err)
  }
}

/**
 * GET /api/payments/order/:orderId
 *
 * Consulta el pago asociado a una orden
 *
 * Response:
 * {
 *   "id": "...",
 *   "orderId": "order123",
 *   "userId": "user456",
 *   "amount": 1500,
 *   "status": "approved",
 *   ...
 * }
 */
export async function getPaymentByOrderId(req: Request, res: Response) {
  try {
    const { orderId } = req.params

    if (!orderId) {
      throw new ValidationError([
        newError('orderId', 'El ID de la orden es requerido'),
      ])
    }

    const payment = await paymentService.findByOrderId(orderId)

    if (!payment) {
      return res.status(404).send({
        error: 'No se encontró pago asociado a esta orden',
      })
    }

    return res.status(200).send({
      id: payment._id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionId,
      errorMessage: payment.errorMessage,
      errorCode: payment.errorCode,
      created: payment.created,
      updated: payment.updated,
    })
  } catch (err) {
    return handle(res, err)
  }
}

/**
 * GET /api/payments/history?status=xxx&limit=10&offset=0
 *
 * Consulta el historial de pagos del usuario autenticado
 *
 * Query params:
 * - status (opcional): Filtrar por estado (pending, approved, rejected, etc.)
 * - limit (opcional): Cantidad de resultados (default: 10)
 * - offset (opcional): Saltar resultados (default: 0)
 *
 * Response:
 * {
 *   "payments": [...],
 *   "total": 25,
 *   "limit": 10,
 *   "offset": 0
 * }
 */
export async function getPaymentHistory(req: Request, res: Response) {
  try {
    // El userId viene de req.user (inyectado por validateToken middleware)
    const userId = req.user!.id
    const { status, limit, offset } = req.query

    // Parsear limit y offset
    const parsedLimit = limit ? parseInt(limit as string, 10) : 10
    const parsedOffset = offset ? parseInt(offset as string, 10) : 0

    if (parsedLimit < 1 || parsedLimit > 100) {
      throw new ValidationError([
        newError('limit', 'El limit debe estar entre 1 y 100'),
      ])
    }

    if (parsedOffset < 0) {
      throw new ValidationError([
        newError('offset', 'El offset debe ser mayor o igual a 0'),
      ])
    }

    // Construir filtros
    const filters: any = { userId }
    if (status && typeof status === 'string') {
      filters.status = status
    }

    // Buscar pagos con paginación
    const payments = await paymentService.findByFilters(
      filters,
      parsedLimit,
      parsedOffset
    )

    // Contar total (para paginación en frontend)
    const total = await paymentService.countByFilters(filters)

    return res.status(200).send({
      payments: payments.map((p) => ({
        id: p._id,
        orderId: p.orderId,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        transactionId: p.transactionId,
        errorMessage: p.errorMessage,
        created: p.created,
        updated: p.updated,
      })),
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    })
  } catch (err) {
    return handle(res, err)
  }
}

/**
 * POST /api/payments/:id/refund
 *
 * Reembolsa un pago aprobado
 *
 * Body:
 * {
 *   "reason": "Producto defectuoso" // opcional
 * }
 *
 * Response:
 * {
 *   "id": "...",
 *   "orderId": "...",
 *   "status": "refunded",
 *   "amount": 1500,
 *   ...
 * }
 */
export async function refundPayment(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!id) {
      throw new ValidationError([newError('id', 'El ID del pago es requerido')])
    }

    const payment = await paymentService.refundPayment(id, reason)

    return res.status(200).send({
      id: payment._id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionId,
      created: payment.created,
      updated: payment.updated,
    })
  } catch (err) {
    return handle(res, err)
  }
}

/**
 * GET /api/payments/preferred
 *
 * Obtiene el método de pago preferido del usuario autenticado
 *
 * Response:
 * {
 *   "method": "credit_card",
 *   "lastUsed": "2025-11-16T10:30:00.000Z",
 *   "successCount": 5
 * }
 *
 * Response (sin método preferido):
 * {
 *   "message": "No hay método de pago preferido"
 * }
 */
export async function getPreferredMethod(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    // El userId viene del token (inyectado por validateToken middleware)
    const userId = req.user!.id

    const preferred = await paymentService.getPreferredMethod(userId)

    if (!preferred) {
      return res.status(200).send({
        message: 'No hay método de pago preferido',
      })
    }

    return res.status(200).send({
      method: preferred.method,
      lastUsed: preferred.lastUsed,
      successCount: preferred.successCount,
    })
  } catch (err) {
    return handle(res, err)
  }
}

/**
 * PUT /api/payments/:id/approve
 *
 * Aprueba un pago en estado PENDING
 * Útil para aprobar manualmente transferencias bancarias o pagos que requieren confirmación
 *
 * Body (opcional):
 * {
 *   "transactionId": "BANK-12345"
 * }
 *
 * Response:
 * {
 *   "id": "...",
 *   "orderId": "order123",
 *   "status": "approved",
 *   "transactionId": "BANK-12345",
 *   "message": "Pago aprobado exitosamente"
 * }
 */
export async function approvePaymentEndpoint(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const { id } = req.params
    const { transactionId } = req.body

    if (!id) {
      throw new ValidationError([newError('id', 'El ID del pago es requerido')])
    }

    // Buscar el pago
    const payment = await paymentService.findById(id)

    if (!payment) {
      throw new ValidationError([newError('payment', 'Pago no encontrado')])
    }

    // Verificar que esté en estado PENDING
    if (payment.status !== 'pending') {
      throw new ValidationError([
        newError(
          'status',
          `No se puede aprobar un pago en estado ${payment.status}. Solo se pueden aprobar pagos PENDING.`
        ),
      ])
    }

    // Generar transactionId si no se proporcionó
    const txnId =
      transactionId ||
      `MANUAL-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`

    // Aprobar el pago directamente
    const approvedPayment = await paymentService.approvePayment(id, txnId)

    return res.status(200).send({
      id: approvedPayment.id,
      orderId: approvedPayment.orderId,
      userId: approvedPayment.userId,
      amount: approvedPayment.amount,
      currency: approvedPayment.currency,
      method: approvedPayment.method,
      status: approvedPayment.status,
      transactionId: approvedPayment.transactionId,
      partialPayment: approvedPayment.partialPayment,
      paymentNumber: approvedPayment.paymentNumber,
      created: approvedPayment.created,
      updated: approvedPayment.updated,
      message: 'Pago aprobado exitosamente',
    })
  } catch (err) {
    return handle(res, err)
  }
}
