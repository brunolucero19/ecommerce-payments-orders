'use strict'

/**
 * Errores personalizados para el manejo de excepciones
 */

export class ValidationError extends Error {
  status: number
  messages: ErrorMessage[]

  constructor(messages: ErrorMessage[]) {
    super()
    this.status = 400
    this.messages = messages
  }
}

export interface ErrorMessage {
  path: string
  message: string
}

export function newError(path: string, message: string): ErrorMessage {
  return {
    path: path,
    message: message,
  }
}

export function handle(res: any, err: any) {
  if (err instanceof ValidationError) {
    return res.status(err.status).send(err.messages)
  }

  if (err.code === 11000) {
    return res.status(400).send({
      path: 'entity',
      message: 'Entidad duplicada',
    })
  }

  console.error(err)

  if (!err.status) {
    err = {
      status: 500,
      message: err.message ? err.message : err,
    }
  }

  return res.status(err.status).send({
    error: err.message,
  })
}
