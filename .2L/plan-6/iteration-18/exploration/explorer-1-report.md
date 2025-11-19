# Explorer 1 Report: Architecture & Structure

## Executive Summary

Iteration 18 requires integrating the `israeli-bank-scrapers` npm library with the existing Wealth app infrastructure. The architecture follows an established pattern: React Hook Form + Zod validation for forms, tRPC for API layer, Radix UI Dialog for modals, and multi-step wizard pattern via state management. The bank connection wizard requires 5 steps with 2FA/OTP handling, leveraging existing OnboardingWizard patterns. Critical success factor: scraper wrappers in `/src/lib/bank-scrapers/` isolating external dependency complexity from application logic.

## Discoveries

### Bank Scraper Library Research

**israeli-bank-scrapers v6.2.5:**
- **Repository:** https://github.com/eshaham/israeli-bank-scrapers
- **Supported Banks:** 15+ Israeli banks and credit card companies
  - **FIBI (First International Bank):** Supported via `CompanyTypes.otsarHahayal` (Bank Code 031)
  - **Visa CAL:** Supported via `CompanyTypes.visaCal`
- **Authentication Pattern:**
  - Username/password base credentials
  - OTP callback support for 2FA: `otpCodeRetriever: async () => { ... }`
  - Long-term token support (for periodic 2FA requirements)
- **Transaction Output:**
  ```typescript
  {
    success: boolean,
    accounts: [{
      accountNumber: string,
      balance?: number,
      txns: [{
        type: 'normal' | 'installments',
        date: string,           // ISO date
        processedDate: string,
        originalAmount: number,
        originalCurrency: string,
        chargedAmount: number,
        description: string,
        memo: string,
        status: 'completed' | 'pending'
      }]
    }],
    errorType?: 'INVALID_PASSWORD' | 'CHANGE_PASSWORD' | 'ACCOUNT_BLOCKED' | 'TIMEOUT' | 'GENERIC'
  }
  ```
- **Browser Integration:** Uses Puppeteer under the hood (screen scraping)
- **Configuration Options:**
  - `companyId`: CompanyTypes enum
  - `startDate`: Date object
  - `combineInstallments`: boolean
  - `showBrowser`: boolean (debug mode)
  - `browser`: External Puppeteer browser instance
  - `browserContext`: Isolated browser context for parallel scraping

### Existing Database Schema (Already Implemented in Iteration 17)

**BankConnection Model:**
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
  errorMessage         String?
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt
  
  user                 User             @relation(...)
  syncLogs             SyncLog[]
}
```

**SyncLog Model:**
```prisma
model SyncLog {
  id                    String     @id @default(cuid())
  bankConnectionId      String
  startedAt             DateTime
  completedAt           DateTime?
  status                SyncStatus // SUCCESS | PARTIAL | FAILED
  transactionsImported  Int        @default(0)
  transactionsSkipped   Int        @default(0)
  errorDetails          String?    @db.Text
  createdAt             DateTime   @default(now())
  
  bankConnection        BankConnection @relation(...)
}
```

**Transaction Model Enhancements (Iteration 17):**
```prisma
model Transaction {
  // ... existing fields ...
  rawMerchantName          String?                // Original from bank
  importSource             ImportSource?          // MANUAL | FIBI | CAL | PLAID
  importedAt               DateTime?
  categorizedBy            CategorizationSource?  // USER | AI_CACHED | AI_SUGGESTED
  categorizationConfidence ConfidenceLevel?       // HIGH | MEDIUM | LOW
}
```

### Existing UI Component Patterns

**Multi-Step Wizard Pattern (OnboardingWizard.tsx):**
```typescript
const [currentStep, setCurrentStep] = useState(1)

const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 4))
const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

// Conditional rendering:
{currentStep === 1 && <Step1 onNext={handleNext} />}
{currentStep === 2 && <Step2 onNext={handleNext} onBack={handleBack} />}
```

**Progress Indicator Component:**
```typescript
// OnboardingProgress.tsx
{Array.from({ length: totalSteps }, (_, i) => (
  <div className={i + 1 === currentStep ? 'bg-sage-600' : 'bg-warm-gray-300'} />
))}
```

**Form Validation Pattern (React Hook Form + Zod):**
```typescript
const schema = z.object({
  field: z.string().min(1, 'Field required'),
})

