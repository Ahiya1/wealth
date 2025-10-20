# Task: Fix seed-demo-data.ts script categoryId bug

## Type
FIX

## Timestamp
20251002-075600

## Context
- Error: Foreign key constraint violated: Transaction_categoryId_fkey
- Root cause: Script references non-existent categories (Transfer, Savings, Investment)
- Need: Map to existing default categories from prisma/seed.ts

## Scope
- Estimated files: 1 (scripts/seed-demo-data.ts)
- Estimated time: 10 minutes
- Complexity: SIMPLE

## Problem
The seed script uses categoryMap references for categories that don't exist in the default seed:
- 'Transfer' - doesn't exist
- 'Savings' - doesn't exist
- 'Investment' - doesn't exist

Existing categories from seed.ts:
- Groceries, Dining, Transportation, Shopping, Entertainment, Health, Housing, Income, Miscellaneous
- Child categories: Restaurants, Coffee, Gas, Public Transit, Subscriptions, Utilities, Salary

## Agent Assignment
Single healer agent
