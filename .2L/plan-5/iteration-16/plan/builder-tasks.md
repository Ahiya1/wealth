# Builder Task Breakdown - Iteration 16

## Overview

**4 primary builders** will work in parallel with minimal dependencies.

**Estimated Total Time:** 8-10 hours (building) + 2-3 hours (validation) = 10-13 hours

**Strategy:** Builder 1 creates foundation components first. Builders 2-3 work in parallel on context pages using Builder 1's components. Builder 4 handles testing and polish.

---

## Builder-1: Foundation Components & Utilities

### Scope

Create the core infrastructure that all other builders will use:
- Web Share API integration utilities
- Platform detection utilities
- ExportButton component (platform-aware icons)
- FormatSelector component (CSV/JSON/Excel dropdown)
- useExport hook (shared export logic)

This is the **foundation** for all context page exports. Must complete before Builders 2-3 start.

### Complexity Estimate

**MEDIUM-HIGH** (Foundation work requires careful design)

**Rationale:** Multiple interrelated components, Web Share API integration needs thorough testing, must work across all platforms (iOS/Android/Desktop).

### Success Criteria

- [ ] `src/lib/exportHelpers.ts` created with getPlatformInfo, exportFile, downloadFile, decodeExportContent functions
- [ ] Web Share API integration works on iOS Safari and Chrome Android (test on real devices)
- [ ] Download fallback works on desktop browsers (Chrome, Firefox, Safari)
- [ ] `src/components/exports/ExportButton.tsx` created with platform-aware icons (Share on mobile, Download on desktop)
- [ ] `src/components/exports/FormatSelector.tsx` created with 44px dropdown items
- [ ] `src/hooks/useExport.ts` created with format persistence (localStorage) and export logic
- [ ] All components use TypeScript strict mode (no `any` types)
- [ ] All interactive elements meet 44px minimum touch target
- [ ] Error handling includes AbortError catch (share cancellation)
- [ ] File size check warns if >50MB on mobile

### Files to Create

**New Files:**
- `src/lib/exportHelpers.ts` - Web Share API integration, platform detection, file utilities
- `src/components/exports/ExportButton.tsx` - Platform-aware export button component
- `src/components/exports/FormatSelector.tsx` - Format selector dropdown component
- `src/hooks/useExport.ts` - Shared export logic hook

**No Files to Modify** - This builder creates new infrastructure only

### Dependencies

**Depends on:** None (foundation builder)

**Blocks:** Builder-2, Builder-3 (they need these components to build context page exports)

### Implementation Notes

**Web Share API Implementation:**
1. Feature detection MUST use both `navigator.share` AND `navigator.canShare({ files: [file] })`
2. Catch `AbortError` specifically (user cancelled share) - don't show error toast
3. All other errors should fallback to download
4. Test on REAL devices (iOS and Android) - emulators don't fully replicate share sheet behavior

