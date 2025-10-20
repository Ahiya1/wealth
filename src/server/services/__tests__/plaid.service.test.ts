// src/server/services/__tests__/plaid.service.test.ts
import { mapPlaidAccountType } from '../plaid.service'

describe('Plaid Service', () => {
  describe('mapPlaidAccountType', () => {
    it('should map depository/checking to CHECKING', () => {
      expect(mapPlaidAccountType('depository', 'checking')).toBe('CHECKING')
    })

    it('should map depository/savings to SAVINGS', () => {
      expect(mapPlaidAccountType('depository', 'savings')).toBe('SAVINGS')
    })

    it('should map credit to CREDIT', () => {
      expect(mapPlaidAccountType('credit', 'credit card')).toBe('CREDIT')
    })

    it('should map investment to INVESTMENT', () => {
      expect(mapPlaidAccountType('investment', 'brokerage')).toBe('INVESTMENT')
    })

    it('should map loan to CREDIT', () => {
      expect(mapPlaidAccountType('loan', 'student')).toBe('CREDIT')
    })

    it('should default depository to CHECKING', () => {
      expect(mapPlaidAccountType('depository', null)).toBe('CHECKING')
    })

    it('should default unknown types to CASH', () => {
      expect(mapPlaidAccountType('other', null)).toBe('CASH')
    })

    it('should handle case-insensitive input', () => {
      expect(mapPlaidAccountType('DEPOSITORY', 'CHECKING')).toBe('CHECKING')
      expect(mapPlaidAccountType('Credit', 'Credit Card')).toBe('CREDIT')
    })
  })
})
