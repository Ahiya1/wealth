# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Iteration 18 integrates the **israeli-bank-scrapers** library (v6.2.5) for FIBI and Visa CAL bank connections with comprehensive 2FA handling. The existing codebase provides excellent foundations: AES-256-GCM encryption infrastructure (Iteration 17), robust tRPC mutation patterns, shadcn/ui Dialog components for modals, react-hook-form + Zod for validation, and a multi-step wizard pattern from onboarding. The primary risk is screen scraping fragility requiring extensive testing (2-3 days recommended). Success depends on proper error categorization, OTP timeout handling, and secure credential management patterns already established.

## Discoveries

### Israeli Bank Scrapers Library Analysis

**Package:** `israeli-bank-scrapers` v6.2.5  
**Repository:** https://github.com/eshaham/israeli-bank-scrapers  
**Node Requirement:** >= 18.19.0 (compatible with project)  
**Maturity:** 100+ versions since 2017, active maintenance

**Supported Institutions:**
- First International Bank (FIBI) - Bank Code 031 - REQUIRED for Iteration 18
- Visa CAL credit card - REQUIRED for Iteration 18
- 16 other Israeli banks (Hapoalim, Leumi, Discount, Mizrahi, etc.) - Future expansion

**Core API Pattern:**
```typescript
import { CompanyTypes, createScraper } from 'israeli-bank-scrapers';

const options = {
  companyId: CompanyTypes.fibi, // or CompanyTypes.visaCal
  startDate: new Date('2020-05-01'),
  combineInstallments: false,
  showBrowser: false // headless mode for production
};

const credentials = {
  username: 'user123',
  password: 'pass456',
  // OTP handling required for 2FA
};

const scraper = createScraper(options);
const scrapeResult = await scraper.scrape(credentials);

if (scrapeResult.success) {
  scrapeResult.accounts.forEach((account) => {
    account.txns.forEach((txn) => {
      // txn: { date, processedDate, originalAmount, description, status }
    });
  });
} else {
  // errorType: INVALID_PASSWORD, CHANGE_PASSWORD, ACCOUNT_BLOCKED, TIMEOUT, etc.
}
```

**Transaction Structure:**
```typescript
{
  type: 'normal' | 'installments',
  date: string, // ISO date
  processedDate: string, // ISO date
  originalAmount: number,
  originalCurrency: string,
  chargedAmount: number,
  description: string,
  memo: string,
  status: 'completed' | 'pending',
  installments?: { number: int, total: int }
}
```

**Error Types:**
- `INVALID_PASSWORD` - Wrong credentials
- `CHANGE_PASSWORD` - Password expired
- `ACCOUNT_BLOCKED` - Too many failed attempts
- `TIMEOUT` - Network/scraper timeout
- `GENERIC` - Unknown error
- `UNKNOWN_ERROR` - Catch-all

**2FA/OTP Support:**
Library supports OTP but requires interactive handling - credentials must be updated dynamically during scrape operation. This is the HIGHEST RISK component.

### Existing Encryption Infrastructure (Iteration 17)

**File:** `/src/lib/encryption.ts`

**Pattern Established:**
```typescript
import { encryptBankCredentials, decryptBankCredentials } from '@/lib/encryption'

interface BankCredentials {
  userId: string       // Bank user ID (not Wealth user ID)
  password: string     // Bank password
  otp?: string        // Optional 2FA code
}

// Encrypt before storing
const encrypted = encryptBankCredentials({ userId, password, otp })

// Decrypt only in-memory during sync
const credentials = decryptBankCredentials(encrypted)
// Use credentials immediately
// Clear from memory after use
```

**Security Features:**
- AES-256-GCM authenticated encryption
- Random IV per encryption (different ciphertext each time)
- Tamper detection via GCM auth tag
- Format: `iv:authTag:encrypted` (all hex strings)
- Environment variable: `ENCRYPTION_KEY` (64-char hex)
- **CRITICAL:** Credentials never logged (only first 3 chars + ***)

**Test Coverage:** 9 comprehensive tests (100% passing)
- Round-trip encryption/decryption
- IV randomization verification
- Tampered ciphertext detection
- Hebrew character support (Israeli compatibility)
- Special character handling
- Validation (missing userId/password)

**Recommendation:** REUSE existing encryption utilities unchanged. Add OTP field to credentials during sync operation only.

### BankConnection Model (Iteration 17)

**Schema:** `/prisma/schema.prisma`

```prisma
model BankConnection {
  id                   String           @id @default(cuid())
  userId               String
  bank                 BankProvider     // FIBI | VISA_CAL
  accountType          AccountType      // CHECKING | CREDIT
  encryptedCredentials String           @db.Text
  accountIdentifier    String           // Last 4 digits
  status               ConnectionStatus // ACTIVE | ERROR | EXPIRED
  lastSynced           DateTime?
  lastSuccessfulSync   DateTime?
  errorMessage         String?          @db.Text
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  user     User      @relation(...)
  syncLogs SyncLog[]

  @@index([userId])
  @@index([status])
  @@index([userId, status])
  @@index([lastSynced])
}

model SyncLog {
  id                   String     @id @default(cuid())
  bankConnectionId     String
  startedAt            DateTime
  completedAt          DateTime?
  status               SyncStatus // SUCCESS | PARTIAL | FAILED
  transactionsImported Int        @default(0)
  transactionsSkipped  Int        @default(0)
  errorDetails         String?    @db.Text
  createdAt            DateTime   @default(now())

  bankConnection BankConnection @relation(...)

  @@index([bankConnectionId])
  @@index([createdAt(sort: Desc)])
  @@index([status])
}
```

**Enums:**
```prisma
enum BankProvider {
  FIBI           // First International Bank of Israel (031)
  VISA_CAL       // Visa CAL credit card
}

enum ConnectionStatus {
  ACTIVE    // Connection working
  ERROR     // Sync failed
  EXPIRED   // Credentials expired
}

enum SyncStatus {
  SUCCESS   // All transactions imported
  PARTIAL   // Some transactions imported, some failed
  FAILED    // Sync completely failed
}

enum ImportSource {
  MANUAL
  FIBI
  CAL
  PLAID
}
```

