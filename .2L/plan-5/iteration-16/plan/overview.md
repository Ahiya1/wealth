# 2L Iteration Plan - Wealth Export System (Iteration 16)

## Project Vision

Complete the export system by adding filter-aware export buttons to all 5 context pages (Transactions, Budgets, Goals, Accounts, Recurring) with mobile-optimized UX via Web Share API integration and touch-friendly design.

**Strategic Context:** This is Iteration 3 of the export system vision (plan-5). Iterations 1-2 built the complete backend infrastructure (CSV/Excel/JSON generators, tRPC endpoints, Export Center UI). Iteration 3 brings exports to users' natural workflows - the pages where they view their data.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Export buttons functional on all 5 context pages (Transactions, Budgets, Goals, Accounts, Recurring)
- [ ] Exports respect current page filters (date range for Transactions, month for Budgets, active vs all for Goals)
- [ ] Export count preview accurate before export ("Export 247 transactions")
- [ ] Filenames include filter context (e.g., `wealth-transactions-groceries-2025-01-to-2025-11.csv`)
- [ ] Mobile Web Share API integration working on iOS Safari 12.1+ and Chrome Android 89+
- [ ] Desktop download flow working in Chrome, Firefox, Safari, Edge
- [ ] All export UI elements meet 44px minimum touch target on mobile
- [ ] Format selector (CSV/JSON/Excel) working with 44px dropdown items
- [ ] Performance acceptable: <5s for standard exports, no UI freezing
- [ ] Error handling graceful with clear user feedback (no data, network errors, share cancellation)
- [ ] Cross-device testing validates exports on iOS, Android, and desktop browsers

## MVP Scope

**In Scope:**

- Web Share API integration with feature detection and download fallback
- Platform detection utility (iOS/Android/Desktop)
- Export helper utilities (decodeExportContent, exportFile, downloadFile)
- ExportButton component with platform-aware icons (Share icon on mobile, Download icon on desktop)
- FormatSelector component (CSV/JSON/Excel dropdown with 44px touch targets)
- Export sections on 5 context pages:
  - Transactions page: Filter-aware export (date range, category, account)
  - Budgets page: Month-aware export (current month or all budgets)
  - Goals page: Status-aware export (active goals or all goals)
  - Accounts page: Export all accounts with balances
  - Recurring page: Export all recurring transaction templates
- Export count preview before export
- Touch-friendly UI (44px minimum buttons, 44px dropdown items)
- Loading states during export generation
- Success/error toast notifications
- Share sheet on mobile (iOS/Android native share experience)
- Standard download on desktop/unsupported browsers

**Out of Scope (Post-MVP):**

- Export history tracking for context exports (only complete exports tracked in Iteration 2)
- Background export jobs for large datasets (streaming sufficient for MVP)
- Scheduled exports (automatic monthly exports)
- Custom export templates (user-defined fields)
- Multi-sheet Excel workbooks (current: single sheet per data type)
- QFX/OFX export formats
- Encrypted exports (password-protected ZIPs)
- Export presets (saved filter configurations)
- Copy-to-clipboard option (defer to post-MVP)

## Development Phases

1. **Exploration** ✅ Complete (Explorer 1: Architecture, Explorer 2: Technology)
2. **Planning** 🔄 Current (This plan)
3. **Building** ⏳ Estimated: 8-10 hours (3-4 builders, parallel execution)
4. **Integration** ⏳ Estimated: 30 minutes (minimal conflicts, shared components)
5. **Validation** ⏳ Estimated: 2-3 hours (cross-device testing critical)
6. **Deployment** ⏳ Final deployment to production

## Timeline Estimate

- **Exploration:** Complete (2 explorer reports)
- **Planning:** Complete (This comprehensive plan)
- **Building:** 8-10 hours
  - Builder 1 (Foundation): 3-4 hours
  - Builder 2 (Context Pages A): 2-3 hours
  - Builder 3 (Context Pages B): 2-3 hours
  - Builder 4 (Testing & Polish): 1-2 hours
- **Integration:** 30 minutes (shared components, minimal conflicts)
- **Validation:** 2-3 hours (real device testing on iOS/Android/Desktop)
- **Total:** ~12-15 hours (realistic estimate including testing)

**Note:** Aggressive estimate from master plan was 6-8 hours. We're planning for 8-10 hours build + 2-3 hours validation = 10-13 hours total to account for cross-device testing complexity.

## Risk Assessment

### High Risks

**None** - Iteration 16 builds on proven infrastructure from Iterations 14-15. All backend endpoints functional, no new dependencies, Web Share API has graceful fallback.

