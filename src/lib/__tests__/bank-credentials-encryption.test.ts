import { describe, it, expect } from 'vitest'
import { encryptBankCredentials, decryptBankCredentials, type BankCredentials } from '../encryption'

describe('Bank Credentials Encryption', () => {
  const mockCredentials: BankCredentials = {
    userId: 'test-user-123',
    password: 'SecureP@ssw0rd!',
  }

  it('should encrypt and decrypt credentials successfully', () => {
    const encrypted = encryptBankCredentials(mockCredentials)
    const decrypted = decryptBankCredentials(encrypted)

    expect(decrypted).toEqual(mockCredentials)
    expect(decrypted.userId).toBe('test-user-123')
    expect(decrypted.password).toBe('SecureP@ssw0rd!')
  })

  it('should handle credentials with OTP', () => {
    const credentialsWithOTP: BankCredentials = {
      ...mockCredentials,
      otp: '123456',
    }

    const encrypted = encryptBankCredentials(credentialsWithOTP)
    const decrypted = decryptBankCredentials(encrypted)

    expect(decrypted.otp).toBe('123456')
  })

  it('should produce different ciphertext for same credentials', () => {
    const encrypted1 = encryptBankCredentials(mockCredentials)
    const encrypted2 = encryptBankCredentials(mockCredentials)

    // Different due to random IV
    expect(encrypted1).not.toBe(encrypted2)

    // But both decrypt to same value
    expect(decryptBankCredentials(encrypted1)).toEqual(mockCredentials)
    expect(decryptBankCredentials(encrypted2)).toEqual(mockCredentials)
  })

  it('should handle special characters in password', () => {
    const specialCredentials: BankCredentials = {
      userId: 'user@example.com',
      password: '!@#$%^&*()_+{}|:"<>?[];\',./`~',
    }

    const encrypted = encryptBankCredentials(specialCredentials)
    const decrypted = decryptBankCredentials(encrypted)

    expect(decrypted.password).toBe(specialCredentials.password)
  })

  it('should handle Hebrew characters', () => {
    const hebrewCredentials: BankCredentials = {
      userId: 'משתמש123',
      password: 'סיסמה!@#',
    }

    const encrypted = encryptBankCredentials(hebrewCredentials)
    const decrypted = decryptBankCredentials(encrypted)

    expect(decrypted.userId).toBe('משתמש123')
    expect(decrypted.password).toBe('סיסמה!@#')
  })

  it('should throw on invalid encrypted format', () => {
    expect(() => {
      decryptBankCredentials('invalid-format')
    }).toThrow('Invalid encrypted string format')
  })

  it('should throw on tampered ciphertext', () => {
    const encrypted = encryptBankCredentials(mockCredentials)
    const tampered = encrypted.replace(/[0-9a-f]/, 'x')

    expect(() => {
      decryptBankCredentials(tampered)
    }).toThrow()
  })

  it('should throw on missing userId in decrypted data', () => {
    // Manually create invalid credentials object
    const invalidCredentials = { password: 'test' } as BankCredentials
    const encrypted = encryptBankCredentials(invalidCredentials)

    expect(() => {
      decryptBankCredentials(encrypted)
    }).toThrow('Invalid credentials: userId and password required')
  })

  it('should throw on missing password in decrypted data', () => {
    // Manually create invalid credentials object
    const invalidCredentials = { userId: 'test' } as BankCredentials
    const encrypted = encryptBankCredentials(invalidCredentials)

    expect(() => {
      decryptBankCredentials(encrypted)
    }).toThrow('Invalid credentials: userId and password required')
  })
})
