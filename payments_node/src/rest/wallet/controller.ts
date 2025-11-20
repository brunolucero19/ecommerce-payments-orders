'use strict'

import { Request, Response } from 'express'
import * as walletService from '../../domain/wallet/service'
import { handle } from '../../server/error'

/**
 * POST /api/wallet/deposit
 * Deposita fondos en la wallet del usuario autenticado
 */
export async function deposit(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const { amount } = req.body

    // Validaciones básicas
    if (!amount) {
      return res.status(400).send({
        error: 'amount es requerido',
      })
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).send({
        error: 'El amount debe ser un número mayor a 0',
      })
    }

    // Depositar en la wallet
    const wallet = await walletService.deposit(userId, amount)

    return res.status(200).send({
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
      message: `Se depositaron $${amount} ${wallet.currency} exitosamente`,
    })
  } catch (err) {
    return handle(res, err)
  }
}

/**
 * GET /api/wallet/balance
 * Consulta el saldo actual de la wallet del usuario autenticado
 */
export async function getBalance(req: Request, res: Response) {
  try {
    const userId = req.user!.id

    // Obtener balance
    const balance = await walletService.getBalance(userId)

    return res.status(200).send({
      userId: userId,
      balance: balance,
      currency: 'ARS',
    })
  } catch (err) {
    return handle(res, err)
  }
}