**Transaction Enhancements (Iteration 17):**
```prisma
model Transaction {
  // ... existing fields ...
  
  // Import tracking fields
  rawMerchantName          String?               // Original from bank
  importSource             ImportSource?         // FIBI | CAL
  importedAt               DateTime?             // Timestamp
  categorizedBy            CategorizationSource? // AI_CACHED | AI_SUGGESTED
  categorizationConfidence ConfidenceLevel?      // HIGH | MEDIUM | LOW
  
  @@index([importSource])
}
```

### Existing tRPC Router Patterns

**File:** `/src/server/api/routers/bankConnections.router.ts`

**Current Endpoints (Iteration 17):**
```typescript
export const bankConnectionsRouter = router({
  list: protectedProcedure.query(...)      // Get all user's connections
  get: protectedProcedure.input(...).query(...)   // Get single connection
  add: protectedProcedure.input(...).mutation(...) // Add new connection
  update: protectedProcedure.input(...).mutation(...) // Update status/credentials
  delete: protectedProcedure.input(...).mutation(...) // Delete connection
  test: protectedProcedure.input(...).mutation(...) // STUB - needs implementation
})
```

**Pattern for Iteration 18:**
```typescript
// ADD these endpoints:

testConnection: protectedProcedure
  .input(z.object({
    id: z.string(),
    otp: z.string().optional(), // For 2FA retry
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Fetch connection + decrypt credentials
    // 2. Call israeli-bank-scrapers
    // 3. Handle errors (INVALID_PASSWORD, OTP_TIMEOUT, etc.)
    // 4. Update connection status
    // 5. Return success/error
  }),

sync: protectedProcedure
  .input(z.object({
    id: z.string(),
    otp: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Create SyncLog (status: PENDING, startedAt: now)
    // 2. Decrypt credentials
    // 3. Call scraper
    // 4. Map transactions to our Transaction model
    // 5. Update SyncLog (completedAt, status, transactionsImported)
    // 6. Return result
  }),

// For Iteration 19 (not this iteration):
syncStatus: protectedProcedure
  .input(z.object({ syncLogId: z.string() }))
  .query(async ({ ctx, input }) => {
    // Real-time sync progress
  }),
```

**Error Handling Pattern (Existing):**
```typescript
import { TRPCError } from '@trpc/server'

// Ownership verification
if (!connection || connection.userId !== ctx.user.id) {
  throw new TRPCError({ code: 'NOT_FOUND' })
}

// Business logic errors
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Failed to add bank connection',
  cause: error,
})

// Validation errors (Zod handles automatically)
```

### Existing Form Patterns

**Multi-Step Wizard Pattern (Onboarding):**

**File:** `/src/components/onboarding/OnboardingWizard.tsx`

```typescript
export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const utils = trpc.useUtils()

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 4))
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <OnboardingProgress currentStep={currentStep} totalSteps={4} />
        
        {currentStep === 1 && <OnboardingStep1Welcome onNext={handleNext} />}
        {currentStep === 2 && <OnboardingStep2Features onNext={handleNext} onBack={handleBack} />}
        {currentStep === 3 && <OnboardingStep3Start onNext={handleNext} onBack={handleBack} />}
        {currentStep === 4 && <OnboardingStep4Complete onComplete={handleComplete} />}
      </DialogContent>
    </Dialog>
  )
}
```

**Form Validation Pattern (react-hook-form + Zod):**

**File:** `/src/components/recurring/RecurringTransactionForm.tsx`

```typescript
const schema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  amount: z.number({ invalid_type_error: 'Amount must be a number' }),
  payee: z.string().min(1, 'Payee is required'),
  // ... more fields
})

type FormData = z.infer<typeof schema>

export function RecurringTransactionForm({ onSuccess }: Props) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  const createRecurring = trpc.recurring.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Recurring transaction created successfully' })
      utils.recurring.list.invalidate()
      reset()
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { frequency: 'MONTHLY', interval: 1 },
  })

  const onSubmit = async (data: FormData) => {
    createRecurring.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Form fields */}
    </form>
  )
}
```

**Recommendation for Iteration 18:**

**Bank Connection Wizard Structure:**
```
Step 1: Select Bank (FIBI or CAL)
Step 2: Enter Credentials (userId + password)
Step 3: Handle 2FA/OTP (if required)
Step 4: Test Connection (loading state)
Step 5: Initial Import Prompt (import last 30 days?)
```

Use existing `Dialog` component + state machine pattern from onboarding wizard.

### Existing Modal/Dialog Components

**File:** `/src/components/ui/dialog.tsx` (shadcn/ui)

**Available Components:**
```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
```

**Usage Pattern:**
```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Add Bank Connection</DialogTitle>
      <DialogDescription>
        Connect your First International Bank account
      </DialogDescription>
    </DialogHeader>
    
    {/* Form content */}
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button type="submit">Connect</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Features:**
- Responsive (mobile-friendly)
- Keyboard navigation (Esc to close)
- Click outside to close
- Accessible (ARIA attributes)
- Animated transitions
- Max height with scroll (overflow-auto)

**OTP Modal Pattern:**
```typescript
<Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
  <DialogContent className="sm:max-w-[400px]">
    <DialogHeader>
      <DialogTitle>Enter SMS Code</DialogTitle>
      <DialogDescription>
        SMS code sent to ***1234. Code expires in 3 minutes.
      </DialogDescription>
    </DialogHeader>
    
    <Input
      type="text"
      placeholder="000000"
      maxLength={6}
      value={otp}
      onChange={(e) => setOtp(e.target.value)}
    />
    
    <DialogFooter>
      <Button variant="outline" onClick={handleOtpCancel}>Cancel</Button>
      <Button onClick={handleOtpSubmit} disabled={otp.length !== 6}>
        Verify
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Existing Toast Notification System

**File:** `/src/components/ui/use-toast.tsx`

