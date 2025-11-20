'use strict'

import axios from 'axios'
import { getConfig } from '../../server/environment'
import { Order } from './order'

const config = getConfig(process.env as any)

export class OrdersService {
  private ordersServiceUrl: string

  constructor(ordersServiceUrl: string) {
    this.ordersServiceUrl = ordersServiceUrl
  }

  /**
   * Valida que una orden exista en ordersgo
   */
  async validateOrderExists(orderId: string, token: string): Promise<Order> {
    try {
      console.log(`[OrdersService] Validando orden ${orderId}...`)

      const response = await axios.get<Order>(
        `${this.ordersServiceUrl}/orders/${orderId}`,
        {
          headers: {
            Authorization: token, // Token completo con "Bearer "
          },
          timeout: 5000, // 5 segundos de timeout
        }
      )

      console.log(
        `[OrdersService] Orden ${orderId} validada exitosamente. Status: ${response.data.status}`
      )
      console.log(
        '[OrdersService] Datos de la orden:',
        JSON.stringify(response.data, null, 2)
      )

      // Calcular totalPrice si no viene en la respuesta
      if (!response.data.totalPrice && response.data.articles) {
        response.data.totalPrice = response.data.articles.reduce(
          (total, article) => total + article.unitaryPrice * article.quantity,
          0
        )
        console.log(
          `[OrdersService] totalPrice calculado: ${response.data.totalPrice}`
        )
      }

      // Calcular totalPayment si no viene en la respuesta (solo pagos aprobados)
      if (response.data.totalPayment === undefined && response.data.payments) {
        response.data.totalPayment = Array.isArray(response.data.payments)
          ? response.data.payments
              .filter((payment) => payment.status === 'approved')
              .reduce((total, payment) => total + payment.amount, 0)
          : 0
        console.log(
          `[OrdersService] totalPayment calculado: ${response.data.totalPayment} (solo pagos aprobados)`
        )
      } else if (response.data.totalPayment === undefined) {
        response.data.totalPayment = 0
        console.log('[OrdersService] totalPayment inicializado en 0')
      }

      return response.data
    } catch (error: any) {
      // Verificar si es un error de axios
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error(`Orden ${orderId} no encontrada en ordersgo`)
        }
        if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('No autorizado para acceder a esta orden')
        }
        throw new Error(
          `Error validando orden: ${
            error.response.statusText || 'Unknown error'
          }`
        )
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Servicio de órdenes no disponible')
      }
      throw new Error(`Error validando orden: ${error.message}`)
    }
  }

  /**
   * Obtiene información de una orden
   *
   * @param orderId - ID de la orden
   * @param token - Token JWT del usuario
   * @returns Promise<Order> - Información completa de la orden
   */
  async getOrder(orderId: string, token: string): Promise<Order> {
    return this.validateOrderExists(orderId, token)
  }

  /**
   * Valida que una orden pueda recibir un pago
   *
   * Verifica:
   * - La orden existe
   * - El monto del pago no excede el total de la orden
   * - La orden no está en estado inválido o cancelada
  
   */
  async validateOrderForPayment(
    orderId: string,
    paymentAmount: number,
    token: string
  ): Promise<Order> {
    const order = await this.validateOrderExists(orderId, token)

    // Validar que la orden no esté en estado inválido
    if (order.status === 'invalid') {
      throw new Error(
        `La orden ${orderId} está en estado inválido y no puede recibir pagos`
      )
    }

    // Validar que la orden no esté cancelada
    if (order.status === 'canceled') {
      throw new Error(`Esta orden fue cancelada y no puede recibir pagos`)
    }

    // Calcular el monto restante a pagar
    const remainingAmount = order.totalPrice - order.totalPayment

    // Validar que el pago no exceda el monto pendiente
    if (paymentAmount > remainingAmount) {
      throw new Error(
        `El monto del pago ($${paymentAmount}) excede el monto pendiente ($${remainingAmount})`
      )
    }

    console.log(
      `[OrdersService] Orden ${orderId} válida para pago de $${paymentAmount}`
    )
    return order
  }
}

// Instancia singleton del servicio
export const ordersService = new OrdersService(config.ordersServiceUrl)
