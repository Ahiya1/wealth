# Iteration 23: Credit Card Bill Resolution & Polish

## Scope Summary
Final polish iteration for the Wealth AI Financial Assistant. Three main objectives:
1. **Credit Card Bill Detection**: Detect CC bill payments during import to prevent double-counting
2. **Navigation Integration**: Add Chat to mobile bottom nav and desktop sidebar
3. **UI Polish**: Session title auto-generation, loading states, error handling improvements

## Dependencies
- Iteration 21 (Chat Foundation) - COMPLETED
- Iteration 22 (File Import) - COMPLETED

## Success Criteria
1. CC bill detection working with Hebrew/English payee patterns
2. Chat accessible from mobile bottom nav (4th position, Goals moved to overflow)
3. Chat accessible from desktop sidebar (2nd position after Dashboard)
4. Session titles auto-generate from first user message
5. File upload shows loading state during processing
6. All existing tests pass, no new TypeScript errors

## Implementation Approach
- Strategy 1 (Warn and Skip) for CC bills - simplest, no schema changes
- Simple extraction for session titles (not AI-generated) - free, fast
- Priority 1-3 items only (navigation + title + critical polish)

## Risk Mitigation
- CC detection is informational only (excluded by default, user sees warning)
- No Prisma schema changes required
- Uses existing tags infrastructure

## Estimated Effort
- 3 builders: CC Bill Detection, Navigation Integration, UI Polish
- Estimated: 6-8 hours total implementation
