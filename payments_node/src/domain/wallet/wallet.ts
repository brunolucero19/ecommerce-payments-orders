'use strict'

import { Document, model, Schema } from 'mongoose'

/**
 * Interface del documento Wallet en MongoDB
 * Cada usuario tiene una wallet con saldo disponible
 */
export interface IWallet extends Document {
  userId: string
  balance: number
  currency: string
  created: Date
  updated: Date
  // Métodos del modelo
  deposit(amount: number): void
  withdraw(amount: number): boolean
  hasBalance(amount: number): boolean
}

/**
 * Esquema de Wallet
 */
const WalletSchema = new Schema(
  {
    userId: {
      type: String,
      required: [true, 'El ID del usuario es requerido'],
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'El saldo no puede ser negativo'],
    },
    currency: {
      type: String,
      default: 'ARS',
      uppercase: true,
    },
  },
  {
    collection: 'wallets',
    timestamps: { createdAt: 'created', updatedAt: 'updated' },
  }
)

/**
 * Acredita fondos a la wallet
 */
WalletSchema.methods.deposit = function (amount: number) {
  if (amount <= 0) {
    throw new Error('El monto a depositar debe ser mayor a 0')
  }
  this.balance += amount
}

/**
 * Descuenta fondos de la wallet
 * Retorna true si la operación fue exitosa, false si no hay fondos suficientes
 */
WalletSchema.methods.withdraw = function (amount: number): boolean {
  if (amount <= 0) {
    throw new Error('El monto a retirar debe ser mayor a 0')
  }

  if (this.balance < amount) {
    return false // Fondos insuficientes
  }

  this.balance -= amount
  return true
}

/**
 * Verifica si la wallet tiene saldo suficiente
 */
WalletSchema.methods.hasBalance = function (amount: number): boolean {
  return this.balance >= amount
}

export const Wallet = model<IWallet>('Wallet', WalletSchema)
