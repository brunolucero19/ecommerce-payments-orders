'use strict'

import { Router } from 'express'
import * as controller from './controller'
import { validateToken } from '../middleware'

/**
 * Rutas de Payment
 */
export function paymentRoutes(): Router {
  const router = Router()

  router.post('/', validateToken, controller.createPayment)

  router.get('/history', validateToken, controller.getPaymentHistory)

  router.get('/preferred', validateToken, controller.getPreferredMethod)

  router.get('/order/:orderId', validateToken, controller.getPaymentsByOrderId)

  router.get('/:id', validateToken, controller.getPaymentById)

  router.post('/:id/refund', validateToken, controller.refundPayment)

  router.put('/:id/approve', validateToken, controller.approvePaymentEndpoint)

  return router
}
