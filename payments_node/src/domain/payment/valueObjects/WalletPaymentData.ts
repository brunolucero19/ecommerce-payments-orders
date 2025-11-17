import { ValidationError, newError } from '../../../server/error'

/**
 * Value Object: WalletPaymentData
 *
 * Representa el uso de la wallet para un pago.
 * Más simple que los otros porque solo necesita referenciar al wallet del usuario.
 */
export class WalletPaymentData {
  private readonly userId: string

  constructor(userId: string) {
    if (!userId || userId.trim().length === 0) {
      throw new ValidationError([
        newError('userId', 'El userId es requerido para pagos con wallet'),
      ])
    }
    this.userId = userId
  }

  toStorageObject(): object {
    return {
      walletPayment: true,
      userId: this.userId,
    }
  }

  getUserId(): string {
    return this.userId
  }
}
