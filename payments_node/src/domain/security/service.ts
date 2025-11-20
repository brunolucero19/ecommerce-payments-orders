'use strict'

import NodeCache from 'node-cache'
import { User } from './user'
import { SecurityRepository } from './repository'

/**
 * Servicio de seguridad que maneja la validación de tokens con caché en memoria
 *
 * Los tokens se cachean por 1 hora (3600 segundos) y se validan automáticamente.
 *
 * Los tokens se invalidan del caché cuando:
 * 1. Se recibe un evento de logout desde authgo
 * 2. Expiran automáticamente después de 1 hora (TTL)
 * 3. El servicio se reinicia (el caché es en memoria)
 */
export class SecurityService {
  private cache: NodeCache
  private repository: SecurityRepository

  constructor(repository: SecurityRepository) {
    this.repository = repository
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hora (3600 segundos)
      checkperiod: 120, // Limpia tokens expirados cada 2 minutos
      maxKeys: 10000, // Límite de 10k tokens (previene memory leaks)
      useClones: false, // No clona objetos
    })
  }

  /**
   * Valida un token JWT
   *
   * Primero busca en caché, si no está, consulta a authgo y cachea el resultado.
   *
   */
  async validate(token: string): Promise<User> {
    // Revisar caché
    const cached = this.cache.get<User>(token)
    if (cached) {
      return cached
    }

    // No está en caché, consultar a authgo
    console.log('[SecurityService] Token no en caché, validando con authgo...')
    const user = await this.repository.validateToken(token)

    // Guardar en caché para futuras requests
    this.cache.set(token, user)

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
    const existed = this.cache.del(token)
    if (existed > 0) {
      console.log(
        `[SecurityService] Token invalidado: ${token.substring(0, 20)}...`
      )
    } else {
      console.log(
        `[SecurityService] Token no estaba en caché: ${token.substring(
          0,
          20
        )}...`
      )
    }
  }
}
