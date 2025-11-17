'use strict'

import { Router } from 'express'
import * as controller from './controller'
import { validateToken } from '../middleware'

/**
 * Rutas de Wallet
 *
 * Prefix: /api/wallet
 *
 * Todas las rutas requieren autenticación (validateToken middleware)
 */
export function walletRoutes(): Router {
  const router = Router()

  /**
   * POST /api/wallet/deposit
   * Depositar fondos en la wallet del usuario autenticado
   * Requiere: Authorization header con Bearer token
   */
  router.post('/deposit', validateToken, controller.deposit)

  /**
   * GET /api/wallet/balance
   * Consultar saldo de la wallet del usuario autenticado
   * Requiere: Authorization header con Bearer token
   */
  router.get('/balance', validateToken, controller.getBalance)

  /**
   * POST /api/wallet/refund
   * Procesar un reembolso a la wallet del usuario autenticado
   * Requiere: Authorization header con Bearer token
   */
  router.post('/refund', validateToken, controller.refund)

  return router
}
