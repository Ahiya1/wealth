# Explorer 1 Report: Credit Card Bill Detection

## Executive Summary
Analyzed the Transaction model and file parsing system to understand how credit card bill detection should work. Credit card bills are typically single monthly payments to the credit card company that represent an aggregate of all credit card transactions for that billing period. Detection requires identifying these aggregate payments and either: (1) warning users about double-counting with existing imported CC transactions, or (2) allowing "resolution" to hide the aggregate and keep individual transactions.

## Credit Card Bill Pattern

### What is a Credit Card Bill?
When users import bank statements from their checking account, they will see:
1. **CC Bill Transaction**: A single large payment to "VISA CAL" or similar (e.g., ₪5,432.10)
2. **Individual CC Transactions**: Many smaller purchases (Supermarket: ₪150, Restaurant: ₪80, etc.)

**Problem**: If user imports BOTH:
- Bank statement with CC bill (₪5,432.10 to VISA CAL)
- Credit card statement with individual transactions (totaling ₪5,432.10)

**Double-counting occurs**: Total spending appears as ₪10,864.20 instead of ₪5,432.10

### Detection Criteria

Credit card bills can be detected by:
1. **Payee Name Patterns** (Primary):
   - "VISA CAL" / "ויזה כאל"
   - "ISRACARD" / "ישראכרט"
   - "MAX" / "מקס"
   - "LEUMI CARD" / "לאומי קארד"
   - "DINERS" / "דיינרס"

2. **Amount Pattern** (Secondary):
   - Unusually large expense (>₪1,000 for typical user)
   - Round-ish number (sums often end in .00 or .XX)

3. **Frequency Pattern** (Tertiary):
   - Once per month
   - Similar date each month (1st-10th typically)

### Current Schema Support

```prisma
model Transaction {
  id                     String   @id @default(cuid())
  userId                 String
  accountId              String
  date                   DateTime
  amount                 Decimal  @db.Decimal(15, 2)
  payee                  String
  categoryId             String
  notes                  String?  @db.Text
  tags                   String[]

  // Import tracking fields (already exist!)
  rawMerchantName          String?           // Original merchant name from bank
  importSource             ImportSource?     // MANUAL, FIBI, CAL, PLAID
  categorizedBy            CategorizationSource?
  categorizationConfidence ConfidenceLevel?

  // NO CC BILL FIELDS YET - will need to add or use tags
}
```

**Key Insight**: We can use the existing `tags` field to mark transactions as CC bills without schema migration:
- `tags: ["cc-bill"]` marks a transaction as a CC bill
- `tags: ["cc-bill-resolved"]` marks a bill that's been resolved

## Resolution Strategies

### Strategy 1: Warn and Skip (RECOMMENDED for MVP)
When importing bank statement:
1. Detect CC bill patterns in imported transactions
2. Show warning in UI: "Detected 2 credit card bill payments"
3. Let user choose: Import anyway / Skip CC bills
4. If skipped, don't create those transactions

**Pros**: Simple, no schema changes, clear UX
**Cons**: User must make decision during import

### Strategy 2: Auto-Exclude from Analytics
1. Import CC bills normally
2. Mark with tag `["cc-bill"]`
3. Exclude from spending analytics/budgets
4. Show in transaction list with visual indicator

**Pros**: All data preserved
**Cons**: Confusing for users, analytics get complex

### Strategy 3: Link and Resolve (COMPLEX - NOT for MVP)
1. Import CC bill with tag `["cc-bill-unresolved"]`
2. User clicks "Resolve this bill"
3. System finds matching CC transactions for that period
4. If totals match, mark as `["cc-bill-resolved"]`
5. Hide bill from analytics, keep CC transactions

**Pros**: Most accurate
**Cons**: Complex UI, matching logic difficult

## Implementation Recommendation

For Iteration 23, implement **Strategy 1: Warn and Skip**:

### 1. Detection Function
```typescript
// src/lib/services/cc-bill-detection.service.ts

const CC_PAYEE_PATTERNS = [
  /visa\s*cal/i,
  /ויזה\s*כאל/,
  /isracard/i,
  /ישראכרט/,
  /leumi\s*card/i,
  /לאומי\s*קארד/,
  /max\s*(it)?/i,
  /מקס/,
  /diners/i,
  /דיינרס/,
  /american\s*express/i,
  /amex/i,
]

export function isCreditCardBill(transaction: { payee: string; amount: number }): boolean {
  const payeeLower = transaction.payee.toLowerCase()

  // Check payee patterns
  for (const pattern of CC_PAYEE_PATTERNS) {
    if (pattern.test(transaction.payee)) {
      // Additional check: amount should be significant (>500 NIS)
      if (Math.abs(transaction.amount) > 500) {
        return true
      }
    }
  }

  return false
}

export function detectCreditCardBills(
  transactions: Array<{ payee: string; amount: number; date: Date }>
): { ccBills: typeof transactions; regular: typeof transactions } {
  const ccBills: typeof transactions = []
  const regular: typeof transactions = []

  for (const tx of transactions) {
    if (isCreditCardBill(tx)) {
      ccBills.push(tx)
    } else {
      regular.push(tx)
    }
  }

  return { ccBills, regular }
}
```

### 2. Integration with File Parser
Modify `parse_file` tool result to include CC bill detection:

```typescript
// In chat-tools.service.ts parse_file handler

const parsed = await parseFile(fileData)
const { ccBills, regular } = detectCreditCardBills(parsed.transactions)

return {
  ...parsed,
  transactions: regular,
  creditCardBills: ccBills,
  warning: ccBills.length > 0
    ? `Detected ${ccBills.length} credit card bill(s) that may cause double-counting. These have been excluded.`
    : null,
}
```

### 3. UI Enhancement (TransactionPreview)
Show CC bills separately with explanation:

```typescript
// In TransactionPreview.tsx

{creditCardBills.length > 0 && (
  <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
    <h4 className="font-medium text-amber-800">Credit Card Bills Detected</h4>
    <p className="text-sm text-amber-600">
      {creditCardBills.length} transaction(s) appear to be credit card bill payments.
      These are excluded to prevent double-counting with your credit card transactions.
    </p>
    <details className="mt-2">
      <summary className="text-sm text-amber-700 cursor-pointer">View excluded bills</summary>
      <ul className="mt-2 text-sm">
        {creditCardBills.map((bill, i) => (
          <li key={i}>{bill.payee}: ₪{Math.abs(bill.amount).toFixed(2)}</li>
        ))}
      </ul>
    </details>
  </div>
)}
```

## File Locations for Implementation

### New Files to Create
1. `src/lib/services/cc-bill-detection.service.ts` - Detection logic

### Files to Modify
1. `src/server/services/chat-tools.service.ts`:
   - Import cc-bill-detection.service
   - Modify parse_file tool to use detection
   - Add creditCardBills to result

2. `src/components/chat/TransactionPreview.tsx`:
   - Add creditCardBills prop
   - Render excluded bills section

3. `src/types/chat.ts` (if needed):
   - Add creditCardBills to ParsedFileResult type

## Testing Considerations

### Test Cases
1. Bank statement with "VISA CAL" payee → detected as CC bill
2. Bank statement with "ויזה כאל" (Hebrew) → detected as CC bill
3. Regular "SUPER MARKET" transaction → NOT detected as CC bill
4. Small VISA CAL transaction (<500) → NOT detected (might be refund/adjustment)
5. Multiple CC bills in same file → all detected

### Edge Cases
1. "VISA CAL REFUND" - should this be detected? (likely yes, let user decide)
2. Partial bill payments - harder to detect
3. Non-standard CC company names (international cards)

## Dependencies

### Required Imports
- No new npm packages needed
- Uses existing Decimal.js for amount handling

### Related Services
- `fileParser.service.ts` - upstream, provides parsed transactions
- `duplicate-detection.service.ts` - similar pattern matching logic to reference

## Risk Assessment

### Low Risk
- Detection is informational only (user can override)
- No schema changes required
- Uses existing tags infrastructure

### Medium Risk
- Hebrew pattern matching needs testing
- Edge cases with partial payments

### Not in Scope (Future Iterations)
- Bill-to-transaction linking
- Automatic reconciliation
- Historical CC bill detection for existing transactions
