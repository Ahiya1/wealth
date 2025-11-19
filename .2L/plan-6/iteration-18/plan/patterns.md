# Code Patterns & Conventions - Iteration 18

## File Structure

```
wealth/
├── src/
│   ├── server/
│   │   ├── services/
│   │   │   ├── bank-scraper.service.ts        # NEW - Scraper wrapper
│   │   │   └── __tests__/
│   │   │       └── bank-scraper.service.test.ts
│   │   └── api/
│   │       └── routers/
│   │           └── bankConnections.router.ts   # ENHANCED - Add testConnection
│   ├── lib/
│   │   ├── encryption.ts                       # EXISTING - Reuse
│   │   └── bankErrorMessages.ts                # NEW - Error mapping
│   ├── components/
│   │   ├── bank-connections/
│   │   │   ├── BankConnectionWizard.tsx        # NEW - 5-step wizard
│   │   │   ├── OtpModal.tsx                    # NEW - 2FA modal
│   │   │   ├── BankSelectionStep.tsx           # NEW - Step 1
│   │   │   ├── CredentialsStep.tsx             # NEW - Step 2
│   │   │   ├── ConnectionTestStep.tsx          # NEW - Step 4
│   │   │   └── ImportPromptStep.tsx            # NEW - Step 5
│   │   └── ui/                                 # EXISTING - shadcn/ui
│   └── app/
│       └── (dashboard)/
│           └── settings/
│               └── bank-connections/
│                   └── page.tsx                # ENHANCED - Enable wizard
├── prisma/
│   └── schema.prisma                           # EXISTING - No changes
└── package.json                                # ENHANCED - Add israeli-bank-scrapers
```

---

## Naming Conventions

**Files:**
- Services: `kebab-case.service.ts` (e.g., `bank-scraper.service.ts`)
- Components: `PascalCase.tsx` (e.g., `BankConnectionWizard.tsx`)
- Utilities: `camelCase.ts` (e.g., `bankErrorMessages.ts`)
- Tests: `*.test.ts` or `*.test.tsx`

**Functions:**
- camelCase: `scrapeBank()`, `mapScraperError()`, `handleOtpSubmit()`

**Types:**
- PascalCase: `BankScraperError`, `ScrapeOptions`, `OtpState`
- Interfaces: `I` prefix avoided (just use type name)

**Constants:**
- SCREAMING_SNAKE_CASE: `OTP_TIMEOUT_MS`, `MAX_OTP_RETRIES`

**Enums (Prisma):**
- PascalCase values: `BankProvider.FIBI`, `ConnectionStatus.ACTIVE`

---

## Bank Scraper Service Pattern

### Location

`/src/server/services/bank-scraper.service.ts`

### Purpose

Encapsulate israeli-bank-scrapers library complexity, provide consistent error handling, enable future library replacement.

### Full Implementation

