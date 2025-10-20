# Builder Task Breakdown - Iteration 7

## Overview

**1 primary builder** will implement all features sequentially.

**Total Estimated Time:** 3-3.5 hours

**Why Single Builder:**
- Features are tightly coupled (all live in /settings/account page)
- No meaningful parallelization opportunities
- Integration is simpler with single owner
- Consistent patterns across all sections
- Testing easier with single developer context

**Implementation Strategy:**
Sequential implementation in priority order:
1. Theme system (needed for testing all other features)
2. Settings page structure (foundation)
3. Profile management (establishes form patterns)
4. Export system (extends existing patterns)
5. Account deletion (most complex, done last)

---

## Builder-1: Complete User Management & Exports

### Scope

Implement comprehensive user management and data export capabilities:
- Install and configure next-themes for light/dark/system theme switching
- Define dark mode CSS color palette
- Create theme switcher component
- Build account settings page with profile management
- Add CSV export for budgets, goals, accounts (transactions exists)
- Add JSON export for complete data backup
- Implement secure account deletion with multi-step confirmation
- Integrate Supabase Auth admin API for user deletion
- Update settings hub navigation

### Complexity Estimate

**MEDIUM**

Individual features are LOW complexity, but combined scope is substantial. No sub-builder split recommended - features share context and patterns.

**Time Breakdown:**
- Theme system: 30 min
- Settings page structure: 20 min
- Profile form: 30 min
- Export system: 60 min
- Account deletion: 45 min
- Testing/polish: 15-30 min
- **Total: 3-3.5 hours**

### Success Criteria

**Theme System:**
- [ ] next-themes installed and ThemeProvider configured
- [ ] Dark mode CSS variables defined with proper contrast ratios
- [ ] ThemeSwitcher component works (light/dark/system)
- [ ] Theme preference persists across browser sessions
- [ ] No flash of wrong theme on page load
- [ ] All pages render correctly in both light and dark modes

**Profile Management:**
- [ ] Account settings page created at /settings/account
- [ ] Profile form allows updating name, currency, timezone
- [ ] Email displayed as read-only field
- [ ] Form validation works (required fields, max length)
- [ ] Success toast on save
- [ ] Error toast on failure
- [ ] Updated profile reflects in sidebar/dashboard

**Data Exports:**
- [ ] CSV export functions for budgets, goals, accounts
- [ ] JSON export function for complete data backup
- [ ] UTF-8 BOM prefix added to all CSV files
- [ ] Export buttons integrated on budgets, goals, accounts pages
- [ ] Files download with correct filenames (date-stamped)
- [ ] CSV files open correctly in Excel and Google Sheets
- [ ] JSON file is valid and includes all user data

**Account Deletion:**
- [ ] DangerZone component in account settings
- [ ] Multi-step confirmation (email + checkbox)
- [ ] Data preview shows transaction/budget/goal counts
- [ ] Deletion removes all Prisma data (cascade verified)
- [ ] Deletion removes Supabase Auth user
- [ ] Redirect to sign-in page after deletion
- [ ] Error handling for partial deletion scenarios

**Integration:**
- [ ] Settings hub links to account settings page
- [ ] All forms follow existing patterns (react-hook-form + zod)
- [ ] All mutations use protectedProcedure
- [ ] All components use established UI patterns
- [ ] Mobile responsive (all new pages)

### Files to Create

**New Files (13 total):**

```
src/
├── app/(dashboard)/settings/account/
│   └── page.tsx                      # Account settings page
├── components/settings/
│   ├── ProfileSection.tsx            # Profile form (name, currency, timezone)
│   ├── ThemeSwitcher.tsx             # Theme toggle component
│   ├── DangerZone.tsx                # Account deletion with confirmation
│   └── ExportAllDataButton.tsx       # JSON export button (optional)
├── lib/
│   └── jsonExport.ts                 # JSON export utilities
└── (no other new files needed)
```