const { register, handleSubmit, formState: { errors }, setValue } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... }
})
```

**Dialog/Modal Pattern (Radix UI):**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-[600px]">
    {/* Content */}
  </DialogContent>
</Dialog>
```

**tRPC Mutation Pattern:**
```typescript
const mutation = trpc.endpoint.mutate.useMutation({
  onSuccess: () => {
    utils.endpoint.list.invalidate()
    toast.success('Success')
  },
  onError: (error) => {
    toast.error('Error', { description: error.message })
  }
})
```

### Existing tRPC Router (BankConnections - Iteration 17)

**API Endpoints Already Implemented:**
- `bankConnections.list` - Get all user connections
- `bankConnections.get` - Get single connection with sync history
- `bankConnections.add` - Create connection with encrypted credentials
- `bankConnections.update` - Update credentials/status
- `bankConnections.delete` - Delete connection (cascade to sync logs)
- `bankConnections.test` - **STUB** (placeholder for Iteration 18 scraper integration)

**Security Implementation:**
```typescript
// /src/lib/encryption.ts (Already implemented)
export function encryptBankCredentials(credentials: BankCredentials): string {
  return encrypt(JSON.stringify(credentials))
}

export function decryptBankCredentials(encrypted: string): BankCredentials {
  const json = decrypt(encrypted)
  return JSON.parse(json) as BankCredentials
}

// AES-256-GCM encryption with env ENCRYPTION_KEY
const ALGORITHM = 'aes-256-gcm'
```

### Existing Settings Page Infrastructure

**Bank Connections Page (Iteration 17):**
- Route: `/settings/bank-connections`
- Components:
  - Connection list with status badges (ACTIVE, ERROR, EXPIRED)
  - Delete confirmation dialog
  - Empty state messaging
  - **Disabled "Add Bank" button** (awaiting wizard implementation)
  - **Placeholder card:** "Connection wizard coming in Iteration 18"

**Status Badge Pattern:**
```typescript
const getStatusBadge = (status: ConnectionStatus) => {
  switch (status) {
    case 'ACTIVE': return <Badge variant="success"><CheckCircle /> Active</Badge>
    case 'ERROR': return <Badge variant="destructive"><XCircle /> Error</Badge>
    case 'EXPIRED': return <Badge variant="outline"><AlertCircle /> Expired</Badge>
  }
}
```

## Patterns Identified

### Pattern 1: Multi-Step Wizard with State Management

**Description:** Client-side state-driven wizard with step navigation controls

**Implementation:**
```typescript
// BankConnectionWizard.tsx
const [currentStep, setCurrentStep] = useState(1)
const [formData, setFormData] = useState<Partial<WizardData>>({})

// Step 1: Bank Selection
// Step 2: Credentials Entry
// Step 3: 2FA/OTP Handling
// Step 4: Connection Test
// Step 5: Initial Import Prompt
```

**Use Case:** 5-step bank connection wizard with branching logic (2FA required/not required)

**Recommendation:** **USE THIS PATTERN** - Proven in OnboardingWizard, matches UX requirements

### Pattern 2: Scraper Wrapper Abstraction Layer

**Description:** Isolate `israeli-bank-scrapers` complexity behind clean service interfaces

**Structure:**
```
/src/lib/bank-scrapers/
  ├── index.ts                    # Exports + types
  ├── fibi-scraper.ts             # FIBI wrapper
  ├── cal-scraper.ts              # Visa CAL wrapper
  ├── scraper-utils.ts            # Error mapping, retry logic
  └── types.ts                    # Shared types
```

