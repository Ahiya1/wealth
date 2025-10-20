# Rollback Instructions

## To rollback this migration:

```bash
# Option 1: Rollback to previous migration
npx prisma migrate resolve --rolled-back 20251003000156_add_currency_conversion_models

# Option 2: Manual SQL rollback
psql $DATABASE_URL << 'EOF'
-- Drop foreign key
ALTER TABLE "CurrencyConversionLog" DROP CONSTRAINT "CurrencyConversionLog_userId_fkey";

-- Drop tables
DROP TABLE "CurrencyConversionLog";
DROP TABLE "ExchangeRate";

-- Drop enum
DROP TYPE "ConversionStatus";

-- Remove column from Account
ALTER TABLE "Account" DROP COLUMN "originalCurrency";
EOF
```

## What this rollback removes:

1. **ExchangeRate table** - Exchange rate cache
2. **CurrencyConversionLog table** - Audit log for conversions
3. **ConversionStatus enum** - Status enum for conversion logs
4. **Account.originalCurrency field** - Field for Plaid account currency tracking

## Data Loss Warning:

⚠️ Rolling back this migration will delete:
- All cached exchange rates
- All conversion history logs
- The originalCurrency value for all accounts

This rollback is safe if no currency conversions have been performed yet.

## Verification after rollback:

```bash
npx prisma migrate status
```

Should show migration as "rolled back" or not applied.
