# Builder-5C Integration Checklist

## Files Created (7 implementation files + 1 test file)

### Service Layer
- [x] `/src/server/services/categorize.service.ts` (296 lines)

### tRPC Router Updates
- [x] `/src/server/api/routers/transactions.router.ts` (added 225 lines of categorization procedures)

### UI Components
- [x] `/src/components/transactions/AutoCategorizeButton.tsx` (52 lines)
- [x] `/src/components/transactions/CategorySuggestion.tsx` (79 lines)
- [x] `/src/components/transactions/CategorizationStats.tsx` (89 lines)

### Database Schema
- [x] `prisma/schema.prisma` (added MerchantCategoryCache model + Category relation)

### Tests
- [x] `/src/server/services/__tests__/categorize.service.test.ts` (172 lines)

## Integration Steps

### 1. Database Migration
```bash
# Generate migration for MerchantCategoryCache model
npx prisma migrate dev --name add_merchant_category_cache

# Generate Prisma Client with new model
npx prisma generate
```

### 2. Install Dependencies
```bash
# Install Anthropic SDK
npm install @anthropic-ai/sdk@0.32.1

# Install testing dependencies (if not already installed)
npm install --save-dev vitest vitest-mock-extended
```

### 3. Environment Variables
Add to `.env.local`:
```bash
ANTHROPIC_API_KEY="sk-ant-your-api-key-here"
```

Get API key from: https://console.anthropic.com/

### 4. Verify tRPC Router Integration
Check that transactions router is exported in `/src/server/api/root.ts`:
```typescript
import { transactionsRouter } from './routers/transactions.router'

export const appRouter = router({
  // ...other routers
  transactions: transactionsRouter,
})
```

### 5. Test Categorization Service
```bash
# Run unit tests
npm run test src/server/services/__tests__/categorize.service.test.ts

# Expected: 11 tests passing
```

### 6. Manual Testing
1. Create a transaction with "Miscellaneous" category
2. Call `trpc.transactions.autoCategorizeUncategorized.mutate()`
3. Verify transaction is re-categorized
4. Create another transaction with same merchant
5. Verify it uses cached category (instant)

### 7. UI Integration (for Builder-5D)

Add to transaction list page:
```typescript
import { AutoCategorizeButton } from '@/components/transactions/AutoCategorizeButton'

// In transaction list page
<AutoCategorizeButton onComplete={() => refetch()} />
```

Add to transaction form:
```typescript
import { CategorySuggestion } from '@/components/transactions/CategorySuggestion'

// In manual transaction form
<CategorySuggestion
  payee={watch('payee')}
  amount={watch('amount')}
  onSelect={(categoryId) => setValue('categoryId', categoryId)}
/>
```

Add statistics card to dashboard:
```typescript
import { CategorizationStats } from '@/components/transactions/CategorizationStats'

// In dashboard or settings page
<CategorizationStats />
```

### 8. Integration with Builder-5B (Plaid Sync)

In Plaid transaction sync service, after creating transactions:
```typescript
import { categorizeTransactions } from '@/server/services/categorize.service'

// After syncing transactions from Plaid
const uncategorizedTxns = newTransactions.map(t => ({
  id: t.id,
  payee: t.payee,
  amount: t.amount.toNumber(),
}))

// Categorize in background
const results = await categorizeTransactions(userId, uncategorizedTxns, prisma)

// Update with categories
for (const result of results) {
  if (result.categoryId) {
    await prisma.transaction.update({
      where: { id: result.transactionId },
      data: { categoryId: result.categoryId },
    })
  }
}
```

## Verification Checklist

### Database
- [ ] MerchantCategoryCache table exists
- [ ] Category model has merchantCategoryCache relation
- [ ] Indexes on merchant and categoryId exist

### Service Layer
- [ ] categorize.service.ts imports successfully
- [ ] No TypeScript errors
- [ ] All exports are available

### tRPC
- [ ] transactions.categorize procedure exists
- [ ] transactions.categorizeBatch procedure exists
- [ ] transactions.autoCategorizeUncategorized procedure exists
- [ ] transactions.suggestCategory procedure exists
- [ ] transactions.categorizationStats procedure exists

### UI Components
- [ ] AutoCategorizeButton renders without errors
- [ ] CategorySuggestion renders without errors
- [ ] CategorizationStats renders without errors
- [ ] All icons (Sparkles, Brain, TrendingUp, Loader2) display correctly

### Environment
- [ ] ANTHROPIC_API_KEY is set
- [ ] API key is valid (test with simple Claude call)

### Testing
- [ ] Unit tests pass
- [ ] No test failures
- [ ] Coverage >80%

## Potential Issues & Solutions

### Issue: "Cannot find module '@anthropic-ai/sdk'"
**Solution:** Run `npm install @anthropic-ai/sdk@0.32.1`

### Issue: "ANTHROPIC_API_KEY is not defined"
**Solution:** Add to `.env.local` and restart dev server

### Issue: Prisma migration fails
**Solution:**
```bash
npx prisma migrate reset # WARNING: Deletes all data
npx prisma migrate dev --name init
```

### Issue: Cache not working
**Solution:** Check that merchant names are normalized (lowercase, trimmed)

### Issue: API calls are slow
**Solution:**
- First call per merchant is slow (API call)
- Subsequent calls are fast (cache hit)
- Check cache hit rate with `categorizationStats` query

### Issue: Categorizations are inaccurate
**Solution:**
- Verify category names are exactly as they appear in database
- Check prompt structure in categorize.service.ts
- Consider manually categorizing common merchants

## Performance Expectations

### First-Time Categorization
- **50 transactions:** ~1.5 seconds
- **100 transactions:** ~3 seconds (2 batches)
- **500 transactions:** ~15 seconds (10 batches)

### Cached Categorization
- **Any number of cached transactions:** <100ms

### Cache Hit Rate
- **After 100 transactions:** ~40-50%
- **After 500 transactions:** ~70-80%
- **After 1000 transactions:** ~85-90%

## Cost Monitoring

Track costs with:
```typescript
const stats = await trpc.transactions.categorizationStats.useQuery()
console.log('Cache hit rate:', stats.cacheHitRate)
```

Expected costs:
- Initial 100 transactions: ~$0.006
- Monthly 200 new transactions: ~$0.024
- With 80% cache: ~$0.005/month

## Documentation Links

- [Anthropic API Docs](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Claude Pricing](https://www.anthropic.com/api)
- [Prisma Caching Strategies](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

## Support

If issues arise during integration:
1. Check that all dependencies are installed
2. Verify environment variables are set
3. Run Prisma migration
4. Check console for TypeScript errors
5. Review unit tests for expected behavior
6. Check categorization stats for cache performance

## Next Builder Dependencies

**Builder-5B (Plaid Integration):** Should import and call `categorizeTransactions()` after syncing
**Builder-5D (Transaction UI):** Should integrate UI components into pages

## Success Criteria Verification

After integration, verify:
- [ ] Can auto-categorize uncategorized transactions
- [ ] Category suggestions appear in transaction forms
- [ ] Batch categorization works for imported transactions
- [ ] Cache improves performance over time
- [ ] API costs remain low (<$1/month per user)
- [ ] Manual override still works (existing update procedure)
- [ ] Statistics display correctly

## Rollback Plan

If categorization needs to be disabled:
1. Comment out categorization calls in Plaid sync
2. Remove AutoCategorizeButton from UI
3. Keep service and database model for future use
4. No data loss (transactions remain as-is)

---

**Integration Status:** Ready for integration
**Blocked By:** None
**Blocks:** Builder-5D (UI), final integration testing
**Estimated Integration Time:** 10-15 minutes