**Example Wrapper:**
```typescript
// fibi-scraper.ts
import { createScraper, CompanyTypes } from 'israeli-bank-scrapers'

export async function scrapeFIBI(
  credentials: { userId: string; password: string },
  startDate: Date,
  endDate: Date,
  onOTPRequired?: () => Promise<string>
): Promise<ScraperResult> {
  const scraper = createScraper({
    companyId: CompanyTypes.otsarHahayal, // FIBI uses this scraper
    startDate,
    combineInstallments: false,
  })

  const result = await scraper.scrape({
    username: credentials.userId,
    password: credentials.password,
    otpCodeRetriever: onOTPRequired,
  })

  return mapScraperResult(result)
}
```

**Recommendation:** **CRITICAL PATTERN** - Prevents scraper library changes from cascading through application

### Pattern 3: OTP Modal with Async Callback

**Description:** User-facing OTP input dialog that resolves async callback from scraper

**Implementation:**
```typescript
// OTPModal.tsx
interface OTPModalProps {
  isOpen: boolean
  onSubmit: (code: string) => void
  onTimeout: () => void
  timeoutSeconds?: number
}

// Usage in wizard:
const [otpResolver, setOTPResolver] = useState<((code: string) => void) | null>(null)

const handleOTPRequired = () => {
  return new Promise<string>((resolve) => {
    setOTPResolver(() => resolve)
    setShowOTPModal(true)
  })
}
```

**Use Case:** 2FA flow during bank connection test or sync

**Recommendation:** **USE THIS PATTERN** - Standard async UI pattern for scraper callbacks

### Pattern 4: Error Categorization & User Messaging

**Description:** Map scraper error types to actionable user messages

**Implementation:**
```typescript
// scraper-utils.ts
export function mapScraperError(errorType: string): {
  status: ConnectionStatus
  userMessage: string
  retryable: boolean
} {
  switch (errorType) {
    case 'INVALID_PASSWORD':
      return {
        status: 'ERROR',
        userMessage: 'Invalid username or password. Please check your credentials.',
        retryable: true,
      }
    case 'CHANGE_PASSWORD':
      return {
        status: 'EXPIRED',
        userMessage: 'Your bank requires a password change. Please update via bank website.',
        retryable: false,
      }
    case 'TIMEOUT':
      return {
        status: 'ERROR',
        userMessage: 'Connection timed out. Please try again.',
        retryable: true,
      }
    // ... 5+ more error types
  }
}
```

**Recommendation:** **ESSENTIAL PATTERN** - Prevents generic "Connection failed" messages

### Pattern 5: tRPC Mutation with Progress Tracking

**Description:** Long-running scraper operations with status updates

**Implementation:**
```typescript
// Option A: Polling (simpler, current pattern)
const testMutation = trpc.bankConnections.test.useMutation()
const { data: status } = trpc.bankConnections.getTestStatus.useQuery(
  { connectionId },
  { enabled: testMutation.isPending, refetchInterval: 2000 }
)

// Option B: Server-Sent Events (better for real-time)
// Defer to Iteration 19 (import pipeline)
```

**Recommendation:** **Start with polling** (Iteration 18), upgrade to SSE in Iteration 19

## Complexity Assessment

### HIGH COMPLEXITY: Scraper Integration & 2FA Handling

**Components:**
- **israeli-bank-scrapers integration** (8+ hours)
  - Wrapper implementation for FIBI + Visa CAL
  - Error handling for 6+ failure scenarios
  - OTP callback wiring
  - Puppeteer browser lifecycle management
- **2FA/OTP Modal Flow** (4+ hours)
  - Async callback resolution
  - Timeout handling (3-minute countdown)
  - Retry logic (max 3 attempts)
  - SMS delay messaging

**Complexity Drivers:**
- External dependency with screen scraping fragility
- Async callback coordination between React UI and scraper
- Real bank testing required (cannot fully mock)
- Error scenarios difficult to reproduce locally

**Estimated Builder Splits:** **None** (keep in single builder for tight integration)

**Mitigation:** 2-3 days dedicated testing with real bank accounts (per master plan)

### MEDIUM COMPLEXITY: Connection Wizard UI

