import { ValidationError, newError } from '../../../server/error'

/**
 * Value Object: CardData
 *
 * Representa los datos de una tarjeta de crédito/débito con validaciones integradas.
 * Es INMUTABLE - una vez creado, no se puede modificar.
 *
 * Validaciones:
 * - Número de tarjeta con algoritmo de Luhn
 * - Fecha de expiración no vencida
 * - CVV de 3-4 dígitos
 */
export class CardData {
  private readonly cardNumber: string
  private readonly expiryDate: string // Formato: MM/YY
  private readonly cvv: string
  private readonly cardHolderName: string

  constructor(
    cardNumber: string,
    expiryDate: string,
    cvv: string,
    cardHolderName: string
  ) {
    // Validaciones en el constructor que garantizan que el objeto sea válido
    this.validateCardNumber(cardNumber)
    this.validateExpiryDate(expiryDate)
    this.validateCVV(cvv)
    this.validateCardHolderName(cardHolderName)

    this.cardNumber = cardNumber.replace(/\s/g, '') // Eliminar espacios
    this.expiryDate = expiryDate
    this.cvv = cvv
    this.cardHolderName = cardHolderName.toUpperCase()
  }

  /**
   * Algoritmo de Luhn para validar números de tarjeta
   * https://es.wikipedia.org/wiki/Algoritmo_de_Luhn
   *
   * Usado por Visa, Mastercard, Amex, etc.
   */
  private validateCardNumber(cardNumber: string): void {
    // Limpiar espacios y guiones
    const cleaned = cardNumber.replace(/[\s-]/g, '')

    // Debe tener entre 13 y 19 dígitos por reglas de negocio
    if (!/^\d{13,19}$/.test(cleaned)) {
      throw new ValidationError([
        newError(
          'cardNumber',
          'Número de tarjeta inválido. Debe contener entre 13 y 19 dígitos'
        ),
      ])
    }

    // Aplicar algoritmo de Luhn
    let sum = 0
    let isEven = false

    // Iterar de derecha a izquierda
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10)

      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }

      sum += digit
      isEven = !isEven
    }

    // El número es válido si la suma es múltiplo de 10
    if (sum % 10 !== 0) {
      throw new ValidationError([
        newError(
          'cardNumber',
          'Número de tarjeta inválido (falló verificación Luhn)'
        ),
      ])
    }
  }

  /**
   * Validar fecha de expiración (formato MM/YY)
   */
  private validateExpiryDate(expiryDate: string): void {
    // Validar formato MM/YY
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      throw new ValidationError([
        newError(
          'expiryDate',
          'Formato de fecha inválido. Usar MM/YY (ejemplo: 12/25)'
        ),
      ])
    }

    const [monthStr, yearStr] = expiryDate.split('/')
    const month = parseInt(monthStr, 10)
    const year = parseInt('20' + yearStr, 10) // Convertir YY a YYYY

    // Validar mes (1-12)
    if (month < 1 || month > 12) {
      throw new ValidationError([
        newError('expiryDate', 'Mes inválido. Debe estar entre 01 y 12'),
      ])
    }

    // Validar que no esté vencida
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // getMonth() retorna 0-11

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      throw new ValidationError([
        newError('expiryDate', 'La tarjeta está vencida'),
      ])
    }

    // Validar que no sea una fecha muy lejana (más de 10 años)
    if (year > currentYear + 10) {
      throw new ValidationError([
        newError('expiryDate', 'Fecha de expiración inválida (año muy lejano)'),
      ])
    }
  }

  /**
   * Validar CVV (3-4 dígitos)
   */
  private validateCVV(cvv: string): void {
    if (!/^\d{3,4}$/.test(cvv)) {
      throw new ValidationError([
        newError('cvv', 'CVV inválido. Debe contener 3 o 4 dígitos'),
      ])
    }
  }

  /**
   * Validar nombre del titular
   */
  private validateCardHolderName(name: string): void {
    if (!name || name.trim().length < 3) {
      throw new ValidationError([
        newError(
          'cardHolderName',
          'Nombre del titular inválido. Debe tener al menos 3 caracteres'
        ),
      ])
    }

    // Validar que solo contenga letras y espacios
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
      throw new ValidationError([
        newError(
          'cardHolderName',
          'Nombre del titular inválido. Solo puede contener letras y espacios'
        ),
      ])
    }
  }

  /**
   * Obtener los últimos 4 dígitos (para mostrar sin exponer el número completo)
   */
  getLastFourDigits(): string {
    return this.cardNumber.slice(-4)
  }

  /**
   * Obtener datos para almacenar en DB (sin CVV por seguridad)
   */
  toStorageObject(): object {
    return {
      lastFourDigits: this.getLastFourDigits(),
      expiryDate: this.expiryDate,
      cardHolderName: this.cardHolderName,
    }
  }
}