**Files to Modify (7 total):**

```
src/
├── app/
│   ├── providers.tsx                 # ADD: ThemeProvider wrapper
│   ├── globals.css                   # ADD: .dark { } CSS variables
│   └── (dashboard)/settings/
│       └── page.tsx                  # ADD: Link to account settings
├── lib/
│   └── csvExport.ts                  # ADD: Budget/Goal/Account CSV functions
├── server/api/routers/
│   └── users.router.ts               # ADD: 3 new endpoints
├── components/
│   └── (budgets|goals|accounts)/
│       └── *List.tsx                 # ADD: Export buttons (3 files)
└── package.json                      # ADD: next-themes dependency
```

**Line Count Estimate:**
- New files: ~750 lines
- Modified files: ~200 lines
- Total: ~950 lines

### Dependencies

**Before Starting:**
- None (no blockers)

**External Dependencies:**
- Supabase service role key in environment variables
- Existing tRPC infrastructure
- Existing UI components (Radix)

**Installation Required:**
```bash
npm install next-themes
```

### Implementation Notes

#### Phase 1: Theme System (30 min)

**Steps:**
1. Install next-themes: `npm install next-themes`
2. Modify `src/app/providers.tsx`:
   - Import ThemeProvider from next-themes
   - Wrap TRPCProvider in ThemeProvider
   - Configure: `attribute="class"`, `defaultTheme="system"`, `enableSystem`
3. Add dark mode CSS to `src/app/globals.css`:
   - Copy light mode variables from :root
   - Create .dark { } section
   - Adjust colors for dark background (see patterns.md Pattern 2)
   - Verify contrast ratios with WebAIM checker
4. Create `src/components/settings/ThemeSwitcher.tsx`:
   - Follow Pattern 3 in patterns.md exactly
   - Include mounted check to prevent hydration mismatch
   - Sun/Moon icons with smooth transitions
5. Test theme switching in isolation

**Gotchas:**
- Must use `'use client'` in ThemeSwitcher (useTheme is client hook)
- Add mounted check to prevent SSR mismatch
- Test in Incognito to verify localStorage persistence
- Verify no flash on page refresh (next-themes script should prevent)

#### Phase 2: Settings Page Structure (20 min)

**Steps:**
1. Create `src/app/(dashboard)/settings/account/page.tsx`
   - Follow Pattern 11 in patterns.md
   - Server Component (no 'use client')
   - Sections: Profile, Appearance, Danger Zone
   - Separators between sections
2. Modify `src/app/(dashboard)/settings/page.tsx`:
   - Add new card linking to /settings/account
   - Icon: User or Settings icon from lucide-react
   - Title: "Account Settings"
   - Description: "Manage your profile, preferences, and security"
3. Test navigation between settings pages

**Gotchas:**
- Maintain consistent card design (copy existing category card)
- Use Link from next/link (client-side navigation)
- Test mobile responsive layout

#### Phase 3: Profile Management (30 min)

**Steps:**
1. Create `src/components/settings/ProfileSection.tsx`:
   - Follow Pattern 9 in patterns.md exactly
   - Form with name, currency, timezone fields
   - Email as disabled/read-only field
   - Currency dropdown with 6 common options
   - Timezone dropdown with 7 common options
   - Save button (disabled until dirty)
2. Add tRPC endpoint in `src/server/api/routers/users.router.ts`:
   - `updateProfile` mutation (see Pattern 8)
   - Zod validation for all fields
   - Optional fields with conditional spread
3. Import ProfileSection into account/page.tsx
4. Test form submission, validation, error handling

**Gotchas:**
- Use `setValue` for Select components (not register)
- Set defaultValues from user query data
- Invalidate `users.me` cache on success
- Show helpful message for currency ("display only")

#### Phase 4: Export System (60 min)

