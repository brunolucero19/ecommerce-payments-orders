'use strict'

/**
 * Interface que representa una orden de ordersgo
 *
 * Solo incluimos los campos que necesitamos para validar pagos
 */
export interface Order {
  orderId: string
  status: string
  cartId: string
  totalPrice: number // Puede calcularse desde articles si no viene
  totalPayment: number // Puede calcularse desde payments si no viene
  created: string
  updated: string
  articles: Article[]
  payments: Payment[] | null
}

/**
 * Interface para artículos de la orden
 */
export interface Article {
  id: string
  quantity: number
  unitaryPrice: number
  valid: boolean
  validated: boolean
}

/**
 * Interface para pagos de la orden
 */
export interface Payment {
  method: string
  amount: number
}

/**
 * Estados de orden en ordersgo
 */
export enum OrderStatus {
  PLACED = 'placed',
  INVALID = 'invalid',
  VALIDATED = 'validated',
  PAYMENT_DEFINED = 'payment_defined',
  COMPLETED = 'completed',
}