**Components:**
- **5-Step Wizard** (4+ hours)
  - Step 1: Bank selection (FIBI vs CAL, Checking vs Credit)
  - Step 2: Credential form (userId + password, secure input)
  - Step 3: 2FA handling (conditional - only if required)
  - Step 4: Connection test (loading states, success/error feedback)
  - Step 5: Initial import prompt (Yes/No, 30-day default)
- **Form Validation** (2+ hours)
  - Zod schemas for each step
  - Field-level error messages
  - Cross-step data passing

**Complexity Drivers:**
- State management across 5 steps
- Conditional branching (2FA required vs. not required)
- Error recovery at each step

**Estimated Builder Splits:** **None** (UI logic tightly coupled to scraper flow)

### LOW COMPLEXITY: tRPC Endpoint Completion

**Components:**
- **bankConnections.test endpoint** (2+ hours)
  - Replace stub with real scraper call
  - Return detailed test results
  - Update connection status based on result
- **Error logging** (1 hour)
  - SyncLog creation for test attempts
  - Sanitize logs (no credentials)

**Complexity Drivers:** Simple - wraps scraper utility functions

## Technology Recommendations

### Primary Stack (Already Established)

- **Framework:** Next.js 14 (App Router) - existing infrastructure
- **Database:** PostgreSQL via Supabase - schema already migrated (Iteration 17)
- **API Layer:** tRPC - router already exists (bankConnections.router.ts)
- **Forms:** React Hook Form + Zod - proven pattern across 10+ forms
- **UI Components:** Radix UI (Dialog, Select, Input) - shadcn/ui library

### New Dependencies for Iteration 18

**israeli-bank-scrapers v6.2.5:**
```bash
npm install israeli-bank-scrapers --save
```
- **Purpose:** Bank transaction scraping for FIBI + Visa CAL
- **Bundle Size:** ~500KB (includes Puppeteer, acceptable for server-side only)
- **Installation Note:** Add to `dependencies` (not `devDependencies`)

**No other dependencies required** - all UI components already available

## Integration Points

### External API: israeli-bank-scrapers

**Integration Method:**
- **Server-side only** (tRPC mutation context)
- **Wrappers:** `/src/lib/bank-scrapers/fibi-scraper.ts` and `cal-scraper.ts`
- **Error Handling:** Try-catch with error type mapping
- **Timeout:** 60 seconds (Vercel Pro tier required if not using background queue)

**Critical Considerations:**
- **Browser Management:** Reuse Puppeteer browser instances across scrapes (connection pooling)
- **Memory Leaks:** Always close browser contexts after scrape
- **Rate Limiting:** Banks may block rapid sequential requests (exponential backoff)
- **Logging:** NEVER log credentials or OTP codes (sanitize all scraper logs)

### Internal Integration: Encryption Service

**Integration Flow:**
```typescript
// Step 1: User submits credentials in wizard
const credentials = { userId: '12345678', password: 'secret' }

// Step 2: Encrypt before database storage
const encrypted = encryptBankCredentials(credentials)

// Step 3: Store in BankConnection.encryptedCredentials
await prisma.bankConnection.create({ data: { encryptedCredentials: encrypted } })

// Step 4: Decrypt in-memory during scrape
const decrypted = decryptBankCredentials(connection.encryptedCredentials)
const result = await scrapeFIBI(decrypted, startDate, endDate)

// Step 5: Clear from memory immediately after scrape
// (JavaScript GC handles this, but avoid storing in state)
```

**Security Boundary:** Credentials never leave server context (no client-side decryption)

### Internal Integration: tRPC Router

