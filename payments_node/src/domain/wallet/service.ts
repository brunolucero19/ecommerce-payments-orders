'use strict'

import { Wallet, IWallet } from './wallet'
import { ValidationError, newError } from '../../server/error'

/**
 * Servicio de dominio para Wallet
 * Contiene la lógica de negocio relacionada con la billetera virtual
 */

/**
 * Obtiene o crea la wallet de un usuario
 */
export async function getOrCreateWallet(userId: string): Promise<IWallet> {
  if (!userId || userId.trim().length === 0) {
    throw new ValidationError([
      newError('userId', 'El ID del usuario es requerido'),
    ])
  }

  let wallet = await Wallet.findOne({ userId })

  if (!wallet) {
    // Crear nueva wallet si no existe
    wallet = new Wallet({
      userId,
      balance: 0,
      currency: 'ARS',
    })
    await wallet.save()
  }

  return wallet
}

/**
 * Obtiene el saldo de un usuario
 */
export async function getBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateWallet(userId)
  return wallet.balance
}

/**
 * Deposita fondos en la wallet
 */
export async function deposit(
  userId: string,
  amount: number
): Promise<IWallet> {
  if (amount <= 0) {
    throw new ValidationError([
      newError('amount', 'El monto a depositar debe ser mayor a 0'),
    ])
  }

  const wallet = await getOrCreateWallet(userId)
  wallet.deposit(amount)
  await wallet.save()

  return wallet
}

/**
 * Retira fondos de la wallet
 * Retorna true si la operación fue exitosa
 */
export async function withdraw(
  userId: string,
  amount: number
): Promise<boolean> {
  if (amount <= 0) {
    throw new ValidationError([
      newError('amount', 'El monto a retirar debe ser mayor a 0'),
    ])
  }

  const wallet = await getOrCreateWallet(userId)
  const success = wallet.withdraw(amount)

  if (success) {
    await wallet.save()
  }

  return success
}

/**
 * Verifica si un usuario tiene saldo suficiente
 */
export async function hasBalance(
  userId: string,
  amount: number
): Promise<boolean> {
  const wallet = await getOrCreateWallet(userId)
  return wallet.hasBalance(amount)
}
