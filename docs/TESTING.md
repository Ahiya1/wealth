# Testing Guide for Wealth

This guide documents the testing patterns established during Session 1 of the production hardening process.

## Test Setup

### Environment Configuration

**File:** `vitest.setup.ts`

All environment variables are set before tests run to ensure modules initialize correctly:

```typescript
// Generate a valid 32-byte encryption key for testing
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')

// Set up other test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = '...'
process.env.NEXT_PUBLIC_SUPABASE_URL = '...'
// etc.
```

**Why this matters:** Some modules (like `encryption.ts`) create constants at module-load time. Setting env vars in `vitest.setup.ts` ensures they're available before any code loads.

### Test Configuration

**File:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],  // Run before all tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
        'prisma/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

## Testing Utilities

### Test Utils (`src/server/api/__tests__/test-utils.ts`)

#### Creating Mock Contexts

```typescript
import { createMockContext, createMockAdminContext, fixtures } from '../../__tests__/test-utils'

// Regular user context
const ctx = createMockContext()

// Admin user context
const adminCtx = createMockAdminContext()

// Custom user ID
const ctx = createMockContext('custom-user-id')
```

#### Using Fixtures

Fixtures provide consistent test data:

```typescript
import { fixtures } from '../../__tests__/test-utils'

// Create test data
const mockUser = fixtures.user()
const mockAccount = fixtures.account({ balance: 5000.0 })
const mockTransaction = fixtures.transaction({
  amount: -50.0,
  payee: 'Test Store',
})

// Override any fields
const customAccount = fixtures.account({
  type: AccountType.SAVINGS,
  institution: 'My Bank',
})
```

**Available fixtures:**
- `user()` - User account
- `account()` - Financial account
- `category()` - Transaction category
- `transaction()` - Transaction record
- `budget()` - Budget
- `goal()` - Financial goal

## Testing tRPC Routers

### Basic Pattern

```typescript
import { describe, it, expect } from 'vitest'
import { TRPCError } from '@trpc/server'
import { myRouter } from '../my.router'
import { createMockContext, fixtures } from '../../__tests__/test-utils'

describe('myRouter', () => {
  describe('list', () => {
    it('should return items for authenticated user', async () => {
      // 1. Create mock context
      const ctx = createMockContext()

      // 2. Create caller (router instance with context)
      const caller = myRouter.createCaller(ctx)

      // 3. Set up mock data
      const mockData = [fixtures.transaction()]
      ctx.prisma.transaction.findMany.mockResolvedValue(mockData as any)

      // 4. Call the procedure
      const result = await caller.list({})

      // 5. Assert results
      expect(result).toHaveLength(1)

      // 6. Verify Prisma was called correctly
      expect(ctx.prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'test-user-id' }),
        })
      )
    })
  })
})
```

### Testing Authorization

```typescript
it('should throw NOT_FOUND for non-existent resource', async () => {
  const ctx = createMockContext()
  const caller = myRouter.createCaller(ctx)

  ctx.prisma.transaction.findUnique.mockResolvedValue(null)

  await expect(caller.get({ id: 'non-existent-id' })).rejects.toThrow(TRPCError)
  await expect(caller.get({ id: 'non-existent-id' })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
})

it('should throw NOT_FOUND for resource belonging to another user', async () => {
  const ctx = createMockContext()
  const caller = myRouter.createCaller(ctx)

  // Mock resource owned by different user
  const mockData = fixtures.transaction({ userId: 'different-user-id' })
  ctx.prisma.transaction.findUnique.mockResolvedValue(mockData as any)

  await expect(caller.get({ id: 'test-id' })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
})
```

### Testing CRUD Operations

```typescript
describe('create', () => {
  it('should create resource with valid data', async () => {
    const ctx = createMockContext()
    const caller = myRouter.createCaller(ctx)

    const mockResource = fixtures.transaction()
    ctx.prisma.transaction.create.mockResolvedValue(mockResource as any)

    const result = await caller.create({
      accountId: 'account-id',
      amount: -50.0,
      payee: 'Test Store',
      categoryId: 'category-id',
    })

    expect(result.id).toBe('test-transaction-id')
    expect(ctx.prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'test-user-id',
          amount: -50.0,
          isManual: true,
        }),
      })
    )
  })
})

describe('update', () => {
  it('should support partial updates', async () => {
    const ctx = createMockContext()
    const caller = myRouter.createCaller(ctx)

    const existing = fixtures.transaction()
    ctx.prisma.transaction.findUnique.mockResolvedValue(existing as any)
    ctx.prisma.transaction.update.mockResolvedValue({
      ...existing,
      payee: 'Updated Store',
    } as any)

    await caller.update({
      id: 'test-id',
      payee: 'Updated Store',
    })

    expect(ctx.prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payee: 'Updated Store',
        }),
      })
    )
  })
})
```