**Usage Pattern:**
```typescript
import { useToast } from '@/components/ui/use-toast'

const { toast } = useToast()

// Success toast
toast({
  title: 'Connection successful',
  description: 'Your bank account is now connected',
})

// Error toast
toast({
  title: 'Connection failed',
  description: 'Invalid credentials. Please try again.',
  variant: 'destructive',
})

// Loading toast (manual dismiss)
const toastId = toast({
  title: 'Syncing transactions...',
  description: 'This may take up to 60 seconds',
})

// Update toast
toastId.update({
  title: 'Sync complete',
  description: 'Imported 47 new transactions',
})
```

**Features:**
- Max 1 toast at a time (TOAST_LIMIT = 1)
- Auto-dismiss after timeout
- Manual dismiss via `toastId.dismiss()`
- Update existing toast via `toastId.update(props)`
- Variants: `default`, `destructive`

**Recommendation for Iteration 18:**
```typescript
// Sync flow
const syncToast = toast({ title: 'Syncing transactions...' })

try {
  const result = await syncMutation.mutateAsync({ id: connectionId })
  syncToast.update({
    title: 'Sync complete',
    description: `Imported ${result.transactionsImported} new transactions`,
  })
} catch (error) {
  syncToast.update({
    title: 'Sync failed',
    description: error.message,
    variant: 'destructive',
  })
}
```

### Existing AI Categorization Service

**File:** `/src/server/services/categorize.service.ts`

**Core Functions:**
```typescript
export async function categorizeTransactions(
  userId: string,
  transactions: TransactionToCategorize[],
  prismaClient: PrismaClient
): Promise<CategorizationResult[]>

interface TransactionToCategorize {
  id: string
  payee: string
  amount: number
}

interface CategorizationResult {
  transactionId: string
  categoryName: string
  categoryId: string | null
  confidence: 'high' | 'low'
}
```

**Categorization Flow:**
1. Check `MerchantCategoryCache` for each transaction (instant, high confidence)
2. Batch uncached transactions (50 per API call)
3. Call Claude API (model: `claude-3-5-sonnet-20241022`, temp: 0.2)
4. Cache successful categorizations
5. Return results with confidence levels

**Cache Hit Rate:** Estimated 70-80% on second sync (per master plan)

**Integration Pattern for Iteration 18:**
```typescript
// After importing transactions from scraper
const uncategorizedTxns = importedTransactions.map(txn => ({
  id: txn.id,
  payee: txn.rawMerchantName,
  amount: txn.amount,
}))

const results = await categorizeTransactions(
  ctx.user.id,
  uncategorizedTxns,
  ctx.prisma
)

// Update transactions with categories
for (const result of results) {
  await ctx.prisma.transaction.update({
    where: { id: result.transactionId },
    data: {
      categoryId: result.categoryId,
      categorizedBy: result.confidence === 'high' ? 'AI_CACHED' : 'AI_SUGGESTED',
      categorizationConfidence: result.confidence === 'high' ? 'HIGH' : 'MEDIUM',
    },
  })
}
```

**Cost Optimization:**
- Batch API calls (50 transactions per request)
- Cache aggressively (normalized merchant names)
- Skip recategorization if already categorized

**Recommendation:** Defer AI categorization integration to Iteration 19. Focus Iteration 18 on scraper integration and 2FA handling only.

## Patterns Identified

### Pattern 1: Screen Scraper Wrapper Service

**Description:** Encapsulate israeli-bank-scrapers library in a service layer with error mapping and credential management

**Use Case:** Abstract scraper complexity, handle errors consistently, enable future scraper library replacement

**Example:**
```typescript
// /src/server/services/bank-scraper.service.ts

import { CompanyTypes, createScraper } from 'israeli-bank-scrapers'
import { decryptBankCredentials } from '@/lib/encryption'
import type { BankProvider } from '@prisma/client'

export class BankScraperError extends Error {
  constructor(
    public errorType: 'INVALID_CREDENTIALS' | 'OTP_REQUIRED' | 'OTP_TIMEOUT' | 'NETWORK_ERROR' | 'SCRAPER_BROKEN' | 'BANK_MAINTENANCE' | 'ACCOUNT_BLOCKED' | 'PASSWORD_EXPIRED',
    message: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'BankScraperError'
  }
}

interface ScrapeOptions {
  bank: BankProvider
  encryptedCredentials: string
  startDate?: Date
  endDate?: Date
  otp?: string
}

interface ScrapeResult {
  success: boolean
  transactions: ImportedTransaction[]
  accountNumber?: string
  balance?: number
}

interface ImportedTransaction {
  date: Date
  processedDate: Date
  amount: number
  description: string
  memo?: string
  status: 'completed' | 'pending'
}

export async function scrapeBank(options: ScrapeOptions): Promise<ScrapeResult> {
  // 1. Decrypt credentials
  const credentials = decryptBankCredentials(options.encryptedCredentials)
  
  // 2. Map bank to CompanyTypes
  const companyId = options.bank === 'FIBI' 
    ? CompanyTypes.fibi 
    : CompanyTypes.visaCal
  
  // 3. Create scraper
  const scraper = createScraper({
    companyId,
    startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    combineInstallments: false,
    showBrowser: false, // headless mode
  })
  
  // 4. Scrape with timeout
  const scrapeCredentials = {
    username: credentials.userId,
    password: credentials.password,
    ...(options.otp && { otp: options.otp }), // Add OTP if provided
  }
  
  let result
  try {
    result = await scraper.scrape(scrapeCredentials)
  } catch (error) {
    throw new BankScraperError(
      'NETWORK_ERROR',
      'Failed to connect to bank',
      error as Error
    )
  }
  
  // 5. Handle errors
  if (!result.success) {
    throw mapScraperError(result.errorType, result.errorMessage)
  }
  
  // 6. Map transactions
  const transactions = result.accounts.flatMap(account =>
    account.txns
      .filter(txn => txn.status === 'completed') // Skip pending for Iteration 18
      .map(txn => ({
        date: new Date(txn.date),
        processedDate: new Date(txn.processedDate),
        amount: txn.chargedAmount,
        description: txn.description,
        memo: txn.memo,
        status: txn.status,
      }))
  )
  
  return {
    success: true,
    transactions,
    accountNumber: result.accounts[0]?.accountNumber,
    balance: result.accounts[0]?.balance,
  }
}

function mapScraperError(errorType: string, message: string): BankScraperError {
  switch (errorType) {
    case 'INVALID_PASSWORD':
      return new BankScraperError('INVALID_CREDENTIALS', 'Invalid username or password')
    case 'CHANGE_PASSWORD':
      return new BankScraperError('PASSWORD_EXPIRED', 'Your password has expired. Please update it via your bank.')
    case 'ACCOUNT_BLOCKED':
      return new BankScraperError('ACCOUNT_BLOCKED', 'Account locked due to too many failed login attempts')
    case 'TIMEOUT':
      return new BankScraperError('NETWORK_ERROR', 'Connection timed out. Please try again.')
    default:
      return new BankScraperError('SCRAPER_BROKEN', `Scraper error: ${message}`)
  }
}
```