**New Endpoint Implementation:**
```typescript
// bankConnections.router.ts (Iteration 18 enhancement)
test: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const connection = await ctx.prisma.bankConnection.findUnique({ where: { id: input.id } })
    if (!connection || connection.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' })
    
    const credentials = decryptBankCredentials(connection.encryptedCredentials)
    
    try {
      const result = await (connection.bank === 'FIBI' 
        ? scrapeFIBI(credentials, new Date(), new Date()) 
        : scrapeCAL(credentials, new Date(), new Date())
      )
      
      if (result.success) {
        await ctx.prisma.bankConnection.update({
          where: { id: input.id },
          data: { status: 'ACTIVE', errorMessage: null, lastSynced: new Date() }
        })
        return { success: true, message: 'Connection successful' }
      } else {
        const errorMapping = mapScraperError(result.errorType)
        await ctx.prisma.bankConnection.update({
          where: { id: input.id },
          data: { status: errorMapping.status, errorMessage: errorMapping.userMessage }
        })
        throw new TRPCError({ code: 'BAD_REQUEST', message: errorMapping.userMessage })
      }
    } catch (error) {
      // Log error (sanitized), update connection status
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Connection test failed' })
    }
  })
```

## Risks & Challenges

### TECHNICAL RISK: Screen Scraping Fragility (HIGH)

**Impact:** Bank website changes break scrapers (HTML structure, API endpoints, authentication flow)

**Likelihood:** Medium (banks update UIs periodically, 2FA requirements change)

**Mitigation Strategy:**
1. **Wrapper Isolation:** Changes to scraper library only affect `/src/lib/bank-scrapers/` files
2. **Version Pinning:** Lock `israeli-bank-scrapers` to specific version, test before upgrading
3. **Error Monitoring:** Sentry alerts on scraper failures (track success rate by bank)
4. **Fallback Messaging:** Clear user message: "Scraping unavailable due to bank changes, please try again later"
5. **Community Support:** israeli-bank-scrapers has active maintenance (900+ stars, last commit <1 month)

### TECHNICAL RISK: 2FA Timeout Edge Cases (MEDIUM)

**Scenarios:**
- User doesn't receive SMS code within 3 minutes
- User enters wrong OTP 3 times
- Bank requires CAPTCHA or security question (not just OTP)

**Mitigation Strategy:**
1. **Clear Timeout Messaging:** Countdown timer in OTP modal ("Code expires in 2:45")
2. **Retry Flow:** "Didn't receive code? Resend" button (triggers new scraper attempt)
3. **Max Retry Limit:** 3 OTP attempts, then block for 15 minutes (prevent account lockout)
4. **Unsupported Auth Fallback:** If scraper returns `UNSUPPORTED_AUTH_METHOD`, show message: "This account requires additional verification not yet supported"

### TECHNICAL RISK: Vercel Function Timeout (MEDIUM)

**Problem:** Default Vercel timeout is 10 seconds (Hobby tier), scraping can take 30-60 seconds

**Impact:** Function times out before scraper completes, user sees error

**Mitigation Strategy:**
1. **Vercel Pro Tier:** Upgrade to Pro ($20/month) for 60-second timeout (recommended in master plan)
2. **OR Background Queue:** Defer scraping to background job (Inngest, QStash), poll for status
   - **Decision:** Use Vercel Pro for Iteration 18 (simpler), defer background queue to post-MVP if needed

### COMPLEXITY RISK: Builder Needing to Split (LOW)

**Assessment:** Iteration 18 scope is tightly coupled - scraper wrapper, wizard UI, and tRPC endpoint are interdependent

**Signs to Watch:**
- Wizard UI takes >4 hours (complex state management)
- Scraper wrapper debugging exceeds 2 days (library issues)
- 2FA callback logic becomes convoluted (async callback hell)

**Split Strategy (if needed):**
- **Sub-builder A:** Scraper wrappers + tRPC endpoint (backend-focused)
- **Sub-builder B:** Connection wizard UI + OTP modal (frontend-focused)
- **Coordination:** Agree on scraper result interface, mock scraper responses for UI testing

**Recommendation:** **Start unified**, split only if builder explicitly requests help after 6+ hours

## Recommendations for Planner

### 1. Scraper Wrapper Location: /src/lib/bank-scrapers/

**Rationale:**
- Isolates external dependency (israeli-bank-scrapers) from application logic
- Mirrors existing `/src/lib/encryption.ts` pattern (reusable utilities)
- Easy to swap scraper library or add official bank APIs later
- Clear testing boundary (mock scraper wrappers independently)

