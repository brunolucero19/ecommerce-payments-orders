'use strict'

import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import compression from 'compression'
import cors from 'cors'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { Config } from './environment'
import { walletRoutes } from '../rest/wallet'
import { paymentRoutes } from '../rest/payment'
import { swaggerSpec } from './swagger'

/**
 * Inicializa y configura Express
 */
export function init(config: Config): express.Express {
  const app = express()

  // Middlewares de seguridad y utilidad
  app.use(helmet())
  app.use(compression())
  app.use(cors())
  app.use(bodyParser.json({ limit: '20mb' }))
  app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }))

  // Logger
  if (config.logLevel === 'debug') {
    app.use(morgan('dev'))
  }

  // Documentación Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  // Rutas de la API REST
  app.use('/api/wallet', walletRoutes())
  app.use('/api/payments', paymentRoutes())

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'payments' })
  })

  // Manejo de rutas no encontradas
  app.use((req: Request, res: Response) => {
    res.status(404).send({ error: 'Ruta no encontrada' })
  })

  return app
}
