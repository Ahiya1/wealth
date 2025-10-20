# Known Issues (P2/P3) - Deferred to Future Iterations

**Status:** No P2/P3 errors discovered yet
**Reason:** P0 error (middleware hang) blocked comprehensive testing

---

## Notes

This file will be populated with P2 (Medium) and P3 (Low) priority errors once:
1. Builder-3 fixes P0/P1 errors (middleware, OAuth, seed script)
2. Comprehensive browser-based testing is completed
3. All 11+ pages are tested with Chrome DevTools
4. All 4 user flows are tested end-to-end

---

## Expected P2/P3 Error Categories

Based on typical Next.js + tRPC applications, we may discover:

### Medium Priority (P2) - Minor Features

**Potential Issues:**
- React hydration warnings (date/time rendering)
- Missing error boundaries on some components
- tRPC serialization warnings (Decimal, Date types)
- UI component styling inconsistencies
- Missing loading states
- Incomplete error messages

**Impact:** Minor UX issues, non-blocking warnings

**Estimated Count:** 2-5 issues

---

### Low Priority (P3) - Polish & Warnings

**Potential Issues:**
- Console warnings from dependencies
- Unused imports
- Missing alt text on images
- Accessibility warnings (aria labels, contrast)
- Performance optimization opportunities
- Bundle size optimizations

**Impact:** Development warnings, polish items, future optimizations

**Estimated Count:** 3-8 issues

---

## Tracking Process

When P2/P3 errors are discovered, document them here using this template:

### Issue P2.1: [Short Description]

**Priority:** P2
**Category:** [React/UI/tRPC/Performance]
**Impact:** [What doesn't work or warning shown]
**Page:** [Where it occurs]
**Reproduction:**
1. Step 1
2. Step 2

**Workaround:** [If applicable]
**Estimated Fix:** [X minutes]
**Suggested Iteration:** Iteration 3/4

---

## Future Iteration Planning

### Iteration 3 Focus (Suggested)
- Fix all P2 (Medium) errors
- Add automated testing (Playwright)
- Performance optimization
- Accessibility improvements

### Iteration 4+ Focus (Suggested)
- Fix P3 (Low) errors
- UI polish and refinements
- Bundle size optimization
- Production deployment preparation

---

**Last Updated:** 2025-10-02
**Discovered Issues:** 0
**Status:** Awaiting comprehensive testing after P0/P1 fixes
