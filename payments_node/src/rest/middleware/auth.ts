'use strict'

import { Request, Response, NextFunction } from 'express'
import { securityService } from '../../domain/security'
import { User } from '../../domain/security/user'

/**
 * Extender la interfaz de Express Request para incluir el usuario autenticado
 */
declare global {
  namespace Express {
    interface Request {
      user?: User
      token?: string
    }
  }
}

/**
 * Middleware de autenticación para Express
 *
 * Valida el token JWT del header Authorization y obtiene información del usuario.
 * Si el token es válido, agrega el usuario a req.user y el token a req.token.
 * Si el token es inválido, retorna 401 Unauthorized.
 */
export async function validateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Obtener token del header Authorization
    const authHeader = req.headers.authorization

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header is required',
      })
      return
    }

    // 2. Validar formato "Bearer {token}"
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0].toUpperCase() !== 'BEARER') {
      res.status(401).json({
        error: 'Unauthorized',
        message:
          'Invalid Authorization header format. Expected: Bearer {token}',
      })
      return
    }

    const token = authHeader // Guardar token completo con "Bearer "

    // 3. Validar token con SecurityService (usa caché)
    const user = await securityService.validate(token)

    // 4. Agregar usuario y token al request para uso en handlers
    req.user = user
    req.token = token

    // 5. Continuar con el siguiente middleware/handler
    next()
  } catch (error: any) {
    // Token inválido, expirado, o servicio de auth no disponible
    console.error('[Auth Middleware] Error validating token:', error.message)
    res.status(401).json({
      error: 'Unauthorized',
      message: error.message || 'Invalid or expired token',
    })
  }
}