**Structure:**
```
/src/lib/bank-scrapers/
  ├── index.ts              # Exports: scrapeFIBI, scrapeCAL, mapScraperError
  ├── fibi-scraper.ts       # FIBI wrapper (CompanyTypes.otsarHahayal)
  ├── cal-scraper.ts        # Visa CAL wrapper (CompanyTypes.visaCal)
  ├── scraper-utils.ts      # Error mapping, retry logic, browser pooling
  └── types.ts              # ScraperResult, BankCredentials, OTPCallback
```

### 2. Wizard UI Flow: 5 Steps with Conditional Branching

**Steps:**
1. **Bank Selection:** Radio buttons (FIBI | Visa CAL) + Account Type dropdown (Checking | Credit)
2. **Credentials Entry:** Text inputs (userId, password with type="password")
3. **2FA Handling (Conditional):** OTP modal appears ONLY if scraper triggers `otpCodeRetriever` callback
4. **Connection Test:** Loading spinner → Success (green checkmark) OR Error (retry button)
5. **Initial Import Prompt:** "Import last 30 days of transactions?" (Yes/No buttons)

**Branching Logic:**
- If bank doesn't require 2FA, skip Step 3 (go directly 2 → 4)
- If connection test fails with retryable error (TIMEOUT, NETWORK_ERROR), stay on Step 4 with retry button
- If non-retryable error (CHANGE_PASSWORD), show terminal error message with "Update on bank website" link

### 3. OTP Modal Design: Async Callback with Timeout

**Implementation:**
```typescript
// In wizard component:
const [otpPromise, setOTPPromise] = useState<{
  resolve: (code: string) => void,
  reject: (reason: string) => void
} | null>(null)

const handleOTPRequired = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    setOTPPromise({ resolve, reject })
    // Timeout after 3 minutes
    setTimeout(() => reject('OTP_TIMEOUT'), 180000)
  })
}

// In OTP modal:
<form onSubmit={(e) => {
  e.preventDefault()
  otpPromise?.resolve(otpCode)
  setOTPPromise(null)
}}>
  <Input maxLength={6} placeholder="Enter 6-digit code" />
  <p>Code sent to ***1234. Expires in {countdown}.</p>
  <Button type="submit">Verify</Button>
  <Button variant="ghost" onClick={() => otpPromise?.reject('USER_CANCELLED')}>Cancel</Button>
</form>
```

**UX Details:**
- Auto-focus input when modal opens
- Accept only digits (pattern="[0-9]{6}")
- Countdown timer (3:00 → 2:59 → ... → 0:00)
- On timeout: reject promise → scraper returns error → show "OTP expired, please retry"

### 4. Error Handling: Comprehensive Mapping for 8+ Scenarios

**Error Type Mapping:**
```typescript
INVALID_PASSWORD       → "Invalid credentials" (retryable, stay on Step 2)
CHANGE_PASSWORD        → "Password expired, update via bank" (terminal)
ACCOUNT_BLOCKED        → "Account locked, contact bank" (terminal)
TIMEOUT                → "Connection timed out, retry" (retryable, stay on Step 4)
OTP_TIMEOUT            → "OTP expired, retry connection test" (retryable, back to Step 4)
OTP_INVALID            → "Invalid OTP code, try again" (retryable, stay on Step 3)
NETWORK_ERROR          → "Network issue, check connection" (retryable, stay on Step 4)
UNSUPPORTED_AUTH       → "Authentication method not supported" (terminal)
GENERIC                → "Unexpected error, contact support" (terminal)
```

**User Messaging:**
- **Retryable errors:** Show "Retry" button at current step
- **Terminal errors:** Show "Close" button, navigate back to connection list
- **All errors:** Log to SyncLog with sanitized details (no credentials/OTP)

### 5. Testing Strategy: 2-3 Days Real Bank Testing

**Phase 1 (Day 1): Unit Testing**
- Mock israeli-bank-scrapers responses (success, errors, 2FA required)
- Test scraper wrappers with synthetic data
- Verify error mapping covers all errorType values
- Test OTP modal timeout logic (simulated delay)

