'use strict'

import { Document, model, Schema } from 'mongoose'
import { PaymentMethod } from '../payment/payment'

/**
 * Interface del documento PreferredPaymentMethod en MongoDB
 * Guarda el último método de pago exitoso de cada usuario
 */
export interface IPreferredPaymentMethod extends Document {
  userId: string
  method: PaymentMethod
  lastUsed: Date
  successCount: number // Cantidad de veces que usó este método con éxito
}

/**
 * Esquema de PreferredPaymentMethod
 */
const PreferredPaymentMethodSchema = new Schema(
  {
    userId: {
      type: String,
      required: [true, 'El ID del usuario es requerido'],
      unique: true,
      index: true,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, 'El método de pago es requerido'],
    },
    lastUsed: {
      type: Date,
      default: Date.now,
      index: true,
    },
    successCount: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  {
    collection: 'preferred_payment_methods',
    timestamps: { createdAt: 'created', updatedAt: 'updated' },
  }
)

export const PreferredPaymentMethod = model<IPreferredPaymentMethod>(
  'PreferredPaymentMethod',
  PreferredPaymentMethodSchema
)
