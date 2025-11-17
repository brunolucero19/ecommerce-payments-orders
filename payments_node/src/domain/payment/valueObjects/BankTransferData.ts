import { ValidationError, newError } from '../../../server/error'

/**
 * Value Object: BankTransferData
 *
 * Representa los datos de una transferencia bancaria con validaciones.
 * En Argentina se usa el CBU de 22 dígitos.
 */
export class BankTransferData {
  private readonly cbu: string
  private readonly alias?: string
  private readonly bankName?: string

  constructor(cbu: string, alias?: string, bankName?: string) {
    this.validateCBU(cbu)

    this.cbu = cbu
    this.alias = alias?.toUpperCase()
    this.bankName = bankName
  }

  /**
   * Validar CBU argentino (22 dígitos con dígito verificador)
   * https://www.bcra.gob.ar/SistemasFinancierosYdePagos/Transferencias_cbu.asp
   */
  private validateCBU(cbu: string): void {
    // Limpiar espacios y guiones
    const cleaned = cbu.replace(/[\s-]/g, '')

    // Debe tener exactamente 22 dígitos
    if (!/^\d{22}$/.test(cleaned)) {
      throw new ValidationError([
        newError('cbu', 'CBU inválido. Debe contener exactamente 22 dígitos'),
      ])
    }

    // Validar dígito verificador del bloque 1 (primeros 8 dígitos)
    const block1 = cleaned.substring(0, 7)
    const checkDigit1 = parseInt(cleaned.charAt(7), 10)
    const calculatedCheckDigit1 = this.calculateCheckDigit(
      block1,
      [7, 1, 3, 9, 7, 1, 3]
    )

    if (checkDigit1 !== calculatedCheckDigit1) {
      throw new ValidationError([
        newError('cbu', 'CBU inválido (falló verificación del primer bloque)'),
      ])
    }

    // Validar dígito verificador del bloque 2 (últimos 14 dígitos)
    const block2 = cleaned.substring(8, 21)
    const checkDigit2 = parseInt(cleaned.charAt(21), 10)
    const calculatedCheckDigit2 = this.calculateCheckDigit(
      block2,
      [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]
    )

    if (checkDigit2 !== calculatedCheckDigit2) {
      throw new ValidationError([
        newError('cbu', 'CBU inválido (falló verificación del segundo bloque)'),
      ])
    }
  }

  /**
   * Calcular dígito verificador para validación de CBU
   */
  private calculateCheckDigit(block: string, weights: number[]): number {
    let sum = 0

    for (let i = 0; i < block.length; i++) {
      const digit = parseInt(block.charAt(i), 10)
      sum += digit * weights[i]
    }

    const remainder = sum % 10
    return remainder === 0 ? 0 : 10 - remainder
  }

  /**
   * Obtener CBU enmascarado (ej: **** **** **** **** **1234)
   */
  getMaskedCBU(): string {
    const lastFour = this.cbu.slice(-4)
    return `**** **** **** **** **${lastFour}`
  }

  /**
   * Obtener datos para almacenar en DB
   */
  toStorageObject(): object {
    return {
      cbu: this.cbu,
      alias: this.alias,
      bankName: this.bankName,
    }
  }

  getCBU(): string {
    return this.cbu
  }

  getAlias(): string | undefined {
    return this.alias
  }

  getBankName(): string | undefined {
    return this.bankName
  }
}
