'use strict'

/**
 * Interface que representa un usuario autenticado
 *
 * Esta información se obtiene de authgo al validar un token JWT
 */
export interface User {
  id: string // ID del usuario en MongoDB
  name: string // Nombre completo
  login: string // Usuario de login
}