```typescript
import { CompanyTypes, createScraper } from 'israeli-bank-scrapers'
import { decryptBankCredentials } from '@/lib/encryption'
import type { BankProvider } from '@prisma/client'

// ============================================================================
// Custom Error Class
// ============================================================================

export class BankScraperError extends Error {
  constructor(
    public errorType:
      | 'INVALID_CREDENTIALS'
      | 'OTP_REQUIRED'
      | 'OTP_TIMEOUT'
      | 'NETWORK_ERROR'
      | 'SCRAPER_BROKEN'
      | 'BANK_MAINTENANCE'
      | 'ACCOUNT_BLOCKED'
      | 'PASSWORD_EXPIRED',
    message: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'BankScraperError'
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ScrapeOptions {
  bank: BankProvider
  encryptedCredentials: string
  startDate?: Date
  endDate?: Date
  otp?: string // Optional OTP for 2FA retry
}

export interface ScrapeResult {
  success: boolean
  transactions: ImportedTransaction[]
  accountNumber?: string
  balance?: number
}

export interface ImportedTransaction {
  date: Date
  processedDate: Date
  amount: number
  description: string
  memo?: string
  status: 'completed' | 'pending'
}

// ============================================================================
// Main Scraper Function
// ============================================================================

/**
 * Scrapes transactions from Israeli bank or credit card
 *
 * @param options - Bank, credentials, date range, optional OTP
 * @returns ScrapeResult with transactions or throws BankScraperError
 *
 * @throws {BankScraperError} For all scraper failures (categorized by errorType)
 *
 * @example
 * ```typescript
 * const result = await scrapeBank({
 *   bank: 'FIBI',
 *   encryptedCredentials: connection.encryptedCredentials,
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 * })
 *
 * console.log(`Imported ${result.transactions.length} transactions`)
 * ```
 */
export async function scrapeBank(options: ScrapeOptions): Promise<ScrapeResult> {
  // 1. Decrypt credentials (in-memory only)
  const credentials = decryptBankCredentials(options.encryptedCredentials)

  // Sanitized logging (only first 3 chars of userId)
  console.log(`[scrapeBank] Bank: ${options.bank}, User: ${credentials.userId.substring(0, 3)}***`)

  // 2. Map bank to israeli-bank-scrapers CompanyTypes
  const companyId = mapBankToCompanyType(options.bank)

  // 3. Configure scraper
  const scraper = createScraper({
    companyId,
    startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
    combineInstallments: false, // Keep installments separate
    showBrowser: false, // Headless mode (production)
  })

  // 4. Prepare credentials
  const scrapeCredentials = {
    username: credentials.userId,
    password: credentials.password,
    ...(options.otp && { otp: options.otp }), // Add OTP if provided
  }

  // 5. Execute scrape with timeout
  let result
  try {
    console.log(`[scrapeBank] Starting scrape...`)
    result = await scraper.scrape(scrapeCredentials)
    console.log(`[scrapeBank] Scrape completed, success: ${result.success}`)
  } catch (error) {
    console.error(`[scrapeBank] Network error:`, error)
    throw new BankScraperError(
      'NETWORK_ERROR',
      'Failed to connect to bank. Please check your internet connection and try again.',
      error as Error
    )
  }

  // 6. Handle scraper errors
  if (!result.success) {
    throw mapScraperError(result.errorType, result.errorMessage)
  }

  // 7. Map transactions to our format
  const transactions: ImportedTransaction[] = []

  for (const account of result.accounts) {
    for (const txn of account.txns) {
      // Skip pending transactions (Iteration 18 scope)
      if (txn.status === 'pending') {
        console.log(`[scrapeBank] Skipping pending transaction: ${txn.description}`)
        continue
      }

      transactions.push({
        date: new Date(txn.date),
        processedDate: new Date(txn.processedDate),
        amount: txn.chargedAmount,
        description: txn.description,
        memo: txn.memo || undefined,
        status: txn.status,
      })
    }
  }

  console.log(`[scrapeBank] Mapped ${transactions.length} completed transactions`)

  return {
    success: true,
    transactions,
    accountNumber: result.accounts[0]?.accountNumber,
    balance: result.accounts[0]?.balance,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map BankProvider enum to israeli-bank-scrapers CompanyTypes
 */
function mapBankToCompanyType(bank: BankProvider): CompanyTypes {
  switch (bank) {
    case 'FIBI':
      return CompanyTypes.otsarHahayal // FIBI uses this scraper
    case 'VISA_CAL':
      return CompanyTypes.visaCal
    default:
      throw new Error(`Unsupported bank: ${bank}`)
  }
}

/**
 * Map israeli-bank-scrapers error types to BankScraperError with user-friendly messages
 */
function mapScraperError(errorType: string, message: string): BankScraperError {
  switch (errorType) {
    case 'INVALID_PASSWORD':
      return new BankScraperError(
        'INVALID_CREDENTIALS',
        'Invalid username or password. Please check your credentials and try again.'
      )

    case 'CHANGE_PASSWORD':
      return new BankScraperError(
        'PASSWORD_EXPIRED',
        'Your password has expired. Please update it via your bank\'s website, then update your credentials here.'
      )

    case 'ACCOUNT_BLOCKED':
      return new BankScraperError(
        'ACCOUNT_BLOCKED',
        'Account locked due to too many failed login attempts. Please contact your bank.'
      )

    case 'TIMEOUT':
      return new BankScraperError(
        'NETWORK_ERROR',
        'Connection timed out. Please check your internet connection and try again.'
      )

    case 'GENERIC':
    case 'UNKNOWN_ERROR':
      return new BankScraperError(
        'SCRAPER_BROKEN',
        'Sync temporarily unavailable. The bank may have changed their website. Our team has been notified.'
      )

    default:
      console.error(`[mapScraperError] Unknown error type: ${errorType}, message: ${message}`)
      return new BankScraperError(
        'SCRAPER_BROKEN',
        `Unexpected scraper error: ${message}`
      )
  }
}
```

