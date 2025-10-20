# Builder-5C Usage Guide: Claude AI Categorization

## Quick Start

### 1. Setup (One-time)
```bash
# Install dependencies
npm install @anthropic-ai/sdk@0.32.1

# Add to .env.local
ANTHROPIC_API_KEY="sk-ant-your-key-here"

# Run migration
npx prisma migrate dev --name add_merchant_category_cache
npx prisma generate
```

### 2. Test It Works
```typescript
// In any tRPC-connected component
const autoCategorize = trpc.transactions.autoCategorizeUncategorized.useMutation()
autoCategorize.mutate() // Categorizes all "Miscellaneous" transactions
```

## API Reference

### tRPC Procedures

#### 1. `transactions.categorize`
Categorize a single transaction and apply the result.

```typescript
const categorize = trpc.transactions.categorize.useMutation()

categorize.mutate({ transactionId: 'txn-123' })

// Returns:
{
  transaction: Transaction, // Updated transaction
  categoryName: string,     // Applied category name
  applied: boolean          // Whether category was applied
}
```

#### 2. `transactions.categorizeBatch`
Categorize multiple transactions at once (max 50).

```typescript
const batch = trpc.transactions.categorizeBatch.useMutation()

batch.mutate({
  transactionIds: ['txn-1', 'txn-2', 'txn-3']
})

// Returns:
{
  total: number,           // Total transactions processed
  categorized: number,     // Successfully categorized count
  results: [
    {
      transactionId: string,
      categoryName: string,
      confidence: 'high' | 'low'
    }
  ]
}
```

#### 3. `transactions.autoCategorizeUncategorized`
Auto-categorize all transactions with "Miscellaneous" category (max 100 at a time).

```typescript
const autoCateg = trpc.transactions.autoCategorizeUncategorized.useMutation()

autoCateg.mutate() // No input needed

// Returns:
{
  total: number,           // Total uncategorized transactions
  categorized: number,     // Successfully categorized count
  message: string          // Human-readable result
}
```

#### 4. `transactions.suggestCategory`
Get a category suggestion without applying it (for forms).

```typescript
const { data } = trpc.transactions.suggestCategory.useQuery({
  payee: 'Starbucks',
  amount: 5.50
})

// Returns:
{
  categoryName: string,    // Suggested category name
  categoryId: string | null // Category ID (null if not found)
}
```

#### 5. `transactions.categorizationStats`
Get caching statistics and efficiency metrics.

```typescript
const { data: stats } = trpc.transactions.categorizationStats.useQuery()

// Returns:
{
  totalCached: number,      // Unique merchants in cache
  totalTransactions: number, // Total transactions
  cacheHitRate: number      // Cache hit rate percentage (0-100)
}
```

## Service Layer Functions

For use in server-side code (tRPC procedures, Plaid sync, etc.):

```typescript
import {
  categorizeTransactions,
  categorizeSingleTransaction,
  getCategorizationStats,
} from '@/server/services/categorize.service'

// Batch categorization
const results = await categorizeTransactions(
  userId,
  [
    { id: 'txn-1', payee: 'Whole Foods', amount: 125.43 },
    { id: 'txn-2', payee: 'Shell', amount: 45.00 },
  ],
  prisma
)

// Single transaction
const result = await categorizeSingleTransaction(
  userId,
  'Starbucks',
  5.50,
  prisma
)

// Statistics
const stats = await getCategorizationStats(userId, prisma)
```

## UI Components

### AutoCategorizeButton
One-click button to categorize all uncategorized transactions.

```typescript
import { AutoCategorizeButton } from '@/components/transactions/AutoCategorizeButton'

<AutoCategorizeButton
  onComplete={() => {
    // Optional callback after categorization
    refetch()
  }}
/>
```

**Features:**
- Shows loading spinner during categorization
- Displays success/error toasts
- Automatically invalidates transaction queries
- Disabled during processing

### CategorySuggestion
Live AI suggestions as user types merchant name.

```typescript
import { CategorySuggestion } from '@/components/transactions/CategorySuggestion'

<CategorySuggestion
  payee={payeeValue}
  amount={amountValue}
  onSelect={(categoryId) => {
    // Apply suggested category to form
    setValue('categoryId', categoryId)
  }}
/>
```

**Features:**
- Collapsible UI (hidden by default)
- 5-minute cache for suggestions
- One-click apply to form
- Shows Sparkles icon for AI features