**Recommendation:** IMPLEMENT this pattern in Iteration 18. Place in `/src/server/services/bank-scraper.service.ts`.

### Pattern 2: 2FA OTP State Machine

**Description:** Multi-state flow for handling OTP entry with timeout and retry logic

**Use Case:** Handle SMS 2FA during bank connection and sync operations

**Example:**
```typescript
// Client-side state machine
type OtpState = 'idle' | 'waiting_for_otp' | 'validating_otp' | 'otp_success' | 'otp_timeout'

const [otpState, setOtpState] = useState<OtpState>('idle')
const [otpCode, setOtpCode] = useState('')
const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null)

// Flow:
// 1. User submits credentials
// 2. Server responds with OTP_REQUIRED error
// 3. Client transitions to 'waiting_for_otp' state
// 4. Show OTP modal with countdown timer
// 5. User enters OTP
// 6. Client transitions to 'validating_otp'
// 7. Server validates OTP
// 8. Success: transition to 'otp_success' | Failure: retry or timeout

const handleOtpSubmit = async () => {
  setOtpState('validating_otp')
  
  try {
    await testConnection.mutateAsync({
      id: connectionId,
      otp: otpCode,
    })
    setOtpState('otp_success')
  } catch (error) {
    if (error.message.includes('OTP expired')) {
      setOtpState('otp_timeout')
    } else {
      // Retry with new OTP
      setOtpState('waiting_for_otp')
      toast({ title: 'Invalid OTP', description: 'Please try again' })
    }
  }
}
```

**Recommendation:** IMPLEMENT this pattern in Iteration 18. Use for connection wizard Step 3 (2FA handling).

### Pattern 3: Long-Running Mutation with Progress Updates

**Description:** Pattern for sync operations that may take 30-60 seconds with real-time progress feedback

**Use Case:** Manual "Sync Now" operation with loading states and progress updates

**Example:**
```typescript
// Client-side
const [syncProgress, setSyncProgress] = useState<string>('')

const syncMutation = trpc.bankConnections.sync.useMutation({
  onMutate: () => {
    setSyncProgress('Connecting to bank...')
  },
  onSuccess: (result) => {
    toast({
      title: 'Sync complete',
      description: `Imported ${result.transactionsImported} new transactions`,
    })
    utils.bankConnections.list.invalidate()
    utils.transactions.list.invalidate()
  },
  onError: (error) => {
    toast({
      title: 'Sync failed',
      description: error.message,
      variant: 'destructive',
    })
  },
})

// For Iteration 19 (polling pattern):
const { data: syncStatus } = trpc.bankConnections.syncStatus.useQuery(
  { syncLogId },
  {
    enabled: !!syncLogId && syncProgress !== 'complete',
    refetchInterval: 2000, // Poll every 2 seconds
  }
)

// For future (SSE pattern - better than polling):
// Use tRPC subscriptions with Server-Sent Events
```

**Recommendation:** START with simple loading state in Iteration 18. Defer real-time progress updates to Iteration 19 (use polling or SSE).

### Pattern 4: Error Recovery with Actionable Messages

**Description:** Map technical errors to user-friendly messages with clear next steps

**Use Case:** Handle diverse scraper failures with guidance for users

**Example:**
```typescript
function getErrorMessage(error: BankScraperError): {
  title: string
  description: string
  action?: { label: string; handler: () => void }
} {
  switch (error.errorType) {
    case 'INVALID_CREDENTIALS':
      return {
        title: 'Invalid credentials',
        description: 'Please check your username and password',
        action: {
          label: 'Update credentials',
          handler: () => openCredentialsModal(),
        },
      }
    
    case 'PASSWORD_EXPIRED':
      return {
        title: 'Password expired',
        description: 'Please update your password via your bank\'s website, then update your credentials here',
        action: {
          label: 'Open bank website',
          handler: () => window.open('https://fibi.bank.com', '_blank'),
        },
      }
    
    case 'OTP_TIMEOUT':
      return {
        title: 'SMS code expired',
        description: 'The SMS code has expired. Please request a new code.',
        action: {
          label: 'Retry',
          handler: () => retryConnection(),
        },
      }
    
    case 'NETWORK_ERROR':
      return {
        title: 'Connection failed',
        description: 'Unable to connect to bank. Please check your internet connection and try again.',
        action: {
          label: 'Retry',
          handler: () => retryConnection(),
        },
      }
    
    case 'SCRAPER_BROKEN':
      return {
        title: 'Sync temporarily unavailable',
        description: 'The bank may have changed their website. Our team has been notified.',
      }
    
    default:
      return {
        title: 'Sync failed',
        description: 'An unexpected error occurred. Please try again later.',
      }
  }
}
```

**Recommendation:** IMPLEMENT comprehensive error mapping in Iteration 18. Store in `/src/lib/bankErrorMessages.ts`.

## Complexity Assessment

### High Complexity Areas

**1. 2FA/OTP Handling - SPLIT RECOMMENDED**
- **Why complex:** Asynchronous credential updates, timeout management, retry logic, state synchronization
- **Estimated builder splits:** 1 sub-builder for OTP flow (2-3 hours)
- **Main builder focus:** Core scraper integration without 2FA
- **Sub-builder focus:** OTP modal, state machine, timeout countdown, retry logic