**Key Points:**
- Decrypt credentials in-memory only (never store in state)
- Sanitized logging (no credentials, only userId first 3 chars)
- Skip pending transactions (filter out txn.status === 'pending')
- Map all scraper errors to BankScraperError with user-friendly messages
- Console logging for debugging (replace with proper logging in Iteration 20)

---

## tRPC Endpoint Pattern

### Location

`/src/server/api/routers/bankConnections.router.ts`

### Pattern: Test Connection Mutation

```typescript
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '@/server/api/trpc'
import { scrapeBank, BankScraperError } from '@/server/services/bank-scraper.service'

export const bankConnectionsRouter = router({
  // ... existing endpoints (list, get, add, update, delete)

  /**
   * Test bank connection by attempting to scrape with provided credentials
   *
   * Creates SyncLog record for every attempt (success or failure)
   * Updates connection status based on result
   *
   * @returns Success message or throws TRPCError
   */
  testConnection: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        otp: z.string().length(6).optional(), // For 2FA retry
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch connection and verify ownership
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.id },
      })

      if (!connection) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bank connection not found' })
      }

      if (connection.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      // 2. Create SyncLog record (default to FAILED, update on success)
      const syncLog = await ctx.prisma.syncLog.create({
        data: {
          bankConnectionId: connection.id,
          startedAt: new Date(),
          status: 'FAILED', // Pessimistic default
        },
      })

      try {
        // 3. Call scraper service
        const result = await scrapeBank({
          bank: connection.bank,
          encryptedCredentials: connection.encryptedCredentials,
          startDate: new Date(), // Only test connection, don't import transactions
          endDate: new Date(),
          otp: input.otp,
        })

        // 4. Update connection status to ACTIVE
        await ctx.prisma.bankConnection.update({
          where: { id: connection.id },
          data: {
            status: 'ACTIVE',
            lastSynced: new Date(),
            lastSuccessfulSync: new Date(),
            errorMessage: null,
          },
        })

        // 5. Update SyncLog to SUCCESS
        await ctx.prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'SUCCESS',
            transactionsImported: 0, // Test only, no imports
          },
        })

        return {
          success: true,
          message: 'Connection successful',
          accountNumber: result.accountNumber,
        }

      } catch (error) {
        // 6. Handle BankScraperError
        if (error instanceof BankScraperError) {
          // Update connection status based on error type
          const status = error.errorType === 'PASSWORD_EXPIRED' ? 'EXPIRED' : 'ERROR'

          await ctx.prisma.bankConnection.update({
            where: { id: connection.id },
            data: {
              status,
              errorMessage: error.message,
            },
          })

          // Update SyncLog with error details
          await ctx.prisma.syncLog.update({
            where: { id: syncLog.id },
            data: {
              completedAt: new Date(),
              status: 'FAILED',
              errorDetails: `${error.errorType}: ${error.message}`,
            },
          })

          // Special handling for OTP_REQUIRED
          if (error.errorType === 'OTP_REQUIRED') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'OTP_REQUIRED', // Client detects this specific message
            })
          }

          // Throw user-friendly error
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          })
        }

        // 7. Handle unexpected errors
        console.error('[testConnection] Unexpected error:', error)

        await ctx.prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'FAILED',
            errorDetails: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Connection test failed. Please try again.',
        })
      }
    }),
})
```

**Key Points:**
- Verify ownership before any operation
- Create SyncLog before scraping (pessimistic FAILED default)
- Update SyncLog on completion (success or failure)
- Map BankScraperError to TRPCError with user-friendly messages
- Special handling for OTP_REQUIRED (client shows modal)
- Update connection status based on error type (EXPIRED vs ERROR)

---

## Multi-Step Wizard Pattern

### Location

`/src/components/bank-connections/BankConnectionWizard.tsx`

### Pattern: State-Driven Wizard with 5 Steps

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BankSelectionStep } from './BankSelectionStep'
import { CredentialsStep } from './CredentialsStep'
import { OtpModal } from './OtpModal'
import { ConnectionTestStep } from './ConnectionTestStep'
import { ImportPromptStep } from './ImportPromptStep'
import type { BankProvider, AccountType } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

interface WizardData {
  // Step 1
  bank: BankProvider | null
  accountType: AccountType | null

  // Step 2
  userId: string
  password: string

  // Step 3 (OTP - conditional)
  otp?: string

  // Step 4 (Connection Test Result)
  connectionId?: string
  accountNumber?: string

  // Step 5
  shouldImport: boolean
}