**Platform Detection:**
- Use `navigator.userAgent.toLowerCase()` for iOS/Android detection
- Use `window.matchMedia('(max-width: 768px)')` as fallback for mobile detection
- Memoize platform info (don't recalculate on every render)

**Touch Targets:**
- All buttons MUST use existing Button component (already 44px mobile sizing)
- Dropdown items MUST have `min-h-[44px]` class
- Test with Chrome DevTools mobile emulation (iPhone 14 Pro, Pixel 7)

**Format Persistence:**
- Save user's format preference to `localStorage.setItem('exportFormat', format)`
- Load on mount: `localStorage.getItem('exportFormat') || 'CSV'`
- Handle SSR (check `typeof window !== 'undefined'`)

### Patterns to Follow

**From `patterns.md`:**
- Export Helpers Pattern (complete implementation provided)
- ExportButton Component Pattern (complete implementation provided)
- FormatSelector Component Pattern (complete implementation provided)
- Export Hook Pattern (complete implementation provided)

**Import Order:**
1. React/Next.js
2. Third-party libraries (alphabetical)
3. tRPC/API
4. Components (absolute imports)
5. Utilities (absolute imports)
6. Types (last)

**TypeScript:**
- Use strict mode (no `any` types)
- Define proper interfaces for all props
- Use `as const` for readonly objects (e.g., EXPORT_FORMATS)

### Testing Requirements

**Manual Testing (Real Devices Required):**

**iOS Safari (iPhone 12+, iOS 15+):**
- [ ] Click export button → Native share sheet appears
- [ ] Share sheet shows "Save to Files" option
- [ ] File saves correctly to Files app
- [ ] Cancel share sheet → No error toast shown
- [ ] Export button shows iOS share icon (ShareIcon from lucide)

**Chrome Android (Android 10+, Chrome 89+):**
- [ ] Click export button → Native share sheet appears
- [ ] Share sheet shows "Save to Downloads" option
- [ ] File saves correctly to Downloads folder
- [ ] Cancel share sheet → No error toast shown
- [ ] Export button shows Android share icon (Share2 from lucide)

**Desktop Browsers:**
- [ ] Chrome: Export button shows download icon, standard download works
- [ ] Firefox: Export button shows download icon, standard download works
- [ ] Safari: Export button shows download icon, standard download works

**Component Testing:**
- [ ] FormatSelector: All 3 formats selectable (CSV, JSON, Excel)
- [ ] FormatSelector: Dropdown items are 44px height (mobile emulation)
- [ ] ExportButton: Shows loading spinner when loading prop is true
- [ ] ExportButton: Disabled when recordCount is 0
- [ ] ExportButton: Shows record count in label when provided

**Error Handling:**
- [ ] Share cancelled (AbortError): No error toast
- [ ] Share failed (other error): Falls back to download
- [ ] Network error: Shows error toast
- [ ] Large file (>50MB): Shows warning toast, uses download

### Potential Split Strategy

**If complexity proves HIGH, consider splitting:**

**Foundation (Primary Builder 1):**
- `exportHelpers.ts` (platform detection, download fallback)
- `ExportButton.tsx` (basic component without share API)

**Sub-builder 1A: Web Share Integration**
- Extend `exportFile()` to add Web Share API logic
- Test share sheet on real devices
- Implement file size check and warnings

**Recommendation:** Don't split unless real device testing reveals unexpected complexity. Web Share API integration is well-documented and straightforward.

---

## Builder-2: Transactions & Budgets Exports

### Scope

Add export functionality to the two most complex context pages:
- **Transactions page:** Filter-aware export (date range, category, account)
- **Budgets page:** Month-aware export (current month or all budgets)

These pages have existing filter UI that exports must respect.

### Complexity Estimate

**MEDIUM** (More complex than Builder-3 due to filter awareness)

**Rationale:** Transactions page has multiple filters (date range, category, account). Must ensure export uses same filter state as displayed data. Budgets page is simpler (month selector only).

### Success Criteria

- [ ] Transactions page has export section with FormatSelector + ExportButton
- [ ] Transactions export respects current filters (date range, category, account)
- [ ] Transactions export count preview accurate ("Export 247 transactions")
- [ ] Transactions export filename includes filter context (e.g., `wealth-transactions-groceries-2025-01-to-2025-11.csv`)
- [ ] Budgets page has export section with FormatSelector + ExportButton
- [ ] Budgets export works for all budgets (future: filter by month)
- [ ] Export buttons disabled when no data to export (recordCount === 0)
- [ ] Loading states show spinner during export
- [ ] Success toasts show record count
- [ ] Error handling works (network error, no data)

### Files to Create

**No New Files** - Only modifying existing pages

### Files to Modify

- `src/app/(dashboard)/transactions/page.tsx` - Add export section
- `src/app/(dashboard)/budgets/page.tsx` - Add export section

### Dependencies

**Depends on:** Builder-1 (needs ExportButton, FormatSelector, useExport hook)

**Blocks:** None (parallel with Builder-3)

### Implementation Notes

**Transactions Page:**
1. Import ExportButton, FormatSelector, useExport from Builder-1's files
2. Find existing filter state (likely `useState` for date range, category, account)
3. Pass filters to `useExport` hook's `getInput` function
4. Get transaction count from existing query (data?.transactions?.length)
5. Add export section BELOW filter UI, ABOVE transaction list
6. Ensure export uses ALL matching records, not just paginated results

**Budgets Page:**
1. Import export components from Builder-1
2. Find existing `selectedMonth` state
3. Pass month to export input (future enhancement: filter by month in backend)
4. Get budget count from existing query
5. Add export section below month selector

**Filter State Reuse:**
```typescript
// IMPORTANT: Export must use SAME filters as displayed data
const filters = {
  startDate: filterState.startDate,
  endDate: filterState.endDate,
  categoryId: filterState.categoryId,
  accountId: filterState.accountId,
}

// Use in both query AND export
const { data } = api.transactions.list.useQuery({ ...filters, limit: 1000 })

const exportHook = useExport({
  mutation: exportMutation,
  getInput: (format) => ({ format, ...filters }), // SAME filters
  dataType: 'transactions',
})
```

**Layout Pattern:**
```typescript
<div className="space-y-6">
  {/* Existing filter UI */}

  {/* Export Section (NEW) */}
  <div className="flex items-center gap-3 flex-wrap">
    <FormatSelector value={format} onChange={setFormat} />
    <ExportButton onClick={handleExport} loading={isLoading} recordCount={count} />
  </div>

  {/* Existing data list */}
</div>
```

### Patterns to Follow

**From `patterns.md`:**
- Context Page Export Integration Pattern (Pattern 1: Transactions, Pattern 2: Budgets)
- Export Hook Pattern (useExport hook with filter mapping)
- Error Handling Pattern (comprehensive try-catch with toast notifications)
- Responsive Design Pattern (mobile-first layout)

**Consistency:**
- Use SAME component structure on both pages
- Use SAME spacing (gap-3) and flex layout
- Use SAME error handling logic
- Use SAME toast messages

### Testing Requirements

**Functional Testing:**
- [ ] Transactions: Apply date filter → Export → Verify only filtered transactions exported
- [ ] Transactions: Apply category filter → Export → Verify only filtered category exported
- [ ] Transactions: Clear filters → Export → Verify all transactions exported
- [ ] Transactions: Export count matches displayed count
- [ ] Budgets: Export all budgets → Verify all budget data exported
- [ ] Both pages: Format selector changes format (CSV → JSON → Excel)
- [ ] Both pages: Export button disabled when no data (recordCount === 0)
- [ ] Both pages: Loading spinner shows during export
- [ ] Both pages: Success toast shows correct record count

**Cross-Browser Testing:**
- [ ] iOS Safari: Share sheet appears, file saves correctly
- [ ] Chrome Android: Share sheet appears, file saves correctly
- [ ] Desktop Chrome: Download works
- [ ] Desktop Firefox: Download works

**File Validation:**
- [ ] CSV: Open in Excel, verify UTF-8 characters display correctly
- [ ] JSON: Parse in editor, verify structure is correct
- [ ] Excel: Open in Excel/Sheets, verify data loads correctly

### Potential Split Strategy

**If complexity proves HIGH, consider splitting:**

**Foundation (Primary Builder 2):**
- Add export section to Transactions page (basic implementation)
- Test filter state integration

**Sub-builder 2A: Budgets Export**
- Add export section to Budgets page
- Test month-aware export

**Recommendation:** Don't split. Both pages follow same pattern, can be completed sequentially by one builder.

---

## Builder-3: Goals, Accounts, Recurring Exports

### Scope

Add export functionality to the three simpler context pages:
- **Goals page:** Export all goals with progress metrics
- **Accounts page:** Export all accounts with balances
- **Recurring page:** Export all recurring transaction templates

These pages have minimal or no filters, so exports are straightforward.

### Complexity Estimate

**LOW-MEDIUM** (Simple exports, no complex filters)

**Rationale:** Goals, Accounts, and Recurring pages have no filters (or simple active/all toggle). Export logic is straightforward: fetch all data, export all data.

### Success Criteria

- [ ] Goals page has export section with FormatSelector + ExportButton
- [ ] Goals export includes all goals with progress calculations (target amount, current amount, progress %)
- [ ] Accounts page has export section with FormatSelector + ExportButton
- [ ] Accounts export includes all accounts with balances and connection status
- [ ] Recurring page has export section with FormatSelector + ExportButton
- [ ] Recurring export includes all recurring transaction templates with human-readable frequency
- [ ] All export buttons show correct record counts
- [ ] All exports work in CSV, JSON, and Excel formats
- [ ] Loading states, success toasts, error handling consistent across all 3 pages

### Files to Create

**No New Files** - Only modifying existing pages

### Files to Modify

- `src/app/(dashboard)/goals/page.tsx` - Add export section
- `src/app/(dashboard)/accounts/page.tsx` - Add export section
- `src/app/(dashboard)/recurring/page.tsx` - Add export section

### Dependencies

**Depends on:** Builder-1 (needs ExportButton, FormatSelector, useExport hook)

**Blocks:** None (parallel with Builder-2)

### Implementation Notes

**Goals Page:**
1. Import export components from Builder-1
2. Get goal count from existing query (data?.length)
3. Add export section below page header or above goal list
4. Use `api.exports.exportGoals.useMutation()`

**Accounts Page:**
1. Import export components from Builder-1
2. Get account count from existing query
3. Add export section below page header or above account list
4. Use `api.exports.exportAccounts.useMutation()`

**Recurring Page:**
1. Import export components from Builder-1
2. Get recurring transaction count from existing query
3. Add export section below page header or above recurring list
4. Use `api.exports.exportRecurringTransactions.useMutation()`

**Implementation Pattern (Same for all 3 pages):**

```typescript
'use client'

import { api } from '@/utils/api'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector } from '@/components/exports/FormatSelector'
import { useExport } from '@/hooks/useExport'

export default function GoalsPage() {
  // Fetch all goals (existing query)
  const { data } = api.goals.list.useQuery()
  const goalCount = data?.length || 0

  // Export logic
  const exportMutation = api.exports.exportGoals.useMutation()
  const exportHook = useExport({
    mutation: exportMutation,
    getInput: (format) => ({ format }), // No filters, just format
    dataType: 'goals',
  })

  return (
    <div className="space-y-6">
      {/* Export Section (NEW) */}
      <div className="flex items-center gap-3 flex-wrap">
        <FormatSelector
          value={exportHook.format}
          onChange={exportHook.setFormat}
          disabled={exportHook.isLoading}
        />

        <ExportButton
          onClick={exportHook.handleExport}
          loading={exportHook.isLoading}
          recordCount={goalCount}
        >
          Export Goals
        </ExportButton>
      </div>

      {/* Existing goal list */}
    </div>
  )
}
```

**Copy this pattern for Accounts and Recurring pages, just change:**
- Query hook: `api.goals.list` → `api.accounts.list` → `api.recurringTransactions.list`
- Export mutation: `exportGoals` → `exportAccounts` → `exportRecurringTransactions`
- Button label: "Export Goals" → "Export Accounts" → "Export Recurring Transactions"
- Data type: `'goals'` → `'accounts'` → `'recurring'`

### Patterns to Follow

**From `patterns.md`:**
- Context Page Export Integration Pattern (Pattern 3: Simple Export)
- Export Hook Pattern (basic usage without filters)
- Responsive Design Pattern (mobile-first layout)

**Consistency:**
- Use IDENTICAL code structure across all 3 pages
- Use SAME spacing and layout as Builder-2 pages
- Use SAME error handling and toast messages

### Testing Requirements

**Functional Testing:**
- [ ] Goals: Export all goals → Verify all goal data exported
- [ ] Goals: Goal progress calculations correct in export (target, current, progress %)
- [ ] Accounts: Export all accounts → Verify all account data exported
- [ ] Accounts: Plaid access tokens redacted in export (security check)
- [ ] Recurring: Export all templates → Verify all recurring transactions exported
- [ ] Recurring: Frequency displayed in human-readable format (e.g., "Every 2 weeks on Monday")
- [ ] All pages: Format selector works (CSV/JSON/Excel)
- [ ] All pages: Export button disabled when no data
- [ ] All pages: Loading spinner shows during export
- [ ] All pages: Success toast shows correct record count

**Cross-Browser Testing:**
- [ ] iOS Safari: Share sheet works on all 3 pages
- [ ] Chrome Android: Share sheet works on all 3 pages
- [ ] Desktop: Download works on all 3 pages

**File Validation:**
- [ ] Goals CSV: Open in Excel, verify progress calculations visible
- [ ] Accounts CSV: Open in Excel, verify Plaid tokens NOT visible
- [ ] Recurring CSV: Open in Excel, verify frequency readable

### Potential Split Strategy

**If time is limited, prioritize:**

**Primary Builder 3:**
- Goals page export (most user-requested)
- Accounts page export (second priority)

**Sub-builder 3A (Optional):**
- Recurring page export (lower priority, fewer users)

**Recommendation:** Complete all 3 pages. They're simple and follow identical pattern.

---

## Builder-4: Testing, Polish & Cross-Device Validation

### Scope

Comprehensive testing and polish to ensure production-ready quality:
- Real device testing (iOS, Android, Desktop)
- Touch target audit (44px minimum on all interactive elements)
- Cross-browser compatibility testing
- Performance testing (large exports, network throttling)
- Error scenario testing (no data, network offline, share cancellation)
- Accessibility audit (keyboard navigation, screen reader support)
- Code quality review (TypeScript strict, no console errors)
- Documentation updates (add testing notes to files)

### Complexity Estimate

**LOW** (Testing and validation work, no new features)

**Rationale:** All functionality implemented by Builders 1-3. This builder validates quality, finds bugs, polishes UX.

### Success Criteria

- [ ] All 5 context pages tested on real iOS device (iPhone 12+, iOS 15+)
- [ ] All 5 context pages tested on real Android device (Chrome 89+)
- [ ] All 5 context pages tested on desktop browsers (Chrome, Firefox, Safari)
- [ ] Touch target audit complete (all buttons/dropdowns ≥44px on mobile)
- [ ] Export count preview accurate on all pages (shows total, not paginated)
- [ ] Filenames include filter context where applicable (Transactions: date range)
- [ ] Error handling graceful on all pages (no data, network error, share cancellation)
- [ ] Performance acceptable (1k records <2s, 5k records <5s)
- [ ] Accessibility audit complete (keyboard navigation, screen reader announcements)
- [ ] Code quality review complete (no TypeScript errors, no console warnings)
- [ ] All bugs found during testing are fixed or documented

### Files to Create

**No New Files** - Testing and validation only

### Files to Modify

**Only if bugs found:**
- Any file created by Builders 1-3 may need bug fixes
- Add JSDoc comments where missing
- Improve error messages if unclear

### Dependencies

**Depends on:** Builder-1, Builder-2, Builder-3 (all must complete before testing)

**Blocks:** None (final validation before deployment)

### Implementation Notes

**Testing Devices Required:**

**iOS:**
- iPhone 12 or later (iOS 15+)
- Test Web Share API with real share sheet
- Test Files app integration (save to Files)
- Test AirDrop sharing (share to nearby device)

**Android:**
- Android 10+ device with Chrome 89+
- Test Web Share API with real share sheet
- Test Downloads folder integration
- Test Google Drive sharing

**Desktop:**
- Chrome (latest version)
- Firefox (latest version)
- Safari (macOS, latest version)

**Testing Workflow:**

1. **Initial Smoke Test (30 min):**
   - Open each of 5 context pages
   - Click export button
   - Verify download or share works
   - Check for console errors

2. **Cross-Browser Testing (1 hour):**
   - Test all 5 pages on iOS Safari
   - Test all 5 pages on Chrome Android
   - Test all 5 pages on Desktop Chrome
   - Test all 5 pages on Desktop Firefox
   - Test all 5 pages on Desktop Safari

3. **Touch Target Audit (30 min):**
   - Chrome DevTools → Device Mode → iPhone 14 Pro
   - Inspect each button (right-click → Inspect)
   - Verify height ≥44px (check computed styles)
   - Check dropdown items (click dropdown, inspect items)

4. **Performance Testing (30 min):**
   - Create test account with 1000 transactions
   - Export transactions → Time the operation
   - Export transactions with 5000 records → Time the operation
   - Network throttling (Chrome DevTools → Slow 3G) → Test export

5. **Error Scenario Testing (30 min):**
   - No data: Clear all filters → Verify export button disabled
   - Network offline: Disconnect internet → Try export → Verify error toast
   - Share cancellation: Trigger share → Cancel → Verify no error toast
   - Large file: Export 10k+ records → Verify file size warning (if >50MB)

6. **Accessibility Audit (30 min):**
   - Keyboard navigation: Tab through export section → Verify focus visible
   - Enter key: Focus export button → Press Enter → Verify export triggers
   - Screen reader: Enable VoiceOver (iOS) or TalkBack (Android) → Test announcements

7. **File Validation (30 min):**
   - Export CSV → Open in Excel → Verify UTF-8 characters correct
   - Export JSON → Open in VSCode → Verify valid JSON (no parse errors)
   - Export Excel → Open in Excel/Sheets → Verify data loads correctly

**Bug Tracking:**

Create a checklist of found issues:
```markdown
## Bugs Found

### Critical (Blocking)
- [ ] Issue description, affected pages, steps to reproduce

### Medium (Should fix)
- [ ] Issue description, affected pages, steps to reproduce

### Low (Nice to have)
- [ ] Issue description, affected pages, steps to reproduce
```

**Code Quality Review Checklist:**

```typescript
/**
 * Code Quality Review Checklist
 *
 * [ ] All TypeScript files have no errors (run: npm run type-check)
 * [ ] All files use strict mode (no 'any' types)
 * [ ] All components have proper prop interfaces
 * [ ] All async functions have error handling (try-catch)
 * [ ] All user-facing strings are clear and helpful
 * [ ] All console.logs removed (except intentional debug logs)
 * [ ] All imports are used (no unused imports)
 * [ ] All components follow project naming conventions
 * [ ] All files have consistent formatting (run: npm run format)
 * [ ] All export buttons have aria-labels
 * [ ] All loading states have aria-busy attributes
 */
```

### Patterns to Follow

**From `patterns.md`:**
- Testing Pattern (manual test checklist)
- Performance Pattern (timing metrics)
- Accessibility Pattern (screen reader support)

### Testing Requirements

**This builder IS testing** - See Implementation Notes for comprehensive test plan.

**Deliverables:**
1. Testing report (bugs found, test results)
2. Performance metrics (export timing for different record counts)
3. Cross-browser compatibility matrix (passed/failed for each browser)
4. Accessibility audit results (WCAG AA compliance)

### Potential Split Strategy

**Not recommended to split** - Testing should be comprehensive and sequential. Splitting testing work creates gaps and inconsistencies.

---

## Builder Execution Order

### Phase 1: Foundation (Sequential)

**Builder-1 MUST complete before Builder-2 and Builder-3 start**

- Builder-1: 3-4 hours
- Creates: ExportButton, FormatSelector, useExport, exportHelpers

**Checkpoint:** Builder-1 commits and pushes foundation components. Builders 2-3 can pull and start.

### Phase 2: Context Pages (Parallel)

**Builder-2 and Builder-3 work in parallel (no file conflicts)**

- Builder-2: 2-3 hours (Transactions, Budgets)
- Builder-3: 2-3 hours (Goals, Accounts, Recurring)

**No Conflicts:** Builder-2 modifies `transactions/page.tsx` and `budgets/page.tsx`. Builder-3 modifies `goals/page.tsx`, `accounts/page.tsx`, `recurring/page.tsx`. Different files = no merge conflicts.

### Phase 3: Testing & Validation (Sequential)

**Builder-4 starts after Builder-2 and Builder-3 complete**

- Builder-4: 2-3 hours (real device testing, cross-browser validation)

**Checkpoint:** Builder-4 creates testing report, files bugs, validates all features.

### Phase 4: Bug Fixes (As Needed)

**Any builder can fix bugs in their own code**

- Builder-1: Fix foundation component bugs
- Builder-2: Fix Transactions/Budgets bugs
- Builder-3: Fix Goals/Accounts/Recurring bugs

**Time Buffer:** 1-2 hours for bug fixes based on Builder-4's findings

---

## Integration Notes

### How Builder Outputs Come Together

**Builder-1 Foundation:**
- Creates `src/lib/exportHelpers.ts` → Used by all other builders
- Creates `src/components/exports/*` → Used by all other builders
- Creates `src/hooks/useExport.ts` → Used by all other builders

**Builder-2 Context Pages A:**
- Modifies `transactions/page.tsx` → Imports from Builder-1
- Modifies `budgets/page.tsx` → Imports from Builder-1

**Builder-3 Context Pages B:**
- Modifies `goals/page.tsx` → Imports from Builder-1
- Modifies `accounts/page.tsx` → Imports from Builder-1
- Modifies `recurring/page.tsx` → Imports from Builder-1

**Builder-4 Testing:**
- Tests all pages → Files bugs for respective builders to fix

**Integration is Automatic:** No manual merge needed if builders follow task boundaries.

### Shared Files (Potential Conflicts)

**None** - All builders work on separate files.

**Only potential conflict:** If Builder-1 updates foundation components AFTER Builders 2-3 start, they'll need to pull latest changes.

**Mitigation:** Builder-1 completes foundation BEFORE Builder-2 and Builder-3 start.

### Success Metrics

**Code Quality:**
- 0 TypeScript errors
- 0 console warnings in production
- All files pass ESLint

**Functionality:**
- All 5 context pages have working exports
- All 3 formats work (CSV, JSON, Excel)
- Web Share API works on iOS and Android
- Download fallback works on desktop

**Performance:**
- Export <2s for 1k records
- Export <5s for 5k records
- Export <10s for 10k records

**Accessibility:**
- All buttons ≥44px touch target
- All interactive elements keyboard accessible
- All loading states announced to screen readers

**Cross-Browser:**
- iOS Safari 15+: ✅ Passed
- Chrome Android 89+: ✅ Passed
- Desktop Chrome: ✅ Passed
- Desktop Firefox: ✅ Passed
- Desktop Safari: ✅ Passed

---

## Final Checklist (Before Deployment)

**Code Quality:**
- [ ] All TypeScript strict mode (no `any` types)
- [ ] All imports used (no unused imports)
- [ ] All console.logs removed (except intentional)
- [ ] All files formatted (Prettier)

**Functionality:**
- [ ] All 5 pages have export buttons
- [ ] All exports work in all 3 formats (CSV, JSON, Excel)
- [ ] Transactions exports respect filters (date, category, account)
- [ ] Budgets exports respect month selection
- [ ] Export count preview accurate on all pages

**Mobile (iOS Safari):**
- [ ] Share sheet appears on export
- [ ] Files save to Files app correctly
- [ ] Share cancellation doesn't show error toast
- [ ] Touch targets ≥44px

**Mobile (Chrome Android):**
- [ ] Share sheet appears on export
- [ ] Files save to Downloads correctly
- [ ] Share cancellation doesn't show error toast
- [ ] Touch targets ≥44px

**Desktop:**
- [ ] Download works in Chrome
- [ ] Download works in Firefox
- [ ] Download works in Safari
- [ ] Download icon shown (not share icon)

**Error Handling:**
- [ ] No data: Export button disabled
- [ ] Network error: Error toast shown
- [ ] Share cancelled: No error toast shown
- [ ] Large file (>50MB): Warning toast shown

**Accessibility:**
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Screen reader announces loading states
- [ ] Color contrast meets WCAG AA
- [ ] All buttons have aria-labels

**Performance:**
- [ ] 1k records: <2s
- [ ] 5k records: <5s
- [ ] Network throttling: Graceful (shows loading)

---

**Total Estimated Effort:** 10-13 hours

**Breakdown:**
- Builder-1: 3-4 hours (foundation)
- Builder-2: 2-3 hours (Transactions, Budgets)
- Builder-3: 2-3 hours (Goals, Accounts, Recurring)
- Builder-4: 2-3 hours (testing, validation)
- Bug fixes: 1-2 hours (buffer)

**Ready for Execution:** ✅

**Recommended Start:** Builder-1 starts immediately. Builders 2-3 start after Builder-1 completes foundation.