**Recommendation:** Main builder implements basic scraper + test connection. Sub-builder adds OTP handling after core works.

**2. israeli-bank-scrapers Integration - HIGH RISK**
- **Why complex:** External dependency, screen scraping fragility, unpredictable errors, network timeouts
- **Testing requirement:** 2-3 days with REAL bank accounts (FIBI + CAL)
- **Failure modes:** 8+ error types to handle
- **Mitigation:** Comprehensive error categorization, retry logic, detailed logging

**Recommendation:** Allocate 60% of iteration time to testing and error handling refinement.

**3. Transaction Mapping - MEDIUM COMPLEXITY**
- **Why complex:** Schema mismatch (scraper format → Transaction model), date parsing, currency handling, pending vs completed filtering
- **Edge cases:** Installments, foreign currency, refunds, null memo fields
- **Estimated effort:** 1-2 hours

**Recommendation:** Create mapping utility function with unit tests.

### Medium Complexity Areas

**1. Connection Wizard UI - MEDIUM**
- **Complexity:** 5-step wizard, state management, form validation, conditional rendering
- **Leverage:** Existing onboarding wizard pattern, react-hook-form + Zod, Dialog component
- **Estimated effort:** 3-4 hours

**2. Test Connection Flow - MEDIUM**
- **Complexity:** Loading states, success/error handling, credential validation, OTP modal trigger
- **Estimated effort:** 2-3 hours

**3. Error Logging & Monitoring - MEDIUM**
- **Complexity:** SyncLog creation, error detail storage, user-facing error messages, sanitization (no credentials in logs)
- **Estimated effort:** 2 hours

### Low Complexity Areas

**1. Bank Selection UI - LOW**
- **Complexity:** Simple dropdown/radio selection between FIBI and CAL
- **Estimated effort:** 30 minutes

**2. Credential Form - LOW**
- **Complexity:** 2 input fields (userId, password), validation, secure input type
- **Leverage:** Existing form patterns
- **Estimated effort:** 1 hour

**3. tRPC Endpoint Additions - LOW**
- **Complexity:** Add `testConnection` and `sync` mutations, follow existing patterns
- **Estimated effort:** 2 hours

## Technology Recommendations

### Primary Stack

**Framework:** Next.js 14 (App Router) - EXISTING
- **Rationale:** Already in use, App Router provides server actions for mutations

**Database:** PostgreSQL (Supabase) - EXISTING
- **Rationale:** Schema already established in Iteration 17

**Type Safety:** Prisma + tRPC + Zod - EXISTING
- **Rationale:** End-to-end type safety from database to frontend

**UI Components:** shadcn/ui (Radix UI primitives) - EXISTING
- **Rationale:** Dialog, Toast, Form components already available

**Form Management:** react-hook-form + @hookform/resolvers (Zod) - EXISTING
- **Rationale:** Proven pattern in existing codebase (RecurringTransactionForm, GoalForm)

### Supporting Libraries

**israeli-bank-scrapers (v6.2.5) - NEW DEPENDENCY**
- **Purpose:** Screen scraping for FIBI and Visa CAL transactions
- **Installation:** `npm install israeli-bank-scrapers --save`
- **Why needed:** No official API for Israeli banks (requires PSD2 license)
- **Alternatives considered:** None (only viable option for MVP)
- **Risk:** Screen scraping fragility - bank UI changes break scrapers
- **Mitigation:** Active maintenance (100+ versions), large user base, error monitoring

**Puppeteer (Bundled with israeli-bank-scrapers) - TRANSITIVE DEPENDENCY**
- **Purpose:** Headless browser for web scraping
- **Size:** ~300 MB (Chromium binary)
- **Deployment consideration:** Ensure Vercel has sufficient disk space, or use `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` + `chrome-aws-lambda` for AWS Lambda

**date-fns (v2.x) - EXISTING**
- **Purpose:** Date parsing and formatting for transaction dates
- **Rationale:** Already in use, ISO date string parsing required

**class-variance-authority (cva) - EXISTING**
- **Purpose:** UI component variants (toast, buttons)
- **Rationale:** Already in use for shadcn/ui components

### Dependencies NOT Needed

**React Query/TanStack Query - EXISTING (via tRPC)**
- Already available through `@tanstack/react-query` (tRPC dependency)

**WebSocket library - DEFER to Iteration 19**
- Simple mutation + polling sufficient for Iteration 18
- SSE/WebSocket for real-time progress in Iteration 19

**Sentry - DEFER to Iteration 20**
- Console logging + SyncLog database records sufficient for testing
- Production monitoring in Iteration 20

**Background job queue (BullMQ, etc.) - OUT OF SCOPE**
- Manual sync only for MVP
- Automatic scheduled sync deferred to post-MVP

## Integration Points

### External APIs

**1. israeli-bank-scrapers (NPM Package)**
- **Purpose:** Scrape transactions from FIBI and Visa CAL
- **Complexity:** HIGH (screen scraping)
- **Considerations:**
  - Timeout handling (60s+ for some banks)
  - OTP requirement detection (library may prompt for OTP mid-scrape)
  - Error categorization (8+ error types)
  - Headless browser overhead (Puppeteer binary size)
- **Data flow:** Encrypted credentials → Scraper → Raw transactions → Transaction mapping → Database

**2. Claude AI API (Anthropic) - EXISTING**
- **Purpose:** Categorize imported transactions
- **Integration:** Defer to Iteration 19
- **Existing service:** `/src/server/services/categorize.service.ts` already implemented

**3. Supabase Auth - EXISTING**
- **Purpose:** User authentication, session management
- **Integration:** Already used in `protectedProcedure` (tRPC context)

### Internal Integrations

**1. Encryption Service ↔ Bank Scraper Service**
- **Connection:** Decrypt credentials before scraping, clear from memory after
- **Pattern:** 
  ```typescript
  const credentials = decryptBankCredentials(connection.encryptedCredentials)
  const result = await scrapeBank({ bank, credentials, startDate, endDate })
  // credentials cleared from memory automatically (garbage collection)
  ```