## Mocking External Services

### Mocking Anthropic SDK

```typescript
// Create a controllable mock
const mockClaudeCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: (...args: any[]) => mockClaudeCreate(...args),
      },
    })),
  }
})

// In beforeEach
beforeEach(() => {
  mockClaudeCreate.mockReset()
  mockClaudeCreate.mockResolvedValue({
    content: [
      {
        type: 'text',
        text: '[{"number": 1, "category": "Groceries"}]',
      },
    ],
  })
})

// In specific test
it('should handle API error', async () => {
  mockClaudeCreate.mockRejectedValueOnce(new Error('API Error'))
  // ... test error handling
})
```

### Mocking Internal Services

```typescript
vi.mock('@/server/services/categorize.service', () => ({
  categorizeTransactions: vi.fn().mockResolvedValue([
    { transactionId: 'txn-1', categoryName: 'Groceries', categoryId: 'cat-1' },
  ]),
  categorizeSingleTransaction: vi.fn().mockResolvedValue({
    categoryName: 'Groceries',
    categoryId: 'cat-1',
  }),
}))
```

## Common Patterns

### Testing Pagination

```typescript
it('should support pagination with cursor', async () => {
  const ctx = createMockContext()
  const caller = myRouter.createCaller(ctx)

  // Create more items than the limit
  const mockItems = Array.from({ length: 6 }, (_, i) =>
    fixtures.transaction({ id: `txn-${i}` })
  )

  ctx.prisma.transaction.findMany.mockResolvedValue(mockItems as any)

  const result = await caller.list({ limit: 5 })

  expect(result.items).toHaveLength(5) // Limit enforced
  expect(result.nextCursor).toBe('txn-5') // Next page cursor
})
```

### Testing Filters

```typescript
it('should filter by date range', async () => {
  const ctx = createMockContext()
  const caller = myRouter.createCaller(ctx)

  const startDate = new Date('2025-01-01')
  const endDate = new Date('2025-12-31')

  ctx.prisma.transaction.findMany.mockResolvedValue([])

  await caller.list({ startDate, endDate })

  expect(ctx.prisma.transaction.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        date: { gte: startDate, lte: endDate },
      }),
    })
  )
})
```

### Testing Decimal Values

```typescript
import { Decimal } from '@prisma/client/runtime/library'

it('should handle Decimal amounts correctly', async () => {
  const mockAccount = fixtures.account({
    balance: new Decimal(1234.56)
  })

  ctx.prisma.account.findUnique.mockResolvedValue(mockAccount as any)

  const result = await caller.get({ id: 'account-id' })

  expect(Number(result.balance)).toBe(1234.56)
})
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific file
npm test -- path/to/file.test.ts

# Run with UI
npm run test:ui

# Run with coverage (requires setup)
npm run test:coverage

# Watch mode
npm test -- --watch
```

## Test Organization

### File Structure

```
src/
├── lib/
│   ├── encryption.ts
│   └── __tests__/
│       └── encryption.test.ts
├── server/
│   ├── api/
│   │   ├── __tests__/
│   │   │   └── test-utils.ts      # Shared test utilities
│   │   └── routers/
│   │       ├── transactions.router.ts
│   │       └── __tests__/
│   │           └── transactions.router.test.ts
│   └── services/
│       ├── categorize.service.ts
│       └── __tests__/
│           └── categorize.service.test.ts
```

### Naming Conventions

- Test files: `*.test.ts`
- Test utilities: `test-utils.ts`
- Mock data: `fixtures` object in test-utils

## Best Practices

1. **Always mock Prisma** - Never hit the real database in unit tests
2. **Use fixtures** - Consistent test data reduces bugs
3. **Test authorization** - Every protected endpoint should verify user ownership
4. **Test edge cases** - Empty strings, null values, missing fields
5. **Verify Prisma calls** - Check that database queries are correct
6. **One assertion per concept** - Makes failures easier to debug
7. **Descriptive test names** - Should explain what's being tested
8. **Arrange-Act-Assert** - Structure tests clearly

## Examples

See these files for comprehensive examples:
- `src/server/api/routers/__tests__/transactions.router.test.ts` - 24 tests
- `src/server/api/routers/__tests__/accounts.router.test.ts` - 20 tests
- `src/server/services/__tests__/categorize.service.test.ts` - 8 tests
- `src/lib/__tests__/encryption.test.ts` - 10 tests

## TODO for Future Sessions

- [ ] Set up test coverage reporting (version conflict with @vitest/coverage-v8)
- [ ] Add integration tests with real database
- [ ] Add E2E tests with Playwright
- [ ] Test Plaid sync flows
- [ ] Test recurring transaction generation
- [ ] Visual regression tests for components

---

**Last Updated:** Session 1 - 2025-10-23
**Test Count:** 158 tests passing
**Coverage:** TBD (tooling to be configured)
