// src/lib/encryption.ts
import * as crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex')
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encrypted: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  if (!ivHex || !authTagHex || encryptedHex === undefined) {
    throw new Error('Invalid encrypted string format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encryptedText = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encryptedText).toString('utf8') + decipher.final('utf8')
}

/**
 * Bank credentials structure for encryption
 */
export interface BankCredentials {
  userId: string       // Bank user ID (not Wealth user ID)
  password: string     // Bank password
  otp?: string        // Optional 2FA code
}

/**
 * Encrypts bank credentials for secure database storage.
 *
 * SECURITY NOTE: Credentials are decrypted only in-memory during sync operations.
 * Never log decrypted credentials or store them in plaintext.
 *
 * @param credentials - Bank login credentials
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encryptBankCredentials(credentials: BankCredentials): string {
  return encrypt(JSON.stringify(credentials))
}

/**
 * Decrypts bank credentials from database storage.
 *
 * SECURITY WARNING:
 * - Only call this in sync operations (server-side only)
 * - Clear credentials from memory after use
 * - Never log the result
 *
 * @param encrypted - Encrypted credentials string
 * @returns Decrypted credentials object
 */
export function decryptBankCredentials(encrypted: string): BankCredentials {
  const json = decrypt(encrypted)
  const credentials = JSON.parse(json) as BankCredentials

  // Validate required fields
  if (!credentials.userId || !credentials.password) {
    throw new Error('Invalid credentials: userId and password required')
  }

  return credentials
}