**Phase 2 (Day 2): Integration Testing with Real FIBI Account**
- Create test FIBI checking account (or use personal account with caution)
- Test connection wizard end-to-end (Steps 1-5)
- Verify 2FA flow (if FIBI requires OTP)
- Confirm transactions returned in correct format
- Test error scenarios (wrong password, network disconnect)

**Phase 3 (Day 3): Integration Testing with Real Visa CAL Account**
- Create test Visa CAL credit card account
- Test connection wizard for credit card type
- Verify transaction import (pending vs. posted handling)
- Test concurrent scraping (multiple connections in parallel)
- Monitor success rate over 20+ test attempts (target >80%)

**Failure Scenario Testing:**
- Wrong password (expect INVALID_PASSWORD)
- OTP timeout (wait 3+ minutes without entering code)
- Network disconnect mid-scrape (airplane mode)
- Bank maintenance window (scraper should gracefully fail)

### 6. Security Hardening Checklist

**Credential Protection:**
- [ ] Decrypt credentials ONLY in tRPC mutation context (server-side)
- [ ] Clear decrypted credentials from memory after scrape (no state storage)
- [ ] NEVER log credentials, OTP codes, or encryption keys
- [ ] Sanitize all scraper error messages (strip sensitive data)

**Logging Safeguards:**
```typescript
// GOOD:
console.log('Test connection for bank:', connection.bank, 'user:', credentials.userId.substring(0, 3) + '***')

// BAD (NEVER DO THIS):
console.log('Credentials:', credentials) // Exposes password
console.log('OTP code:', otpCode)        // Exposes 2FA code
```

**Rate Limiting:**
- [ ] Prevent >3 connection test attempts per 15 minutes (avoid account lockout)
- [ ] Add exponential backoff for retryable errors (1s, 2s, 4s delays)

**Browser Lifecycle:**
- [ ] Close Puppeteer browser contexts after each scrape (prevent memory leaks)
- [ ] Reuse browser instances across scrapes when possible (performance)

### 7. Vercel Deployment Configuration

**Required Changes:**
- Upgrade to Vercel Pro tier ($20/month) for 60-second function timeout
- OR implement background queue (defer to post-MVP if Vercel Pro approved)

**Environment Variables:**
```bash
# .env.production
ENCRYPTION_KEY=<32-byte hex string>  # Already set in Iteration 17
DATABASE_URL=<Supabase connection string>
DIRECT_URL=<Supabase direct URL>
```

**No additional env vars required** for israeli-bank-scrapers (credentials passed at runtime)

## Resource Map

### Critical Files/Directories

**New Files (Iteration 18):**
- `/src/lib/bank-scrapers/index.ts` - Scraper wrapper exports
- `/src/lib/bank-scrapers/fibi-scraper.ts` - FIBI integration
- `/src/lib/bank-scrapers/cal-scraper.ts` - Visa CAL integration
- `/src/lib/bank-scrapers/scraper-utils.ts` - Error mapping, retry logic
- `/src/lib/bank-scrapers/types.ts` - Shared TypeScript types
- `/src/components/bank-connections/BankConnectionWizard.tsx` - 5-step wizard
- `/src/components/bank-connections/OTPModal.tsx` - 2FA input modal
- `/src/components/bank-connections/BankSelectionStep.tsx` - Step 1
- `/src/components/bank-connections/CredentialsStep.tsx` - Step 2
- `/src/components/bank-connections/ConnectionTestStep.tsx` - Step 4
- `/src/components/bank-connections/ImportPromptStep.tsx` - Step 5

**Modified Files (Iteration 18):**
- `/src/server/api/routers/bankConnections.router.ts` - Replace test() stub with real scraper
- `/src/app/(dashboard)/settings/bank-connections/page.tsx` - Enable "Add Bank" button, open wizard
- `/package.json` - Add israeli-bank-scrapers dependency