interface BankConnectionWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// ============================================================================
// Main Component
// ============================================================================

export function BankConnectionWizard({ isOpen, onClose, onSuccess }: BankConnectionWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<WizardData>>({
    shouldImport: true, // Default to Yes
  })
  const [showOtpModal, setShowOtpModal] = useState(false)

  // Navigation
  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 5))
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  // Update form data
  const updateFormData = (partial: Partial<WizardData>) => {
    setFormData((prev) => ({ ...prev, ...partial }))
  }

  // OTP flow
  const handleOtpRequired = () => {
    setShowOtpModal(true)
  }

  const handleOtpSubmit = (otp: string) => {
    updateFormData({ otp })
    setShowOtpModal(false)
    // Retry connection test with OTP
  }

  // Wizard completion
  const handleComplete = () => {
    onSuccess?.()
    onClose()
    // Reset state
    setCurrentStep(1)
    setFormData({ shouldImport: true })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Bank Connection</DialogTitle>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-sage-600' : 'bg-warm-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Bank Selection */}
          {currentStep === 1 && (
            <BankSelectionStep
              selectedBank={formData.bank}
              selectedAccountType={formData.accountType}
              onNext={(bank, accountType) => {
                updateFormData({ bank, accountType })
                handleNext()
              }}
            />
          )}

          {/* Step 2: Credentials Entry */}
          {currentStep === 2 && (
            <CredentialsStep
              initialData={{ userId: formData.userId || '', password: formData.password || '' }}
              onNext={(userId, password) => {
                updateFormData({ userId, password })
                handleNext()
              }}
              onBack={handleBack}
            />
          )}

          {/* Step 4: Connection Test (Step 3 is OTP modal, shown conditionally) */}
          {currentStep === 3 && (
            <ConnectionTestStep
              bank={formData.bank!}
              accountType={formData.accountType!}
              userId={formData.userId!}
              password={formData.password!}
              otp={formData.otp}
              onSuccess={(connectionId, accountNumber) => {
                updateFormData({ connectionId, accountNumber })
                handleNext()
              }}
              onOtpRequired={handleOtpRequired}
              onBack={handleBack}
            />
          )}

          {/* Step 5: Initial Import Prompt */}
          {currentStep === 4 && (
            <ImportPromptStep
              shouldImport={formData.shouldImport}
              onComplete={(shouldImport) => {
                updateFormData({ shouldImport })
                // TODO: Trigger initial import if shouldImport === true
                handleComplete()
              }}
              onBack={handleBack}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* OTP Modal (overlay on wizard) */}
      <OtpModal
        isOpen={showOtpModal}
        onSubmit={handleOtpSubmit}
        onCancel={() => setShowOtpModal(false)}
      />
    </>
  )
}
```

**Key Points:**
- State-driven wizard (currentStep state)
- Partial form data accumulation across steps
- Progress indicator shows 5 steps
- OTP modal shown conditionally (overlay on main wizard)
- Step 3 (OTP) is conditional based on handleOtpRequired callback
- Reset state on completion

---

## OTP Modal Pattern

### Location

`/src/components/bank-connections/OtpModal.tsx`

### Pattern: Countdown Timer with Async Callback

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ============================================================================
// Constants
// ============================================================================

const OTP_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes

// ============================================================================
// Component
// ============================================================================

interface OtpModalProps {
  isOpen: boolean
  onSubmit: (otp: string) => void
  onCancel: () => void
  phoneLastDigits?: string // e.g., "1234" for "***1234"
}

export function OtpModal({ isOpen, onSubmit, onCancel, phoneLastDigits = '****' }: OtpModalProps) {
  const [otp, setOtp] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(OTP_TIMEOUT_MS)
  const [isExpired, setIsExpired] = useState(false)

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp('')
      setTimeRemaining(OTP_TIMEOUT_MS)
      setIsExpired(false)
    }
  }, [isOpen])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1000) {
          setIsExpired(true)
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, timeRemaining])

  // Format time remaining (MM:SS)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 6 && !isExpired) {
      onSubmit(otp)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Enter SMS Code</DialogTitle>
          <DialogDescription>
            SMS code sent to ***{phoneLastDigits}.
            <br />
            Code expires in <span className="font-semibold text-sage-700">{formatTime(timeRemaining)}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only digits
            disabled={isExpired}
            autoFocus
            className="text-center text-2xl tracking-widest"
          />

          {isExpired && (
            <p className="text-sm text-red-600">
              Code expired. Please close this dialog and retry the connection to receive a new code.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={otp.length !== 6 || isExpired}
            >
              Verify
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Key Points:**
- Auto-focus input when modal opens
- Only allow digits (regex replacement)
- Countdown timer updates every second
- Disable submit if OTP length !== 6 or expired
- Clear messaging when expired ("retry connection")
- Large text input for easy readability (text-2xl, tracking-widest)

---

## Form Validation Pattern

### Example: Credentials Step

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ============================================================================
// Validation Schema
// ============================================================================

const credentialsSchema = z.object({
  userId: z.string().min(1, 'User ID is required').max(50, 'User ID too long'),
  password: z.string().min(1, 'Password is required').min(4, 'Password must be at least 4 characters'),
})

type CredentialsFormData = z.infer<typeof credentialsSchema>

// ============================================================================
// Component
// ============================================================================

interface CredentialsStepProps {
  initialData: { userId: string; password: string }
  onNext: (userId: string, password: string) => void
  onBack: () => void
}

export function CredentialsStep({ initialData, onNext, onBack }: CredentialsStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: initialData,
  })

  const onSubmit = (data: CredentialsFormData) => {
    onNext(data.userId, data.password)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="userId">Bank User ID</Label>
        <Input
          id="userId"
          type="text"
          placeholder="Enter your bank user ID"
          {...register('userId')}
        />
        {errors.userId && (
          <p className="text-sm text-red-600">{errors.userId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your bank password"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Security:</strong> Your credentials are encrypted with AES-256-GCM before storage.
          We never log or expose your password.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">
          Next
        </Button>
      </div>
    </form>
  )
}
```