### CategorizationStats
Statistics dashboard showing cache efficiency.

```typescript
import { CategorizationStats } from '@/components/transactions/CategorizationStats'

<CategorizationStats />
```

**Features:**
- Cache hit rate with color coding
- Total merchants cached
- Total transactions processed
- Efficiency tips based on performance
- Auto-refreshing data

## Common Use Cases

### 1. Categorize Imported Transactions (Builder-5B)
```typescript
// After importing from Plaid
import { categorizeTransactions } from '@/server/services/categorize.service'

const newTransactions = await syncFromPlaid(...)

const txnsToCateg = newTransactions.map(t => ({
  id: t.id,
  payee: t.payee,
  amount: t.amount.toNumber(),
}))

const results = await categorizeTransactions(userId, txnsToCateg, prisma)

// Update transactions with categories
for (const result of results) {
  if (result.categoryId) {
    await prisma.transaction.update({
      where: { id: result.transactionId },
      data: { categoryId: result.categoryId },
    })
  }
}
```

### 2. Show Suggestions in Transaction Form
```typescript
// In transaction form component
import { CategorySuggestion } from '@/components/transactions/CategorySuggestion'

const {
  register,
  watch,
  setValue,
  handleSubmit,
} = useForm()

const payee = watch('payee')
const amount = watch('amount')

<form onSubmit={handleSubmit(onSubmit)}>
  <Input {...register('payee')} placeholder="Merchant name" />
  <Input {...register('amount')} type="number" />

  {/* Show AI suggestion */}
  <CategorySuggestion
    payee={payee}
    amount={amount}
    onSelect={(categoryId) => setValue('categoryId', categoryId)}
  />

  <CategorySelect {...register('categoryId')} />
  <Button type="submit">Save</Button>
</form>
```

### 3. Batch Recategorize Selected Transactions
```typescript
// In transaction list with selection
const [selectedIds, setSelectedIds] = useState<string[]>([])

const batchCategorize = trpc.transactions.categorizeBatch.useMutation({
  onSuccess: (data) => {
    toast({
      title: 'Categorization Complete',
      description: `Categorized ${data.categorized} of ${data.total} transactions`,
    })
    setSelectedIds([])
    refetch()
  },
})

<Button
  onClick={() => batchCategorize.mutate({ transactionIds: selectedIds })}
  disabled={selectedIds.length === 0}
>
  Categorize Selected ({selectedIds.length})
</Button>
```

### 4. Monitor Cache Performance
```typescript
// In settings or dashboard
import { CategorizationStats } from '@/components/transactions/CategorizationStats'

<div className="grid gap-4 md:grid-cols-2">
  <CategorizationStats />

  <Card>
    <CardHeader>
      <CardTitle>Optimization Tips</CardTitle>
    </CardHeader>
    <CardContent>
      <p>
        Cache hit rate above 70% means most transactions are using
        cached categories, minimizing API costs.
      </p>
    </CardContent>
  </Card>
</div>
```

## Performance Tips

### 1. Use Batch Processing
❌ **Don't:**
```typescript
// Categorize one at a time (slow, expensive)
for (const txn of transactions) {
  await categorize.mutate({ transactionId: txn.id })
}
```

✅ **Do:**
```typescript
// Categorize in batch (fast, cheap)
await categorizeBatch.mutate({
  transactionIds: transactions.map(t => t.id)
})
```

### 2. Let Cache Work
```typescript
// First categorization: ~500ms (API call)
await categorize.mutate({ transactionId: 'txn-1' })

// Same merchant again: <10ms (cache hit)
await categorize.mutate({ transactionId: 'txn-2' })
```

### 3. Limit Auto-Categorization
```typescript
// Good: Auto-categorize limits to 100 transactions
await autoCategorizeUncategorized.mutate()

// If more than 100, call multiple times or use batch
```

### 4. Cache Suggestions in Forms
```typescript
// CategorySuggestion component automatically caches for 5 minutes
// No need to manually manage cache
<CategorySuggestion
  payee={payee}
  amount={amount}
  onSelect={onSelect}
/>
```

## Error Handling

### API Failures
```typescript
const categorize = trpc.transactions.categorize.useMutation({
  onError: (error) => {
    // Automatically falls back to "Miscellaneous"
    console.error('Categorization failed:', error.message)

    toast({
      title: 'Categorization Failed',
      description: 'Transaction was categorized as Miscellaneous',
      variant: 'destructive',
    })
  },
})
```

