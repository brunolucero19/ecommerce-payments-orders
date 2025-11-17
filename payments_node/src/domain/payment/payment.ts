'use strict'

import { Document, model, Schema } from 'mongoose'

/**
 * Estados posibles de un pago
 */
export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
}

/**
 * Métodos de pago disponibles
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
}

/**
 * Códigos de error posibles en un pago
 */
export enum PaymentErrorCode {
  // Errores de tarjeta
  EXPIRED_CARD = 'EXPIRED_CARD',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_NUMBER = 'INVALID_NUMBER',
  INVALID_CVV = 'INVALID_CVV',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  // Errores de transferencia
  INVALID_CBU = 'INVALID_CBU',
  BANK_REJECTED = 'BANK_REJECTED',
  TIMEOUT = 'TIMEOUT',
  // Errores generales
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Interface del documento Payment en MongoDB
 */
export interface IPayment extends Document {
  orderId: string
  userId: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  transactionId?: string
  errorMessage?: string
  errorCode?: PaymentErrorCode
  paymentData?: any // Datos específicos del método de pago (encriptados en producción)
  // Campos para pagos parciales
  partialPayment: boolean // Indica si es un pago parcial
  paymentNumber: number // Número de pago (1, 2, 3, etc.)
  totalOrderAmount: number // Monto total de la orden
  totalPaidSoFar: number // Total pagado hasta este pago (acumulado)
  created: Date
  updated: Date
  // Métodos del modelo
  approve(transactionId: string): void
  reject(errorMessage: string, errorCode?: PaymentErrorCode): void
  refund(): void
}

/**
 * Esquema de Payment
 */
const PaymentSchema = new Schema(
  {
    orderId: {
      type: String,
      required: [true, 'El ID de la orden es requerido'],
      index: true,
    },
    userId: {
      type: String,
      required: [true, 'El ID del usuario es requerido'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'El monto es requerido'],
      min: [0, 'El monto debe ser mayor a 0'],
    },
    currency: {
      type: String,
      default: 'ARS',
      uppercase: true,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, 'El método de pago es requerido'],
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    transactionId: {
      type: String,
      sparse: true,
      index: true,
    },
    errorMessage: {
      type: String,
    },
    errorCode: {
      type: String,
      enum: Object.values(PaymentErrorCode),
    },
    paymentData: {
      type: Schema.Types.Mixed,
      // Almacena datos específicos según el método de pago:
      // - Tarjeta: { cardNumber (últimos 4), expiryDate, cardHolderName }
      // - Transferencia: { cbu, alias, bankName }
      // - Wallet: { walletId }
    },
    // Campos para pagos parciales
    partialPayment: {
      type: Boolean,
      default: false,
      index: true,
    },
    paymentNumber: {
      type: Number,
      default: 1,
      min: [1, 'El número de pago debe ser mayor a 0'],
    },
    totalOrderAmount: {
      type: Number,
      required: [true, 'El monto total de la orden es requerido'],
      min: [0, 'El monto total debe ser mayor a 0'],
    },
    totalPaidSoFar: {
      type: Number,
      required: [true, 'El total pagado es requerido'],
      min: [0, 'El total pagado debe ser mayor o igual a 0'],
    },
  },
  {
    collection: 'payments',
    timestamps: { createdAt: 'created', updatedAt: 'updated' },
  }
)

/**
 * Métodos del modelo
 */
PaymentSchema.methods.approve = function (transactionId: string) {
  this.status = PaymentStatus.APPROVED
  this.transactionId = transactionId
}

PaymentSchema.methods.reject = function (
  errorMessage: string,
  errorCode?: PaymentErrorCode
) {
  this.status = PaymentStatus.REJECTED
  this.errorMessage = errorMessage
  if (errorCode) {
    this.errorCode = errorCode
  }
}

PaymentSchema.methods.refund = function () {
  this.status = PaymentStatus.REFUNDED
}

export const Payment = model<IPayment>('Payment', PaymentSchema)
