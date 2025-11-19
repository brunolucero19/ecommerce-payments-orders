'use strict'

import axios from 'axios'
import { User } from './user'

/**
 * Interfaz de respuesta de authgo
 */
interface AuthUserResponse {
  id: string
  name: string
  login: string
}

/**
 * Type guard para verificar si un error es de axios
 */
function isAxiosError(error: any): boolean {
  return error.isAxiosError === true
}

/**
 * Repository que se comunica con authgo para validar tokens
 *
 * Hace llamadas HTTP al servicio de autenticación para obtener
 * información del usuario a partir de un token JWT.
 */
export class SecurityRepository {
  private authServiceUrl: string

  constructor(authServiceUrl: string) {
    this.authServiceUrl = authServiceUrl
  }

  /**
   * Valida un token JWT contra authgo
   *
   * @param token - Token JWT completo (incluyendo "Bearer ")
   * @returns Promise<User> - Información del usuario si el token es válido
   * @throws Error si el token es inválido o authgo no responde
   */
  async validateToken(token: string): Promise<User> {
    try {
      const response = await axios.get<AuthUserResponse>(
        `${this.authServiceUrl}/users/current`,
        {
          headers: {
            Authorization: token, // Token ya incluye "Bearer "
          },
          timeout: 5000, // 5 segundos de timeout
        }
      )

      // Mapear respuesta de authgo a nuestra interface User
      return {
        id: response.data.id,
        name: response.data.name,
        login: response.data.login,
      }
    } catch (error: any) {
      // Verificar si es un error de axios
      if (isAxiosError(error)) {
        if (error.response) {
          if (error.response.status === 401 || error.response.status === 403) {
            throw new Error('Token inválido o expirado')
          }
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Servicio de autenticación no disponible')
        }
      }
      throw error
    }
  }
}