**Existing Files (Already Implemented, No Changes):**
- `/src/lib/encryption.ts` - Credential encryption (Iteration 17)
- `/prisma/schema.prisma` - BankConnection, SyncLog models (Iteration 17)
- `/src/components/ui/dialog.tsx` - Radix UI Dialog component
- `/src/components/ui/button.tsx` - shadcn/ui Button
- `/src/components/ui/input.tsx` - shadcn/ui Input
- `/src/components/ui/select.tsx` - shadcn/ui Select

### Key Dependencies

**New Dependency (Install):**
```json
{
  "dependencies": {
    "israeli-bank-scrapers": "^6.2.5"
  }
}
```

**Existing Dependencies (Already Installed):**
- `@hookform/resolvers` v3.9.1 - Zod integration for React Hook Form
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `@radix-ui/react-dialog` v1.1.15 - Dialog/modal primitives
- `@trpc/client` v11.6.0 - tRPC client
- `@prisma/client` v5.22.0 - Database ORM

**Transitive Dependencies (israeli-bank-scrapers brings):**
- Puppeteer (browser automation)
- Playwright (alternative to Puppeteer, optional)

### Testing Infrastructure

**Unit Tests (Vitest):**
```bash
# Test scraper wrappers
src/lib/bank-scrapers/__tests__/fibi-scraper.test.ts
src/lib/bank-scrapers/__tests__/cal-scraper.test.ts
src/lib/bank-scrapers/__tests__/error-mapping.test.ts

# Test wizard state management
src/components/bank-connections/__tests__/BankConnectionWizard.test.tsx
```

**Integration Tests (Manual):**
- Real bank account testing (FIBI + Visa CAL)
- 2FA flow validation
- Error scenario reproduction

**Test Commands (Existing):**
```bash
npm run test              # Run all tests
npm run test:ui           # Vitest UI
npm run test:coverage     # Coverage report
```

## Questions for Planner

### 1. Vercel Pro Tier Approval

**Question:** Is Vercel Pro tier ($20/month) approved for 60-second function timeout, or should we implement background queue (Inngest/QStash) for scraping operations?

**Impact:**
- Vercel Pro: Simpler implementation, immediate scraping results
- Background queue: More complex (polling/webhooks), but supports longer scrapes and retry logic

**Recommendation:** Approve Vercel Pro for MVP, defer background queue to post-MVP optimization

### 2. Error Recovery UX Philosophy

**Question:** When a retryable error occurs (e.g., TIMEOUT), should the wizard:
- **Option A:** Stay on current step with "Retry" button (user can fix and retry immediately)
- **Option B:** Navigate back to Step 1 (force user to restart entire wizard)

**Recommendation:** Option A (stay on step) - better UX, reduces friction for transient errors

### 3. Initial Import Default Behavior

**Question:** Step 5 asks "Import last 30 days?". Should we:
- **Option A:** Default to "Yes" (auto-import on connection)
- **Option B:** Default to "No" (require explicit user opt-in)
- **Option C:** Skip Step 5 entirely, always import last 30 days

**Recommendation:** Option A (default Yes) - aligns with "zero manual entry" value proposition from vision.md

### 4. Concurrent Connection Testing

**Question:** Should we support adding multiple bank connections in parallel (e.g., FIBI + Visa CAL at the same time), or enforce sequential addition?

**Impact:** Concurrent scraping requires browser context isolation (more complex but better UX)

**Recommendation:** Sequential for Iteration 18 (simpler), add concurrent support in Iteration 19 if user feedback demands it

### 5. Scraper Success Rate Monitoring

**Question:** Should we track scraper success rate per bank (FIBI vs CAL) in a monitoring dashboard, or just log to Sentry?

**Recommendation:** Sentry only for Iteration 18, defer dashboard to post-MVP (Iteration 20 production polish)

---

**Report Status:** COMPLETE
**Ready for:** Builder assignment (Iteration 18 execution)
**Estimated Effort:** 8-10 hours (including 2-3 days real bank testing)
**Risk Level:** HIGH (external dependency, 2FA complexity, screen scraping fragility)
