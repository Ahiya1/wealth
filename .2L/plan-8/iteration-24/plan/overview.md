# 2L Iteration Plan - UI Audit & Dark Mode Fix

## Project Vision

Fix critical dark mode contrast issues across dashboard components and add an AI Assistant feature section to the landing page to properly showcase the app's most powerful capability.

**Problem Being Solved:**
- Text using `text-muted-foreground` is nearly invisible in dark mode (3.5:1 contrast, below WCAG AA 4.5:1 requirement)
- Landing page fails to mention the AI financial assistant - the app's key differentiator
- Dashboard components have inconsistent dark mode implementations

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] All page titles visible in dark mode
- [ ] All section headers readable in dark mode
- [ ] All muted text has sufficient contrast (WCAG AA: 4.5:1 ratio minimum)
- [ ] AI Assistant feature prominently displayed as first feature on landing page
- [ ] No light mode regression
- [ ] TypeScript compilation passes
- [ ] Production build succeeds

## MVP Scope

**In Scope:**
- Update `--muted-foreground` CSS variable in dark mode (globals.css)
- Add `dark:text-warm-gray-400` overrides to 5 dashboard components
- Verify chat components (already have proper dark mode patterns)
- Add AI Assistant feature card as first item in landing page features grid

**Out of Scope (Post-MVP):**
- Complete landing page redesign
- New color palette or design system changes
- Animation improvements
- Performance optimization
- Additional landing page sections (testimonials, feature comparison)

## Development Phases

1. **Exploration** - COMPLETE
2. **Planning** - CURRENT
3. **Building** - Estimated 30-45 minutes (3 parallel builders)
4. **Integration** - Estimated 5 minutes
5. **Validation** - Estimated 10 minutes
6. **Deployment** - Final

## Timeline Estimate

- Exploration: Complete
- Planning: Complete
- Building: ~30 minutes (parallel builders)
- Integration: ~5 minutes
- Validation: ~10 minutes
- **Total: ~45 minutes**

## Risk Assessment

### Low Risks
- **Light mode regression:** Mitigated by global fix only affecting dark mode CSS section
- **Missed instances:** Mitigated by explicit per-component overrides as safety net

### Medium Risks
- **Grid layout shift:** Adding 5th card to 4-column grid may affect visual balance. Mitigated by grid's natural wrap behavior.

## Integration Strategy

Builders work on isolated files with no overlapping concerns:
- Builder-1: globals.css + 5 dashboard components
- Builder-2: 2 chat components (verification only)
- Builder-3: landing page (page.tsx)

No merge conflicts expected. Integration consists of verifying all changes work together visually.

## Deployment Plan

1. Run `npm run build` to verify TypeScript and build pass
2. Visual verification in both light and dark modes
3. Standard deployment process (already configured via CI/CD)

## Verification Steps

1. Open dashboard in browser
2. Toggle dark mode
3. Verify each component:
   - Net Worth card subtitle and icon visible
   - Top Categories labels and empty state visible
   - Financial Health sync status visible
   - Recent Transactions icon visible
   - Budget Alerts "all on track" message visible
4. Open landing page
5. Verify AI Assistant is first feature card
6. Toggle dark mode on landing page
7. Verify all feature cards readable in both themes