**Key Points:**
- Zod schema for validation
- react-hook-form for state management
- Error messages below fields
- Security messaging for user confidence
- Back/Next navigation buttons

---

## Error Message Mapping Pattern

### Location

`/src/lib/bankErrorMessages.ts`

### Pattern: Centralized Error Configuration

```typescript
export interface ErrorMessageConfig {
  title: string
  description: string
  action?: {
    label: string
    href?: string
  }
  retryable: boolean
}

export const bankErrorMessages: Record<string, ErrorMessageConfig> = {
  INVALID_CREDENTIALS: {
    title: 'Invalid credentials',
    description: 'Please check your username and password and try again.',
    action: {
      label: 'Update credentials',
    },
    retryable: true,
  },

  PASSWORD_EXPIRED: {
    title: 'Password expired',
    description: 'Your bank requires a password change. Please update your password via your bank\'s website, then update your credentials here.',
    action: {
      label: 'Open bank website',
      href: 'https://fibi.bank.com', // Update based on bank
    },
    retryable: false,
  },

  OTP_TIMEOUT: {
    title: 'SMS code expired',
    description: 'The SMS code has expired. Please retry the connection to receive a new code.',
    action: {
      label: 'Retry',
    },
    retryable: true,
  },

  NETWORK_ERROR: {
    title: 'Connection failed',
    description: 'Unable to connect to bank. Please check your internet connection and try again.',
    action: {
      label: 'Retry',
    },
    retryable: true,
  },

  SCRAPER_BROKEN: {
    title: 'Sync temporarily unavailable',
    description: 'The bank may have changed their website. Our team has been notified and is working on a fix.',
    retryable: false,
  },

  ACCOUNT_BLOCKED: {
    title: 'Account locked',
    description: 'Too many failed login attempts. Please contact your bank to unlock your account.',
    retryable: false,
  },

  BANK_MAINTENANCE: {
    title: 'Bank under maintenance',
    description: 'The bank\'s systems are currently unavailable. Please try again later.',
    action: {
      label: 'Retry in 1 hour',
    },
    retryable: true,
  },
}

/**
 * Get user-friendly error message for BankScraperError type
 */
export function getErrorMessage(errorType: string): ErrorMessageConfig {
  return bankErrorMessages[errorType] || {
    title: 'Sync failed',
    description: 'An unexpected error occurred. Please try again later.',
    retryable: true,
  }
}
```

**Usage in Component:**
```typescript
import { getErrorMessage } from '@/lib/bankErrorMessages'
import { useToast } from '@/components/ui/use-toast'

const { toast } = useToast()

try {
  await testConnection.mutateAsync({ id: connectionId })
} catch (error) {
  const errorConfig = getErrorMessage(error.message) // Assume error.message contains errorType

  toast({
    title: errorConfig.title,
    description: errorConfig.description,
    variant: 'destructive',
  })
}
```

