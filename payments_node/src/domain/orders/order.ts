'use strict'

/**
 * Interface que representa una orden de ordersgo
 *
 *  */
export interface Order {
  orderId: string
  status: string
  cartId: string
  totalPrice: number
  totalPayment: number
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
  status: string
}