**2. Bank Scraper Service ↔ Transaction Model**
- **Connection:** Map scraper output to Prisma Transaction schema
- **Pattern:**
  ```typescript
  const transactions = scrapeResult.transactions.map(txn => ({
    userId: ctx.user.id,
    accountId: connection.accountId,
    date: txn.date,
    amount: new Decimal(txn.amount),
    payee: txn.description,
    rawMerchantName: txn.description,
    importSource: connection.bank === 'FIBI' ? 'FIBI' : 'CAL',
    importedAt: new Date(),
    // categoryId set to 'Miscellaneous' default for Iteration 18
    // AI categorization in Iteration 19
  }))
  
  await ctx.prisma.transaction.createMany({ data: transactions })
  ```

**3. tRPC Router ↔ SyncLog Model**
- **Connection:** Create SyncLog before scraping, update after completion
- **Pattern:**
  ```typescript
  const syncLog = await ctx.prisma.syncLog.create({
    data: {
      bankConnectionId: input.id,
      startedAt: new Date(),
      status: 'FAILED', // Default to FAILED, update on success
    },
  })
  
  try {
    const result = await scrapeBank(options)
    
    await ctx.prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status: 'SUCCESS',
        transactionsImported: result.transactions.length,
      },
    })
  } catch (error) {
    await ctx.prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status: 'FAILED',
        errorDetails: error.message,
      },
    })
  }
  ```

**4. Connection Wizard ↔ tRPC Mutations**
- **Connection:** Multi-step form calls `testConnection` then `add` mutations
- **Pattern:**
  ```typescript
  // Step 2: Enter credentials → validate locally (Zod)
  // Step 3: Handle 2FA → if OTP required, show modal
  // Step 4: Test connection → call testConnection mutation
  // Step 5: Save connection → call add mutation
  ```

## Risks & Challenges

### Technical Risks

**1. Screen Scraping Fragility - CRITICAL RISK**
- **Impact:** Bank UI changes break scrapers without warning
- **Likelihood:** MEDIUM (banks update UIs quarterly)
- **Mitigation:**
  - Monitor israeli-bank-scrapers GitHub for updates
  - Implement comprehensive error logging (categorize scraper failures)
  - Add scraper health dashboard (track success rate by bank)
  - Communicate risk to users via disclaimer ("This may fail if bank changes website")
  - Plan migration path to official Open Banking APIs (PSD2 license in future)

**2. OTP Timeout Complexity - HIGH RISK**
- **Impact:** Users frustrated by timeout errors, abandoned connections
- **Likelihood:** MEDIUM (SMS delays, user distraction)
- **Mitigation:**
  - Set 3-5 minute OTP timeout (not 30 seconds)
  - Show countdown timer prominently
  - Allow retry without re-entering credentials
  - Provide clear error messages ("Code expired, please request new code")

**3. Puppeteer Binary Size - MEDIUM RISK**
- **Impact:** Vercel deployment failures, slow builds, disk quota exceeded
- **Likelihood:** MEDIUM (Puppeteer ~300 MB)
- **Mitigation:**
  - Verify Vercel plan supports large dependencies (Vercel Pro recommended)
  - Consider `chrome-aws-lambda` for serverless environments (lighter)
  - Monitor build size via `npm run build` output
  - Document deployment requirements in README

**4. 60s+ Sync Timeout - MEDIUM RISK**
- **Impact:** Vercel serverless function timeout (default 10s, max 60s on Pro)
- **Likelihood:** HIGH (scraping can take 30-60s)
- **Mitigation:**
  - **REQUIRED:** Upgrade to Vercel Pro ($20/month) OR implement background queue
  - Set function timeout to 60s via `vercel.json`
  - Add timeout handling in client (show "This may take up to 60s" message)
  - Future: Move to background queue (BullMQ + Redis) for post-MVP

**5. Credential Expiration - LOW RISK**
- **Impact:** Syncs fail silently until user updates credentials
- **Likelihood:** MEDIUM (banks force password changes every 90 days)
- **Mitigation:**
  - Set connection status to `EXPIRED` on password change errors
  - Show notification: "Your FIBI password expired, please update in Settings"
  - Provide "Update Credentials" button in bank connections list

### Complexity Risks

**1. Builder May Need to Split 2FA Flow - MEDIUM RISK**
- **Likelihood:** MEDIUM (if OTP flow proves complex)
- **Recommendation:**
  - Main builder: Core scraper integration + test connection (without OTP)
  - Sub-builder: OTP modal + state machine + timeout handling (2-3 hours)
  - Integration point: Test connection mutation returns `OTP_REQUIRED` error

**2. Testing with Real Bank Accounts Required - HIGH EFFORT**
- **Likelihood:** CERTAIN (cannot test scrapers without real credentials)
- **Mitigation:**
  - Allocate 2-3 days for real-world testing
  - Test both FIBI and CAL with multiple scenarios:
    - Valid credentials (happy path)
    - Invalid credentials
    - Expired password
    - OTP required
    - No transactions found
    - Network timeout
  - Document test results in SyncLog records
  - Create scraper health monitoring script

**3. Error Message Mapping Incomplete - MEDIUM RISK**
- **Likelihood:** MEDIUM (scrapers may return unexpected error codes)
- **Mitigation:**
  - Start with 8 known error types (INVALID_PASSWORD, TIMEOUT, etc.)
  - Add catch-all `GENERIC` error type
  - Log unhandled errors to console for future mapping
  - Iterate on error messages based on real testing feedback

## Recommendations for Planner

### 1. Allocate 60% of Iteration Time to Testing

**Rationale:** Screen scraping is HIGH RISK. Cannot validate without real bank accounts.

**Testing Plan:**
- Day 1: Implement scraper wrapper + connection wizard UI
- Day 2: Integration testing with REAL FIBI test account (20+ test scenarios)
- Day 3: Integration testing with REAL CAL test account (20+ test scenarios)
- Document failure patterns in SyncLog, refine error handling

**Success Criteria:**
- >80% success rate over 20 connection attempts (excluding credential errors)
- All 8 error types properly categorized and displayed to user
- OTP flow works end-to-end with real SMS codes

