'use strict'

import { SecurityService } from './service'
import { SecurityRepository } from './repository'
import { getConfig } from '../../server/environment'

// Obtener configuración del entorno
const config = getConfig(process.env as any)

// Crear repository con URL de authgo
const repository = new SecurityRepository(config.authServiceUrl)

// Crear y exportar instancia singleton de SecurityService
export const securityService = new SecurityService(repository)

// También exportar las interfaces/clases para uso directo
export { User } from './user'
export { SecurityService } from './service'
export { SecurityRepository } from './repository'