### Medium Risks

**1. Web Share API Browser Compatibility Edge Cases**
- **Risk:** Share fails on specific iOS/Android versions despite feature detection
- **Impact:** Users see error, but fallback to download works
- **Mitigation:** Test on real devices (iPhone 12+ iOS 15+, Android 10+ Chrome 89+), catch all share errors and fallback gracefully
- **Contingency:** If widespread issues, disable share API and use download-only approach

**2. Touch Target Regression on Existing Pages**
- **Risk:** Adding export sections breaks existing mobile layout
- **Impact:** Users struggle to tap buttons, poor mobile UX
- **Mitigation:** Use existing Button component (44px mobile height), audit all 5 pages with Chrome DevTools mobile emulation
- **Contingency:** Adjust spacing/layout if conflicts arise

**3. Filter State Complexity on Transactions Page**
- **Risk:** Managing multiple filters (date, category, account) becomes error-prone
- **Impact:** Export might not respect all filters, user confusion
- **Mitigation:** Single source of truth for filter state, reuse filters in both query and export
- **Contingency:** Create useTransactionFilters hook if state management becomes unwieldy

### Low Risks

**4. Large Export Performance (10k+ transactions)**
- **Risk:** Export generation takes >10 seconds, users think app froze
- **Impact:** Poor perceived performance
- **Mitigation:** Show loading state with spinner, test with large datasets
- **Contingency:** Add progress bar if >5s generation time detected in testing

**5. Share Cancellation UX**
- **Risk:** Users cancel share sheet, expect error message
- **Impact:** Silent failure confuses users
- **Mitigation:** Catch AbortError specifically, don't show error toast for cancellation
- **Contingency:** Add subtle informational toast if user feedback indicates confusion

## Integration Strategy

**Parallel Builder Approach:**

Builders work on separate concerns with minimal file conflicts:

- **Builder 1:** Foundation components (ExportButton, FormatSelector, exportHelpers)
- **Builder 2:** Transactions & Budgets pages (more complex, filter-aware)
- **Builder 3:** Goals, Accounts, Recurring pages (simpler, less/no filters)
- **Builder 4:** Testing, polish, cross-device validation

**Shared Component Strategy:**

All builders use shared components created by Builder 1:
- `src/components/exports/ExportButton.tsx` - Platform-aware export button
- `src/components/exports/FormatSelector.tsx` - CSV/JSON/Excel dropdown
- `src/lib/exportHelpers.ts` - Web Share API integration, platform detection

**File Conflict Prevention:**

Each builder modifies different page files:
- Builder 2: `transactions/page.tsx`, `budgets/page.tsx`
- Builder 3: `goals/page.tsx`, `accounts/page.tsx`, `recurring/page.tsx`

**Integration Points:**

1. All builders import from `src/components/exports/*` (created by Builder 1)
2. All builders call same tRPC endpoints (already exist from Iteration 1-2)
3. All builders use same export flow: Select format → Click export → Share or download

**Integration Validation:**

After builders complete, integrator will:
1. Verify consistent UX across all 5 pages (same button style, same format selector)
2. Test export flow on each page (check filters respected)
3. Audit touch targets (44px minimum on all pages)
4. Cross-browser test (iOS Safari, Chrome Android, Desktop Chrome/Firefox/Safari)

## Deployment Plan

**Pre-Deployment Checklist:**

- [ ] All 5 context pages have functional export buttons
- [ ] Web Share API tested on real iOS device (iPhone 12+, iOS 15+)
- [ ] Web Share API tested on real Android device (Chrome 89+)
- [ ] Desktop download tested in Chrome, Firefox, Safari, Edge
- [ ] Touch targets audited (Chrome DevTools mobile emulation)
- [ ] Export count preview accurate on all pages
- [ ] Filenames include filter context (manual verification)
- [ ] Error handling tested (no data, network error, share cancellation)
- [ ] Loading states tested (large exports 1000+ records)
- [ ] Format selector works (CSV/JSON/Excel on all pages)

**Deployment Strategy:**

1. **Staging Deployment:** Deploy to Vercel preview branch
2. **Mobile Testing:** Test on real iOS and Android devices (staging URL)
3. **Cross-Browser Testing:** Test desktop browsers against staging
4. **Production Deployment:** Merge to main, deploy to production
5. **Post-Deployment Monitoring:** Watch for export errors in logs (first 24 hours)

**Rollback Plan:**