### Invalid Transactions
```typescript
// Service layer handles gracefully
const results = await categorizeTransactions(userId, [], prisma)
// Returns: []

const results = await categorizeTransactions(userId, [{ id: '', payee: '', amount: 0 }], prisma)
// Falls back to Miscellaneous
```

## Cost Optimization

### Current Strategy
1. **Merchant Caching:** First lookup checks cache (free)
2. **Batch Processing:** 50 transactions per API call (~$0.003)
3. **Rate Limiting:** Max 100 transactions per auto-categorize
4. **Cache Persistence:** Never expires (until manually cleared)

### Expected Costs
- **Initial 100 transactions:** $0.006
- **Monthly 200 new transactions:** $0.024
- **With 80% cache hit rate:** $0.005/month
- **Annual cost:** <$1.00/user

### Monitor Costs
```typescript
const { data: stats } = trpc.transactions.categorizationStats.useQuery()

console.log(`Cache hit rate: ${stats.cacheHitRate}%`)
// Above 70% = excellent cost efficiency
// Below 40% = consider manual categorization for common merchants
```

## Troubleshooting

### "Invalid API key"
```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Test API key works
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":100,"messages":[{"role":"user","content":"Test"}]}'
```

### "Category not found"
```typescript
// Verify category exists in database
const categories = await prisma.category.findMany({
  where: { name: 'Groceries' }
})

// If missing, run seed script
npx prisma db seed
```

### "Slow categorization"
```typescript
// Check cache hit rate
const { data: stats } = trpc.transactions.categorizationStats.useQuery()

if (stats.cacheHitRate < 50) {
  // Manually categorize common merchants to improve cache
}

// First API call is slow (~500ms), subsequent are fast (<10ms)
```

### "Inaccurate categories"
```typescript
// Manually override category
await update.mutate({
  id: transactionId,
  categoryId: correctCategoryId,
})

// This will cache the correction for future use
```

## Advanced Usage

### Custom Categorization Logic
```typescript
// Extend categorize.service.ts for custom rules
export async function categorizeWithRules(
  userId: string,
  transaction: Transaction,
  prisma: PrismaClient
) {
  // Custom rule: Amazon transactions always Shopping
  if (transaction.payee.toLowerCase().includes('amazon')) {
    const shopping = await prisma.category.findFirst({
      where: { name: 'Shopping' }
    })
    return { categoryId: shopping!.id, categoryName: 'Shopping' }
  }

  // Fall back to AI categorization
  return categorizeSingleTransaction(userId, transaction.payee, transaction.amount, prisma)
}
```

### Bulk Operations
```typescript
// Re-categorize all transactions (expensive!)
const allTransactions = await prisma.transaction.findMany({
  where: { userId }
})

// Process in chunks of 50
for (let i = 0; i < allTransactions.length; i += 50) {
  const chunk = allTransactions.slice(i, i + 50)
  await categorizeBatch.mutate({
    transactionIds: chunk.map(t => t.id)
  })
}
```

### Clear Cache
```typescript
// Clear all merchant cache (use sparingly)
await prisma.merchantCategoryCache.deleteMany()

// Clear specific merchant
await prisma.merchantCategoryCache.delete({
  where: { merchant: 'starbucks' }
})
```

## Best Practices

1. **Use Auto-Categorize:** Let users trigger it manually rather than auto-run
2. **Show Suggestions:** Use CategorySuggestion in forms for better UX
3. **Monitor Stats:** Display CategorizationStats to show value
4. **Batch Import:** Always batch-categorize imported transactions
5. **Allow Override:** Keep manual categorization option
6. **Cache Awareness:** Educate users that first categorization is slow, subsequent are instant

## API Limits

- **Max transactions per batch:** 50
- **Max transactions per auto-categorize:** 100
- **Claude API rate limit:** 50 requests/minute
- **Our throughput:** 2500 transactions/minute (batched)

## Security Notes

- API key stored in environment variables (never committed)
- No PII sent to Claude (only merchant name and amount)
- Merchant cache is user-agnostic (global cache)
- Categories are user-specific (respects custom categories)

---

**Questions?** Check the full implementation in:
- Service: `/src/server/services/categorize.service.ts`
- Router: `/src/server/api/routers/transactions.router.ts`
- Components: `/src/components/transactions/`
