// src/lib/__tests__/encryption.test.ts
import { encrypt, decrypt } from '../encryption'
import { describe, it, expect } from 'vitest'

// ENCRYPTION_KEY is set in vitest.setup.ts before modules load

describe('Encryption utilities', () => {

  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plaintext = 'access-sandbox-test-token-12345'
      const encrypted = encrypt(plaintext)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted.split(':')).toHaveLength(3) // iv:authTag:encrypted
    })

    it('should produce different ciphertext for same input (due to random IV)', () => {
      const plaintext = 'test-token'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      const oldKey = process.env.ENCRYPTION_KEY
      delete process.env.ENCRYPTION_KEY

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set')

      process.env.ENCRYPTION_KEY = oldKey
    })
  })

  describe('decrypt', () => {
    it('should decrypt an encrypted string', () => {
      const plaintext = 'access-sandbox-test-token-67890'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle special characters', () => {
      const plaintext = 'token:with:colons-and-dashes_and_underscores'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw error for invalid encrypted string format', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted string format')
    })

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      const oldKey = process.env.ENCRYPTION_KEY
      delete process.env.ENCRYPTION_KEY

      expect(() => decrypt('test:test:test')).toThrow('ENCRYPTION_KEY environment variable is not set')

      process.env.ENCRYPTION_KEY = oldKey
    })
  })

  describe('encrypt/decrypt round-trip', () => {
    it('should handle empty string', () => {
      const plaintext = ''
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(1000)
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle Unicode characters', () => {
      const plaintext = 'Hello 世界 🌍'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })
  })
})
