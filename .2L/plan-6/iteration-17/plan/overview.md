# 2L Iteration Plan - Iteration 17: Security Foundation & Database Schema

## Project Vision

Establish bulletproof credential encryption infrastructure and database foundation for secure Israeli bank connection management. This iteration proves security patterns work before touching real bank APIs - zero external dependencies, pure foundation work.

## Success Criteria

Specific, measurable criteria for Iteration 17 completion:

- [ ] Database migration runs successfully on dev + staging Supabase
- [ ] Encryption/decryption roundtrip works with real credentials (mock data)
- [ ] Security tests pass (cannot decrypt without correct key)
- [ ] tRPC endpoints return expected data structures
- [ ] UI displays bank connection list (empty state works)
- [ ] TypeScript compilation with zero errors
- [ ] All tests pass (unit + integration)
- [ ] BankConnection and SyncLog models created with proper relationships
- [ ] Cascade deletes work correctly (verified with integration tests)
- [ ] No credentials logged anywhere (security audit passes)

## MVP Scope

**In Scope:**

- BankConnection Prisma model (9 fields with proper relationships)
- SyncLog Prisma model (7 fields tracking sync attempts)
- 7 new enums (BankProvider, ConnectionStatus, SyncStatus, ImportSource, CategorizationSource, ConfidenceLevel, AccountType reuse)
- Enhanced Transaction model (5 new nullable fields for import metadata)
- Extend encryption.ts with bank credential functions
- tRPC bankConnections router (5 endpoints: list, get, add, update, delete)
- Settings page bank connections section (list view + delete confirmation)
- Comprehensive security tests for encryption
- Database migration with proper indexes

**Out of Scope (Deferred to Later Iterations):**

- No actual bank scraping (israeli-bank-scrapers in Iteration 18)
- No connection wizard UI (basic scaffold only)
- No transaction import logic (Iteration 19)
- No background jobs or sync scheduling (Iteration 20)
- No OTP/2FA handling UI (Iteration 18)
- No transaction deduplication (Iteration 19)
- No AI categorization integration (Iteration 19)

## Development Phases

1. **Exploration** - Complete
2. **Planning** - Current (this document)
3. **Building** - ~6-8 hours (2-3 parallel builders)
4. **Integration** - ~30 minutes (merge + verify)
5. **Validation** - ~1 hour (testing + security audit)
6. **Deployment** - ~15 minutes (migration + deploy)

## Timeline Estimate

- Exploration: Complete
- Planning: Complete
- Building: 6-8 hours (parallel builders)
  - Builder-1 (Database & Encryption): 3-4 hours
  - Builder-2 (API & UI): 3-4 hours
- Integration: 30 minutes
- Validation: 1 hour
- Total: ~8-10 hours

## Risk Assessment

### High Risks

None - This is a LOW RISK iteration with zero external dependencies.

### Medium Risks

**Risk: Database Migration Conflicts**
- **Impact:** Could block development if migration fails on Supabase
- **Likelihood:** LOW (additive changes only, no destructive operations)
- **Mitigation Strategy:**
  - Test migration on local Supabase first
  - Review generated SQL manually
  - Backup production before applying
  - Keep rollback migration ready

**Risk: Encryption Key Loss**
- **Impact:** CRITICAL - All stored credentials become unrecoverable
- **Likelihood:** LOW - Environment variable managed via Vercel
- **Mitigation Strategy:**
  - Document key in secure password manager
  - Add key to Vercel environment variables with backup
  - Test key recovery procedure in staging
  - Never commit key to git

**Risk: Authorization Bypass**
- **Impact:** CRITICAL - Users could access other users' bank credentials
- **Likelihood:** MEDIUM - Easy to forget ownership check
- **Mitigation Strategy:**
  - Mandatory code review for all endpoints
  - Integration tests verifying 403/404 for unauthorized access
  - Use consistent ownership verification pattern
  - Add TypeScript helper for ownership checks

### Low Risks

**Risk: Schema Design Errors**
- **Impact:** LOW - Can be fixed with another migration
- **Likelihood:** LOW - Following proven patterns from existing models
- **Mitigation:** Review schema with existing Account/Transaction patterns

## Integration Strategy

### Builder Output Merge

**Builder-1 Output (Database & Encryption):**
- Updated `prisma/schema.prisma`
- New migration file in `prisma/migrations/`
- Extended `src/lib/encryption.ts`
- New `src/lib/__tests__/bank-credentials-encryption.test.ts`

**Builder-2 Output (API & UI):**
- New `src/server/api/routers/bankConnections.router.ts`
- Updated `src/server/api/root.ts` (import router)
- New `src/app/(dashboard)/settings/bank-connections/page.tsx`
- Updated `src/app/(dashboard)/settings/page.tsx` (add card)

**Integration Steps:**
1. Merge Builder-1 changes first (database foundation)
2. Run `npm run db:migrate` to apply migration locally
3. Verify schema in Prisma Studio
4. Merge Builder-2 changes (API depends on DB schema)
5. Run `npm run build` to verify TypeScript compilation
6. Run `npm test` to verify all tests pass
7. Manual testing: create/list/delete bank connection via UI

