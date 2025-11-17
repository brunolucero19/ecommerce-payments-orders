'use strict'

import mongoose from 'mongoose'
import * as env from './server/environment'
import { Config } from './server/environment'
import * as express from './server/express'
import { initConsumers } from './rabbit/consumers'

// Variables de entorno
const conf: Config = env.getConfig(process.env)

// Mejoramos el log de las promesas
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
})

// Establecemos conexión con MongoDB
mongoose
  .connect(conf.mongoDb)
  .then(() => {
    console.log('MongoDB conectado.')
  })
  .catch((err: Error) => {
    console.error('No se pudo conectar a MongoDB!')
    console.error(err.message)
    process.exit(1)
  })

// Se configura e inicia express
const app = express.init(conf)

app.listen(conf.port, () => {
  console.log(`Payments Server escuchando en puerto ${conf.port}`)
})

// Iniciar consumers de RabbitMQ
initConsumers().catch((err) => {
  console.error('Error iniciando consumers de RabbitMQ:', err)
  // No detener el servidor si falla RabbitMQ
  // Los consumers intentarán reconectar automáticamente
})

module.exports = app