---

## Import Order Convention

```typescript
// 1. React and Next.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. External libraries (alphabetical)
import { createScraper, CompanyTypes } from 'israeli-bank-scrapers'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// 3. Internal lib utilities
import { decryptBankCredentials } from '@/lib/encryption'
import { getErrorMessage } from '@/lib/bankErrorMessages'

// 4. Server services
import { scrapeBank, BankScraperError } from '@/server/services/bank-scraper.service'

// 5. tRPC
import { trpc } from '@/lib/trpc/client'

// 6. UI components
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

// 7. Types (separate from imports)
import type { BankProvider, ConnectionStatus } from '@prisma/client'

// 8. Relative imports (same directory)
import { OtpModal } from './OtpModal'
import { BankSelectionStep } from './BankSelectionStep'
```

---

## Testing Patterns

### Unit Test Example

```typescript
// /src/server/services/__tests__/bank-scraper.service.test.ts

import { describe, it, expect, vi } from 'vitest'
import { scrapeBank, BankScraperError } from '../bank-scraper.service'
import * as israeliBankScrapers from 'israeli-bank-scrapers'

// Mock israeli-bank-scrapers
vi.mock('israeli-bank-scrapers', () => ({
  createScraper: vi.fn(),
  CompanyTypes: {
    otsarHahayal: 'otsar_hahayal',
    visaCal: 'visa_cal',
  },
}))

describe('bank-scraper.service', () => {
  describe('scrapeBank', () => {
    it('should successfully scrape FIBI transactions', async () => {
      // Mock scraper result
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: true,
          accounts: [
            {
              accountNumber: '1234',
              balance: 5000,
              txns: [
                {
                  date: '2024-01-15',
                  processedDate: '2024-01-15',
                  chargedAmount: 127.5,
                  description: 'SuperSal',
                  memo: '',
                  status: 'completed',
                },
              ],
            },
          ],
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper)

      // Execute
      const result = await scrapeBank({
        bank: 'FIBI',
        encryptedCredentials: 'encrypted_credentials_here',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].description).toBe('SuperSal')
      expect(result.transactions[0].amount).toBe(127.5)
    })

    it('should throw BankScraperError for invalid credentials', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: false,
          errorType: 'INVALID_PASSWORD',
          errorMessage: 'Wrong password',
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toThrow(BankScraperError)

      await expect(
        scrapeBank({
          bank: 'FIBI',
          encryptedCredentials: 'encrypted_credentials_here',
        })
      ).rejects.toMatchObject({
        errorType: 'INVALID_CREDENTIALS',
        message: expect.stringContaining('Invalid username or password'),
      })
    })

    it('should skip pending transactions', async () => {
      const mockScraper = {
        scrape: vi.fn().mockResolvedValue({
          success: true,
          accounts: [
            {
              txns: [
                { status: 'completed', chargedAmount: 100, description: 'Completed Txn', date: '2024-01-15', processedDate: '2024-01-15' },
                { status: 'pending', chargedAmount: 50, description: 'Pending Txn', date: '2024-01-16', processedDate: '2024-01-16' },
              ],
            },
          ],
        }),
      }

      vi.mocked(israeliBankScrapers.createScraper).mockReturnValue(mockScraper)

      const result = await scrapeBank({
        bank: 'FIBI',
        encryptedCredentials: 'encrypted_credentials_here',
      })

      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].description).toBe('Completed Txn')
    })
  })
})
```

---

## Summary

**Key Patterns:**
1. **Scraper Service Wrapper** - Isolate israeli-bank-scrapers in service layer
2. **Custom Error Class** - BankScraperError with categorized error types
3. **Multi-Step Wizard** - State-driven wizard with progress indicator
4. **OTP Modal** - Countdown timer with async callback
5. **Centralized Error Messages** - User-friendly messages in bankErrorMessages.ts
6. **tRPC Mutation Pattern** - Verify ownership, create SyncLog, handle errors
7. **Form Validation** - react-hook-form + Zod with error display
8. **Sanitized Logging** - No credentials logged, only userId first 3 chars

**Code Quality:**
- TypeScript strict mode
- Comprehensive JSDoc comments
- Consistent import order
- No `any` types (use `unknown` with guards)
- Test coverage >80% for scraper service

**Security:**
- Decrypt credentials in-memory only
- Never log credentials or OTP
- Sanitize error messages before storage
- Close browser contexts after scrape
