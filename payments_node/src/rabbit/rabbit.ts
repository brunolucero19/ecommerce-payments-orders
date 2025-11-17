'use strict'

import amqp from 'amqplib'
import * as env from '../server/environment'

const conf = env.getConfig(process.env)

/**
 * Cliente de RabbitMQ para el microservicio de pagos
 */
export class RabbitClient {
  private static connection: any = null
  private static channel: any = null

  /**
   * Obtiene la conexión a RabbitMQ
   */
  static async getConnection(): Promise<any> {
    if (!this.connection) {
      try {
        this.connection = await amqp.connect(conf.rabbitUrl)
        console.log('RabbitMQ conectado')

        this.connection.on('error', (err: Error) => {
          console.error('RabbitMQ connection error', err)
          RabbitClient.connection = null
        })

        this.connection.on('close', () => {
          console.log('RabbitMQ connection closed')
          RabbitClient.connection = null
        })
      } catch (err) {
        console.error('Error conectando a RabbitMQ:', err)
        throw err
      }
    }
    return this.connection
  }

  /**
   * Obtiene el canal de RabbitMQ
   */
  static async getChannel(): Promise<any> {
    if (!this.channel) {
      const connection = await this.getConnection()
      this.channel = await connection.createChannel()
    }
    return this.channel
  }

  /**
   * Publica un mensaje en un exchange
   */
  static async publishEvent(
    exchange: string,
    routingKey: string,
    message: any
  ): Promise<void> {
    try {
      const channel = await this.getChannel()
      await channel.assertExchange(exchange, 'topic', { durable: true })

      const messageBuffer = Buffer.from(JSON.stringify(message))
      channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        contentType: 'application/json',
      })

      console.log(
        `Evento publicado en ${exchange} con routing key ${routingKey}`
      )
    } catch (err) {
      console.error('Error publicando evento:', err)
      throw err
    }
  }

  /**
   * Consume mensajes de una cola
   */
  static async consumeQueue(
    queue: string,
    exchange: string,
    routingKey: string,
    callback: (message: any) => Promise<void>
  ): Promise<void> {
    try {
      const channel = await this.getChannel()

      await channel.assertExchange(exchange, 'topic', { durable: true })
      await channel.assertQueue(queue, { durable: true })
      await channel.bindQueue(queue, exchange, routingKey)

      console.log(`Esperando mensajes en cola ${queue}...`)

      channel.consume(queue, async (msg: any) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString())
            console.log(`Mensaje recibido de ${queue}:`, content)

            await callback(content)
            channel.ack(msg)
          } catch (err) {
            console.error('Error procesando mensaje:', err)
            channel.nack(msg, false, false)
          }
        }
      })
    } catch (err) {
      console.error('Error consumiendo cola:', err)
      throw err
    }
  }
}