### 2. Implement Scraper Service Layer (Not Direct Library Calls)

**Rationale:** Abstract scraper complexity, enable future library replacement, consistent error handling.

**Structure:**
```
/src/server/services/bank-scraper.service.ts
  - scrapeBank(options) → ScrapeResult
  - mapScraperError(errorType) → BankScraperError
  - mapTransactions(scraperTxns) → Transaction[]

/src/server/api/routers/bankConnections.router.ts
  - testConnection mutation → calls scrapeBank()
  - sync mutation → calls scrapeBank() + creates SyncLog
```

**Benefits:**
- Single point of change if scraper library updates
- Consistent error categorization across all operations
- Testable (mock scraper service in tests)

### 3. Use Multi-Step Wizard Pattern from Onboarding

**Rationale:** Proven pattern, reduces cognitive load, handles complex 2FA flow gracefully.

**Structure:**
```
Step 1: Select Bank (FIBI or CAL) + Account Type (CHECKING or CREDIT)
Step 2: Enter Credentials (userId + password)
Step 3: Handle 2FA (if required) - OTP modal with countdown timer
Step 4: Test Connection (loading state, call testConnection mutation)
Step 5: Initial Import Prompt ("Import last 30 days?" Yes/No)
```

**Component:**
```
/src/components/bank-connections/BankConnectionWizard.tsx
  - Reuse Dialog component
  - Reuse state machine pattern (currentStep state)
  - Reuse react-hook-form + Zod validation
```

### 4. Defer AI Categorization to Iteration 19

**Rationale:** Reduce Iteration 18 scope, focus on HIGH RISK scraper integration.

**Iteration 18 Plan:**
- Import transactions with `categoryId` set to "Miscellaneous" default
- Set `categorizedBy` to `null`
- Set `categorizationConfidence` to `null`

**Iteration 19 Plan:**
- After import, call `categorizeTransactions(userId, transactions, prisma)`
- Update transactions with AI-suggested categories
- Leverage existing MerchantCategoryCache (70-80% hit rate)

**Benefits:**
- Simpler Iteration 18 (focus on scraper reliability)
- Faster validation (no AI API calls to test)
- Clear separation of concerns

### 5. Add Comprehensive Error Categorization

**Rationale:** User-friendly error messages reduce support burden, increase trust.

**Error Mapping:**
```typescript
// /src/lib/bankErrorMessages.ts

export const errorMessages = {
  INVALID_CREDENTIALS: {
    title: 'Invalid credentials',
    description: 'Please check your username and password',
    action: 'Update credentials',
  },
  PASSWORD_EXPIRED: {
    title: 'Password expired',
    description: 'Please update your password via your bank\'s website',
    action: 'Open bank website',
  },
  OTP_TIMEOUT: {
    title: 'SMS code expired',
    description: 'Please request a new code',
    action: 'Retry',
  },
  NETWORK_ERROR: {
    title: 'Connection failed',
    description: 'Unable to connect to bank. Please try again.',
    action: 'Retry',
  },
  SCRAPER_BROKEN: {
    title: 'Sync temporarily unavailable',
    description: 'The bank may have changed their website. Our team has been notified.',
  },
  ACCOUNT_BLOCKED: {
    title: 'Account locked',
    description: 'Too many failed login attempts. Please contact your bank.',
  },
  BANK_MAINTENANCE: {
    title: 'Bank under maintenance',
    description: 'Please try again later',
  },
  GENERIC: {
    title: 'Sync failed',
    description: 'An unexpected error occurred. Please try again later.',
  },
}
```

### 6. Consider Builder Split for 2FA Complexity

**Recommendation:** OPTIONAL split based on builder's assessment during implementation.

**Main Builder Scope (6-8 hours):**
- Scraper service wrapper
- Connection wizard UI (Steps 1, 2, 4, 5)
- Test connection mutation (without OTP)
- Error handling and logging
- Testing with FIBI/CAL (basic flow)

**Sub-Builder Scope (2-3 hours) - IF NEEDED:**
- OTP modal component
- OTP state machine (idle → waiting → validating → success/timeout)
- Countdown timer (3-5 minutes)
- Retry logic
- OTP parameter in testConnection mutation

**Integration Point:**
```typescript
// Main builder returns OTP_REQUIRED error
throw new BankScraperError('OTP_REQUIRED', 'Please enter SMS code')

// Sub-builder handles in UI
if (error.errorType === 'OTP_REQUIRED') {
  setShowOtpModal(true)
}
```

### 7. Set Vercel Function Timeout to 60s

**Rationale:** Scraping operations can take 30-60s (especially with 2FA).

**Configuration:**
```json
// vercel.json
{
  "functions": {
    "src/app/api/trpc/[trpc]/route.ts": {
      "maxDuration": 60
    }
  }
}
```

**Requirements:**
- Vercel Pro plan ($20/month) - max 60s timeout
- OR implement background queue (BullMQ + Redis) - deferred to post-MVP

**Client Handling:**
```typescript
// Show "This may take up to 60 seconds" message
toast({ title: 'Syncing transactions...', description: 'This may take up to 60 seconds' })
```

### 8. Document Scraper Fragility for Users

**Rationale:** Set expectations, reduce support burden, build trust.

**Disclaimer (Connection Wizard):**
```
⚠️ Important: Wealth uses screen scraping to access your bank data
- This is NOT an official API (banks don't provide one for Israeli users)
- Sync may fail if your bank changes their website
- We encrypt your credentials with AES-256-GCM
- You can delete your connection anytime
- This violates your bank's Terms of Service (use at your own risk)

[ ] I understand and consent to the above
```

**Recommendation:** Add checkbox in Step 1 of connection wizard (cannot proceed without consent).

## Resource Map

### Critical Files/Directories

**New Files (Iteration 18):**
```
/src/server/services/bank-scraper.service.ts
  - scrapeBank() function
  - BankScraperError class
  - Transaction mapping utilities

/src/lib/bankErrorMessages.ts
  - Error message mapping
  - User-facing error strings

/src/components/bank-connections/BankConnectionWizard.tsx
  - Multi-step wizard component
  - Steps 1-5 implementation

/src/components/bank-connections/OtpModal.tsx
  - OTP input modal
  - Countdown timer
  - Retry logic

/src/components/bank-connections/BankConnectionsList.tsx
  - List of connected banks
  - Status badges
  - Delete confirmation
```