**Steps:**
1. Add CSV export functions to `src/lib/csvExport.ts`:
   - `generateBudgetCSV()` (Pattern 4)
   - `generateGoalCSV()` (Pattern 5)
   - `generateAccountCSV()` (Pattern 6)
   - Add UTF-8 BOM prefix to all (`\uFEFF`)
   - Test quote escaping with sample data
2. Create `src/lib/jsonExport.ts`:
   - `generateCompleteDataJSON()` (Pattern 7)
   - `downloadJSON()` function
   - Handle Prisma Decimal → number conversion
   - Pretty print with indent=2
3. Add tRPC endpoints:
   - `budgets.export` query (CSV/JSON)
   - `goals.export` query (CSV/JSON)
   - `accounts.export` query (CSV/JSON)
   - `users.exportAllData` query (JSON only)
   - All queries filtered by userId
   - Hard limit: 10,000 rows
4. Add export buttons to list pages:
   - Modify BudgetList.tsx (add ExportButton)
   - Modify GoalList.tsx (add ExportButton)
   - Modify AccountList.tsx (add ExportButton)
   - TransactionList already has export
5. Test all 8 export combinations (4 types × 2 formats)

**Gotchas:**
- Prisma Decimal type must be converted to number for JSON
- CSV quote escaping: replace `"` with `""`
- UTF-8 BOM required for Excel to recognize encoding
- Filename format: `{type}-{YYYY-MM-DD}.{ext}`
- Use existing ExportButton component (in transactions folder)
- Test in Excel (Windows & Mac) and Google Sheets

#### Phase 5: Account Deletion (45 min)

**Steps:**
1. Create `src/components/settings/DangerZone.tsx`:
   - Follow Pattern 10 in patterns.md exactly
   - Red border, danger styling
   - Button triggers AlertDialog
   - Email confirmation input
   - "I understand" checkbox
   - Delete button disabled until both confirmed
2. Add tRPC endpoint in `src/server/api/routers/users.router.ts`:
   - `deleteAccount` mutation (see Pattern 8)
   - Delete Prisma user first (cascade handles relations)
   - Then delete Supabase auth user (admin API)
   - Log errors but don't throw if Supabase fails
   - Return success: true
3. Set environment variable:
   - Add `SUPABASE_SERVICE_ROLE_KEY` to .env.local
   - Get key from Supabase dashboard → Settings → API
   - Verify key works in server-side code
4. Import DangerZone into account/page.tsx
5. Test deletion flow end-to-end (use test account!)

**Gotchas:**
- NEVER expose service role key to client
- Import Supabase client dynamically in mutation (server-side only)
- Delete Prisma FIRST (safe failure mode)
- If Supabase fails, log but don't throw (data already deleted)
- Test redirect to /signin after deletion
- Verify all user data removed from database
- Test re-sign-in after deletion (should create new user)

#### Phase 6: Testing & Polish (15-30 min)

**Testing Checklist:**

**Theme:**
- [ ] Toggle between light/dark/system
- [ ] Preference persists on page reload
- [ ] No flash on initial load (test in Incognito)
- [ ] All pages readable in dark mode
- [ ] Sidebar, cards, forms all styled correctly
- [ ] Contrast ratios meet WCAG AA (use browser DevTools)

**Profile:**
- [ ] Update name → saves and displays in sidebar
- [ ] Update currency → saves (verify in DB)
- [ ] Update timezone → saves
- [ ] Email field is disabled
- [ ] Validation errors show for empty name
- [ ] Toast shows on success
- [ ] Toast shows on error (test by disconnecting network)

**Exports:**
- [ ] Budget CSV downloads with correct filename
- [ ] Budget JSON downloads
- [ ] Goal CSV/JSON downloads
- [ ] Account CSV/JSON downloads
- [ ] Transaction export still works (existing)
- [ ] Open CSV in Excel → displays correctly (no garbage)
- [ ] Open CSV in Google Sheets → displays correctly
- [ ] JSON file is valid (paste into jsonlint.com)
- [ ] JSON includes all data types

