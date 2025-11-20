'use strict'

import { Router } from 'express'
import * as controller from './controller'
import { validateToken } from '../middleware'

/**
 * Rutas de Wallet
 */
export function walletRoutes(): Router {
  const router = Router()

  router.post('/deposit', validateToken, controller.deposit)
  router.get('/balance', validateToken, controller.getBalance)

  return router
}
