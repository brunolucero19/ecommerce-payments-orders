import {
  PaymentStatus,
  PaymentMethod,
  PaymentErrorCode,
} from '../../../src/domain/payment/payment'

describe('Payment Enums and Constants', () => {
  describe('PaymentStatus', () => {
    it('should have all required statuses', () => {
      expect(PaymentStatus.PENDING).toBe('pending')
      expect(PaymentStatus.APPROVED).toBe('approved')
      expect(PaymentStatus.REJECTED).toBe('rejected')
      expect(PaymentStatus.REFUNDED).toBe('refunded')
    })
  })

  describe('PaymentMethod', () => {
    it('should have all payment methods', () => {
      expect(PaymentMethod.CREDIT_CARD).toBe('credit_card')
      expect(PaymentMethod.DEBIT_CARD).toBe('debit_card')
      expect(PaymentMethod.BANK_TRANSFER).toBe('bank_transfer')
      expect(PaymentMethod.WALLET).toBe('wallet')
    })
  })

  describe('PaymentErrorCode', () => {
    it('should have card error codes', () => {
      expect(PaymentErrorCode.EXPIRED_CARD).toBe('EXPIRED_CARD')
      expect(PaymentErrorCode.INSUFFICIENT_FUNDS).toBe('INSUFFICIENT_FUNDS')
      expect(PaymentErrorCode.INVALID_NUMBER).toBe('INVALID_NUMBER')
      expect(PaymentErrorCode.INVALID_CVV).toBe('INVALID_CVV')
      expect(PaymentErrorCode.PROCESSING_ERROR).toBe('PROCESSING_ERROR')
    })

    it('should have bank transfer error codes', () => {
      expect(PaymentErrorCode.INVALID_CBU).toBe('INVALID_CBU')
      expect(PaymentErrorCode.BANK_REJECTED).toBe('BANK_REJECTED')
      expect(PaymentErrorCode.TIMEOUT).toBe('TIMEOUT')
    })

    it('should have general error codes', () => {
      expect(PaymentErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    })
  })
})