If critical issues arise post-deployment:
- Export buttons can be hidden via feature flag (add `NEXT_PUBLIC_ENABLE_CONTEXT_EXPORTS=false`)
- Users can still export from Export Center (Iteration 2 infrastructure)
- Fix issues, redeploy with flag enabled

**Success Metrics (Post-Launch):**

- 30% of active users export data within first week
- <2% of users report export issues
- Mobile export completion rate >80% of desktop rate
- Average export time <5 seconds (P95 <10 seconds)

## Technical Architecture

**Component Hierarchy:**

```
Context Page (e.g., TransactionsPage)
├── Filter UI (date range, category, account)
├── Data List (TransactionList with infinite scroll)
└── Export Section
    ├── FormatSelector (CSV/JSON/Excel dropdown)
    └── ExportButton (Share icon mobile, Download icon desktop)
```

**Data Flow:**

```
1. User applies filters → Filter state updated (useState)
2. TransactionList queries with filters → Display filtered data
3. User selects format → Format state updated (localStorage + useState)
4. User clicks Export → handleExport() triggered
5. tRPC mutation called with format + filters
6. Server queries Prisma, generates export, returns base64
7. Client decodes base64 → Blob
8. Mobile: Web Share API → Share sheet OR Download fallback
9. Desktop: Standard download → Browser download manager
10. Success toast with record count
```

**Technology Stack:**

- Web Share API (native browser feature, no dependencies)
- File API (native browser feature)
- tRPC (existing, Iteration 1-2)
- React hooks (useState, useMemo, useEffect)
- Lucide icons (Download, Share2, ShareIcon, FileText, FileJson, FileSpreadsheet)
- Sonner (toast notifications)

**Browser Compatibility:**

- iOS Safari 12.1+: Web Share API supported (98% of active iOS devices)
- Chrome Android 89+: Web Share API supported (95% of active Android devices)
- Desktop: Download fallback (Chrome, Firefox, Safari, Edge)
- Graceful degradation: All browsers get download functionality

## Quality Standards

**Code Quality:**

- All components TypeScript strict mode
- No `any` types (use proper type definitions)
- Props interfaces for all components
- JSDoc comments for utility functions
- Consistent naming (PascalCase components, camelCase functions)

**Performance Standards:**

- Export generation: <5s for 1000 transactions
- Export generation: <10s for 5000 transactions
- UI responsiveness: No blocking operations on main thread
- Bundle size: <5KB additional JavaScript (Web Share API is native)

**Accessibility Standards:**

- Touch targets: 44px minimum (WCAG AA)
- Keyboard navigation: Tab through format selector and export button
- Screen reader: Announce export count, loading state, success/error
- Color contrast: Export buttons meet WCAG AA (4.5:1)

**Testing Standards:**

- Manual testing on real devices (iOS, Android, Desktop)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Touch target audit (Chrome DevTools mobile emulation)
- Export validation (open CSV in Excel, JSON in editor, XLSX in Sheets)
- Error scenario testing (no data, network error, share cancellation)

## Known Issues & Constraints

**From Exploration:**

- Export count might show paginated results instead of total (need separate count query)
- Infinite scroll pagination could confuse users (export gets ALL matching records, not just loaded)
- Share sheet file size limits vary by platform (iOS: ~100MB, Android: ~50MB)
- Firefox has no Web Share API support (download fallback works fine)

**Constraints:**

- Export limit: 10,000 records per export (prevent memory overflow)
- File size: 50MB recommended maximum for share sheet compatibility
- Touch targets: 44px minimum required (WCAG AA)
- Browser support: iOS 12.1+, Android Chrome 89+, modern desktop browsers

**Mitigation Strategies:**

- Show total count in export button label ("Export ALL 500 transactions")
- Check file size before share attempt, fallback to download if >50MB
- Use existing Button component (44px mobile height by default)
- Feature detection for Web Share API, graceful fallback to download

## Next Steps

After plan approval:

1. **Builder 1:** Create foundation (ExportButton, FormatSelector, exportHelpers) - 3-4 hours
2. **Builder 2:** Implement Transactions & Budgets exports - 2-3 hours
3. **Builder 3:** Implement Goals, Accounts, Recurring exports - 2-3 hours
4. **Builder 4:** Testing, polish, cross-device validation - 1-2 hours
5. **Integration:** Merge builder work, resolve conflicts - 30 minutes
6. **Validation:** Real device testing, final QA - 2-3 hours
7. **Deployment:** Staging → Production with monitoring

---

**Iteration Status:** PLANNED ✅

**Ready for Execution:** YES

**Estimated Completion:** 10-13 hours (realistic with testing)

---