**Modified Files (Iteration 18):**
```
/src/server/api/routers/bankConnections.router.ts
  - Add testConnection mutation (real implementation)
  - Add sync mutation (scraper + SyncLog)

/package.json
  - Add israeli-bank-scrapers dependency

/vercel.json
  - Add maxDuration: 60 for tRPC functions
```

**Files from Iteration 17 (Reuse):**
```
/src/lib/encryption.ts
  - encryptBankCredentials()
  - decryptBankCredentials()

/prisma/schema.prisma
  - BankConnection model
  - SyncLog model
  - Enums (BankProvider, ConnectionStatus, SyncStatus)
```

### Key Dependencies

**New:**
- `israeli-bank-scrapers` (v6.2.5) - Screen scraping library
  - Install: `npm install israeli-bank-scrapers --save`
  - Size: ~5 MB package + ~300 MB Puppeteer binary
  - Purpose: Scrape FIBI and Visa CAL transactions

**Existing (Reuse):**
- `@radix-ui/react-dialog` (v1.1.15) - Modal/dialog components
- `@radix-ui/react-toast` (v1.2.15) - Toast notifications
- `react-hook-form` (v7.x) - Form management
- `@hookform/resolvers` (v3.9.1) - Zod integration
- `zod` (v3.x) - Schema validation
- `@prisma/client` (v5.22.0) - Database ORM
- `@trpc/client` + `@trpc/next` (v11.6.0) - Type-safe APIs
- `date-fns` (v2.x) - Date parsing

### Testing Infrastructure

**Unit Tests:**
```
/src/server/services/__tests__/bank-scraper.service.test.ts
  - Mock israeli-bank-scrapers responses
  - Test error categorization
  - Test transaction mapping
```

**Integration Tests (Manual with Real Accounts):**
```
/scripts/test-fibi-connection.ts
  - Test FIBI scraper with real credentials
  - Log results to console + SyncLog
  - Verify 20+ scenarios

/scripts/test-cal-connection.ts
  - Test CAL scraper with real credentials
  - Verify OTP flow
  - Test pending vs completed filtering
```

**E2E Tests (Deferred to Iteration 20):**
- Playwright MCP not used in Iteration 18 (no user-facing flows to test yet)

## Questions for Planner

### 1. Vercel Pro Tier Required?

**Context:** israeli-bank-scrapers can take 30-60s to scrape. Vercel Hobby tier has 10s max function timeout. Vercel Pro ($20/month) allows 60s timeout.

**Question:** Should we:
- A) Require Vercel Pro tier for deployment ($20/month)
- B) Implement background queue (BullMQ + Redis) - adds complexity
- C) Accept 10s timeout and handle failures gracefully - poor UX

**Recommendation:** Option A (Vercel Pro) for MVP. Option B for post-MVP if scaling.

### 2. OTP Flow Complexity - Split Required?

**Context:** 2FA/OTP handling involves state machine, timeout countdown, retry logic, and asynchronous credential updates.

**Question:** Should builder split into:
- Main builder: Core scraper integration (6-8 hours)
- Sub-builder: OTP flow (2-3 hours)

**Recommendation:** OPTIONAL split. Let builder decide during implementation based on complexity assessment.

### 3. Pending Transactions - Import or Skip?

**Context:** Credit card transactions have "pending" status (not yet posted). Importing pending creates duplicates when they post.

**Question:** Should we:
- A) Skip pending transactions (simpler, no duplicates)
- B) Import pending but mark differently (more data, duplicate risk)

**Recommendation:** Option A for Iteration 18. Option B in future (requires duplicate detection enhancement).

### 4. Initial Import Date Range?

**Context:** First sync should import historical transactions. Banks typically support 30-90 days history.

**Question:** Should we:
- A) Import last 30 days on first sync
- B) Let user choose date range (7/30/90 days)
- C) Import maximum available (90 days)

**Recommendation:** Option A for MVP. Option B in future (Step 5 of wizard).

### 5. Scraper Health Monitoring?

**Context:** Screen scraping can break silently if bank changes website. Need to detect degraded success rates.

**Question:** Should we:
- A) Add scraper health dashboard (success rate by bank)
- B) Just log to console + SyncLog
- C) Add alerting (Sentry integration)

**Recommendation:** Option B for Iteration 18. Option C in Iteration 20 (production monitoring).

### 6. Transaction Categorization - Defer to Iteration 19?

**Context:** AI categorization service already exists. Could integrate in Iteration 18 or defer.

**Question:** Should we:
- A) Integrate AI categorization in Iteration 18 (bloats scope)
- B) Defer to Iteration 19 (focus on scraper reliability)

**Recommendation:** Option B. Set all imports to "Miscellaneous" default for Iteration 18.

### 7. Multi-Account Support - Out of Scope?

**Context:** Vision allows multiple FIBI accounts or multiple CAL cards. Master plan says "single FIBI + single CAL only" for MVP.

**Question:** Confirm scope:
- A) One FIBI checking + one CAL credit card only (MVP)
- B) Multiple accounts per bank (post-MVP)

**Recommendation:** Option A for Iteration 18. Option B in Iteration 21+.

### 8. Security Disclaimer - Required?

**Context:** Screen scraping violates bank Terms of Service. Should users explicitly consent?

**Question:** Should we:
- A) Show disclaimer in wizard, require checkbox consent
- B) Show disclaimer in docs only
- C) No disclaimer (user assumes risk)

**Recommendation:** Option A. Add checkbox in Step 1 of wizard. Document in README and settings page.

---

**Report Status:** COMPLETE  
**Confidence Level:** HIGH (95%)  
**Ready for:** Planning & Builder Assignment  
**Estimated Iteration Time:** 8-10 hours (including 2-3 days testing)  
**Risk Level:** HIGH (screen scraping fragility, 2FA complexity)