**Conflict Resolution:**
- No file conflicts expected (builders work on separate files)
- If both update `src/server/api/root.ts`, merge imports manually
- Schema conflicts impossible (only Builder-1 touches Prisma)

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Database migration tested on staging Supabase
- [ ] `ENCRYPTION_KEY` verified in Vercel environment variables
- [ ] TypeScript build succeeds with zero errors
- [ ] Security audit completed (no credentials in logs)
- [ ] Cascade delete verified with integration tests

### Deployment Steps

1. **Staging Deployment:**
   - Apply migration to staging Supabase: `npx prisma migrate deploy`
   - Deploy to Vercel staging environment
   - Smoke test: create bank connection, verify encryption works
   - Test delete cascade: delete connection, verify SyncLog deleted

2. **Production Deployment:**
   - Backup production database (Supabase dashboard)
   - Apply migration: `npx prisma migrate deploy`
   - Deploy to Vercel production
   - Verify environment variables set correctly
   - Monitor error logs for 30 minutes

3. **Rollback Plan:**
   - If migration fails: `npx prisma migrate resolve --rolled-back {migration-name}`
   - If runtime errors: revert Git commit, redeploy previous version
   - If data corruption: restore from Supabase backup

### Post-Deployment Validation

- [ ] Settings page loads without errors
- [ ] Bank connections section renders correctly
- [ ] Empty state displays when no connections exist
- [ ] Create connection endpoint works (test with dummy data)
- [ ] List endpoint returns empty array for new users
- [ ] Delete endpoint returns 404 for non-existent connection
- [ ] Encryption/decryption works in production environment

## Technical Architecture

### Database Schema Overview

**New Models:**
- `BankConnection`: Stores encrypted credentials and connection status
- `SyncLog`: Tracks sync attempts with timestamps and results

**Enhanced Models:**
- `Transaction`: Added 5 import-related fields (all nullable)

**New Enums:**
- `BankProvider`: FIBI, VISA_CAL
- `ConnectionStatus`: ACTIVE, ERROR, EXPIRED
- `SyncStatus`: SUCCESS, PARTIAL, FAILED
- `ImportSource`: MANUAL, FIBI, CAL, PLAID
- `CategorizationSource`: USER, AI_CACHED, AI_SUGGESTED
- `ConfidenceLevel`: HIGH, MEDIUM, LOW

### Security Architecture

**Encryption:**
- Algorithm: AES-256-GCM (FIPS 140-2 compliant)
- Key Management: Static environment variable (`ENCRYPTION_KEY`)
- Format: `iv:authTag:encrypted` (hex-encoded)
- Authentication: GCM mode provides tamper detection

**Authorization:**
- All endpoints use `protectedProcedure` (Supabase auth)
- Ownership verification on all mutations
- User isolation via `userId` foreign keys
- RLS-equivalent authorization in tRPC layer

**Audit Trail:**
- SyncLog records all sync attempts
- Never log credentials or sensitive data
- Cascade delete on user/connection deletion

### API Layer

**Router:** `bankConnections.router.ts`

**Endpoints:**
1. `list` (query) - Get all user's bank connections
2. `get` (query) - Get single connection by ID
3. `add` (mutation) - Create connection with encrypted credentials
4. `update` (mutation) - Update connection status/credentials
5. `delete` (mutation) - Delete connection (cascade to SyncLogs)

**Input Validation:** Zod schemas for all endpoints

**Error Handling:** Standard tRPC error codes (NOT_FOUND, INTERNAL_SERVER_ERROR)

## Dependencies

### No New Dependencies Required

All necessary libraries already installed:
- `@prisma/client@5.22.0` - Database ORM
- `@trpc/server@11.6.0` - API framework
- `zod@3.23.8` - Input validation
- `@supabase/supabase-js@2.58.0` - Authentication
- Node.js `crypto` module - Encryption (built-in)
- `lucide-react@0.460.0` - Icons (Landmark icon)

### Environment Variables

**Required (already configured):**
- `DATABASE_URL` - Supabase PostgreSQL connection
- `DIRECT_URL` - Supabase direct connection (for migrations)
- `ENCRYPTION_KEY` - 64-character hex string (32 bytes)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

**Verification Command:**
```bash
vercel env pull
grep ENCRYPTION_KEY .env.local
```

## Next Steps After Iteration 17

1. **Iteration 18: Israeli Bank Integration**
   - Install `israeli-bank-scrapers` library
   - Implement real bank scraper wrappers
   - Build connection wizard UI with 2FA handling
   - Test with real FIBI and CAL accounts

2. **Iteration 19: Import Pipeline & Categorization**
   - Build transaction import service
   - Implement duplicate detection
   - Integrate with existing AI categorization
   - Manual sync trigger UI

3. **Iteration 20: Budget Integration & Polish**
   - Real-time budget updates
   - Dashboard enhancements
   - Performance optimization
   - Production monitoring

---

**Iteration Status:** PLANNED
**Ready for:** Builder execution
**Risk Level:** LOW
**Estimated Duration:** 6-8 hours