**Deletion:**
- [ ] Click "Delete Account" → modal opens
- [ ] Type wrong email → button disabled
- [ ] Uncheck checkbox → button disabled
- [ ] Type correct email + check → button enabled
- [ ] Click delete → deletion starts (loading state)
- [ ] Success toast appears
- [ ] Redirect to /signin works
- [ ] Verify data deleted in Prisma (check DB)
- [ ] Verify auth user deleted in Supabase (check dashboard)
- [ ] Try to sign in with deleted account → fails or creates new user

**Regression:**
- [ ] Existing features still work (transactions, budgets, goals)
- [ ] Sidebar navigation works
- [ ] Forms on other pages still work
- [ ] No console errors
- [ ] Mobile responsive (test on phone or DevTools)

### Patterns to Follow

**Reference these patterns from patterns.md:**

**Theme System:**
- Pattern 1: ThemeProvider Setup
- Pattern 2: Dark Mode CSS Variables
- Pattern 3: Theme Switcher Component

**Exports:**
- Pattern 4: Budget CSV Export
- Pattern 5: Goal CSV Export
- Pattern 6: Account CSV Export
- Pattern 7: Complete Data JSON Export

**Forms:**
- Pattern 9: Profile Form Component
- Pattern 10: Account Deletion Component

**Routing:**
- Pattern 11: Account Settings Page

**API:**
- Pattern 8: Update Profile Endpoint (includes exportAllData and deleteAccount)

**Follow existing patterns for:**
- Form validation (react-hook-form + zod)
- tRPC mutations (onSuccess, onError, invalidate cache)
- Toast notifications (success/error feedback)
- Button loading states (isPending)
- Import order (see patterns.md)

### Testing Requirements

**Unit Tests (Optional):**
- CSV export functions (quote escaping, date formatting)
- JSON export (Decimal conversion)
- Form validation schemas

**Integration Tests:**
- Account deletion cascade (verify all relations deleted)
- Export data filtering (userId isolation)

**Manual Tests (Required):**
- All features per testing checklist above
- Dark mode visual inspection on all pages
- CSV/JSON file downloads in Excel/Sheets
- Account deletion end-to-end (test account)

**Accessibility:**
- Run Lighthouse audit on settings pages
- Verify keyboard navigation works
- Check color contrast (WCAG AA minimum)

### Potential Split Strategy

**NOT RECOMMENDED** - This task should remain with one builder.

**Rationale:**
- Features share context (all in /settings/account)
- Sequential dependencies (theme needed for other testing)
- Integration complexity outweighs parallel benefits
- Total time (3-3.5 hours) is manageable for single session

**If forced to split (not advised):**

**Foundation Builder:**
- Theme system
- Settings page structure
- Profile management

**Advanced Builder (depends on foundation):**
- Export system
- Account deletion

**Problems with splitting:**
- Export buttons need theme testing
- Account deletion needs settings page
- Communication overhead
- Integration testing duplicated

---

## Builder Execution Order

**Single Builder - Sequential Tasks:**

```
Day 1 (2 hours):
├─ 1. Theme System (30 min)
│  └─ Test theme switching
├─ 2. Settings Page Structure (20 min)
│  └─ Test navigation
├─ 3. Profile Management (30 min)
│  └─ Test form submission
└─ 4. Export System (60 min) START
   └─ CSV functions, endpoints (partial)

Day 2 (1.5 hours):
├─ 4. Export System COMPLETE (30 min)
│  └─ Test all exports
├─ 5. Account Deletion (45 min)
│  └─ Test deletion flow
└─ 6. Integration Testing (15-30 min)
   └─ Full checklist
```

**Or Single Session (3.5 hours):**
- Recommended for experienced builder
- All tasks in one sitting
- Better context retention
- Cleaner git history

## Integration Notes

