'use strict'

import { User } from './user'
import { SecurityRepository } from './repository'

/**
 * Servicio de seguridad que maneja la validación de tokens con caché en memoria
 *
 * El caché evita llamadas repetidas a authgo para el mismo token,
 * mejorando significativamente el performance (de ~50ms a <1ms).
 *
 * Los tokens se invalidan del caché cuando:
 * 1. Se recibe un evento de logout desde authgo
 * 2. El servicio se reinicia (el caché es en memoria)
 */
export class SecurityService {
  private cache: Map<string, User> = new Map()
  private repository: SecurityRepository

  constructor(repository: SecurityRepository) {
    this.repository = repository
  }

  /**
   * Valida un token JWT
   *
   * Primero busca en caché, si no está, consulta a authgo y cachea el resultado.
   *
   * @param token - Token JWT completo (incluyendo "Bearer ")
   * @returns Promise<User> - Información del usuario
   * @throws Error si el token es inválido
   */
  async validate(token: string): Promise<User> {
    // 1. Revisar caché
    const cached = this.cache.get(token)
    if (cached) {
      console.log('[SecurityService] Token encontrado en caché')
      return cached
    }

    // 2. No está en caché, consultar a authgo
    console.log('[SecurityService] Token no en caché, validando con authgo...')
    const user = await this.repository.validateToken(token)

    // 3. Guardar en caché para futuras requests
    this.cache.set(token, user)
    console.log(
      `[SecurityService] Token cacheado. Tamaño de caché: ${this.cache.size}`
    )

    return user
  }

  /**
   * Invalida un token del caché
   *
   * Se llama cuando se recibe un evento de logout desde authgo
   *
   * @param token - Token JWT a invalidar
   */
  invalidate(token: string): void {
    const existed = this.cache.delete(token)
    if (existed) {
      console.log(
        `[SecurityService] Token invalidado: ${token.substring(0, 20)}...`
      )
      console.log(`[SecurityService] Tamaño de caché: ${this.cache.size}`)
    } else {
      console.log(
        `[SecurityService] Token no estaba en caché: ${token.substring(
          0,
          20
        )}...`
      )
    }
  }

  /**
   * Limpia todo el caché
   *
   * Útil para testing o mantenimiento
   */
  clearCache(): void {
    const previousSize = this.cache.size
    this.cache.clear()
    console.log(
      `[SecurityService] Caché limpiado. Tokens eliminados: ${previousSize}`
    )
  }

  /**
   * Obtiene el tamaño actual del caché
   *
   * @returns número de tokens en caché
   */
  getCacheSize(): number {
    return this.cache.size
  }

  /**
   * Obtiene estadísticas del caché (útil para monitoreo)
   */
  getCacheStats(): { size: number; tokens: string[] } {
    return {
      size: this.cache.size,
      tokens: Array.from(this.cache.keys()).map(
        (t) => t.substring(0, 20) + '...'
      ),
    }
  }
}
