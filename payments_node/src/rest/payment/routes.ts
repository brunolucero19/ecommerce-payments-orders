'use strict'

import { Router } from 'express'
import * as controller from './controller'
import { validateToken } from '../middleware'

/**
 * Rutas de Payment
 *
 * Prefix: /api/payments
 *
 * Todas las rutas requieren autenticación (validateToken middleware)
 */
export function paymentRoutes(): Router {
  const router = Router()

  /**
   * POST /api/payments
   * Crear un nuevo pago
   * Requiere: Authorization header con Bearer token
   */
  router.post('/', validateToken, controller.createPayment)

  /**
   * GET /api/payments/history
   * Consultar historial de pagos del usuario autenticado
   * Requiere: Authorization header con Bearer token
   */
  router.get('/history', validateToken, controller.getPaymentHistory)

  /**
   * GET /api/payments/preferred
   * Obtener método de pago preferido del usuario autenticado
   * Requiere: Authorization header con Bearer token
   */
  router.get('/preferred', validateToken, controller.getPreferredMethod)

  /**
   * GET /api/payments/order/:orderId
   * Consultar pagos de una orden
   * Requiere: Authorization header con Bearer token
   */
  router.get('/order/:orderId', validateToken, controller.getPaymentByOrderId)

  /**
   * GET /api/payments/:id
   * Consultar pago por ID
   * Requiere: Authorization header con Bearer token
   */
  router.get('/:id', validateToken, controller.getPaymentById)

  /**
   * POST /api/payments/:id/refund
   * Reembolsar un pago aprobado
   * Requiere: Authorization header con Bearer token
   */
  router.post('/:id/refund', validateToken, controller.refundPayment)

  /**
   * PUT /api/payments/:id/approve
   * Aprobar un pago en estado PENDING
   * Requiere: Authorization header con Bearer token
   */
  router.put('/:id/approve', validateToken, controller.approvePaymentEndpoint)

  return router
}