**Theme Integration:**
- ThemeProvider wraps entire app (affects all pages)
- Test every page in dark mode (dashboard, transactions, budgets, goals, analytics)
- Pay special attention to charts/graphs (may need color adjustments)
- Verify PDF exports if they exist (may render differently)

**Export Integration:**
- Export buttons added to existing list pages
- Ensure consistent placement (top-right toolbar)
- Maintain existing filter functionality (exports should respect filters)
- Test with empty data (0 transactions/budgets/goals)

**Settings Integration:**
- New /settings/account route
- Update settings hub with link card
- Ensure breadcrumb navigation works
- Test back button functionality

**Deletion Integration:**
- Prisma cascade deletes all relationships
- Supabase auth cleanup via admin API
- Test with account that has all data types
- Verify no orphaned records in any table

**Shared Files:**
- `users.router.ts` - Adding 3 new endpoints to existing router
- `csvExport.ts` - Extending existing file with 3 new functions
- `settings/page.tsx` - Adding one link card
- `providers.tsx` - Wrapping in ThemeProvider
- `globals.css` - Adding .dark { } section

**Conflict Prevention:**
- All new features in new files (minimal modifications)
- No changes to core business logic
- Additive changes only (no deletions)
- Single builder = no merge conflicts

## Final Deliverables

**Code:**
- [ ] 13 new files created
- [ ] 7 files modified
- [ ] next-themes dependency installed
- [ ] All code follows patterns.md examples
- [ ] No TypeScript errors
- [ ] No console errors

**Features:**
- [ ] Theme switcher works (light/dark/system)
- [ ] Profile form saves changes
- [ ] 8 export endpoints work (4 types × 2 formats)
- [ ] Account deletion removes all data
- [ ] Settings page navigation complete

**Quality:**
- [ ] All forms validated with Zod
- [ ] All mutations use protectedProcedure
- [ ] All queries filtered by userId
- [ ] Dark mode contrast meets WCAG AA
- [ ] CSV files open correctly in Excel/Sheets
- [ ] Mobile responsive (all new UI)

**Documentation:**
- [ ] Environment variable documented (SUPABASE_SERVICE_ROLE_KEY)
- [ ] Deployment notes (see overview.md)
- [ ] Testing checklist completed

**Testing:**
- [ ] Manual testing checklist 100% complete
- [ ] Theme tested on all pages
- [ ] Exports tested in Excel and Google Sheets
- [ ] Deletion tested with test account
- [ ] Regression testing passed

## Time Tracking

**Actual Time (to be filled by builder):**

- Theme System: _____ min (estimated: 30 min)
- Settings Structure: _____ min (estimated: 20 min)
- Profile Management: _____ min (estimated: 30 min)
- Export System: _____ min (estimated: 60 min)
- Account Deletion: _____ min (estimated: 45 min)
- Testing/Polish: _____ min (estimated: 15-30 min)
- **Total: _____ hours (estimated: 3-3.5 hours)**

**Blockers Encountered:**
- (Document any unexpected issues here)

**Lessons Learned:**
- (Document what went well / what could improve)

---

## Success Metrics

**Iteration 7 is complete when:**

1. User can toggle theme (light/dark/system) and it persists
2. User can update profile (name, currency, timezone) and changes save
3. User can export CSV for budgets, goals, accounts (+ existing transactions)
4. User can export JSON backup of all data
5. User can delete account with email + checkbox confirmation
6. Account deletion removes all data from Prisma and Supabase
7. All pages render correctly in both light and dark modes
8. CSV files open without corruption in Excel and Google Sheets
9. Dark mode meets WCAG AA contrast standards
10. Mobile responsive (all new pages/components)
11. No regressions in existing features
12. All manual tests pass

**Definition of Done:**
- All success criteria checked
- All deliverables complete
- Testing checklist 100% pass rate
- Code reviewed (self-review minimum)
- Merged to main branch
- Deployed to production
- Post-deployment verification passed
