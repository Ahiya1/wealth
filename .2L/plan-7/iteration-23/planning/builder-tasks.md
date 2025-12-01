# Builder Tasks - Iteration 23

## Builder 1: CC Bill Detection Service

### Scope
Create credit card bill detection service and integrate with file parsing.

### Files to Create
1. `src/lib/services/cc-bill-detection.service.ts`
   - `CC_PAYEE_PATTERNS` - Array of regex patterns for CC companies
   - `isCreditCardBill(tx)` - Check single transaction
   - `detectCreditCardBills(transactions)` - Batch detection, returns `{ ccBills, regular }`

### Files to Modify
1. `src/server/services/chat-tools.service.ts`
   - Import cc-bill-detection service
   - In `parse_file` tool handler, call `detectCreditCardBills()`
   - Return `creditCardBills` and `warning` in result

### Tests
1. `src/lib/services/__tests__/cc-bill-detection.test.ts`
   - Test English patterns (VISA CAL, ISRACARD, etc.)
   - Test Hebrew patterns (ויזה כאל, ישראכרט, etc.)
   - Test amount threshold (>500 detected, <500 not detected)
   - Test mixed batch detection

### Success Criteria
- All CC pattern tests pass
- parse_file returns creditCardBills array
- Warning message included when CC bills detected

---

## Builder 2: Navigation Integration

### Scope
Add Chat to mobile bottom navigation and desktop sidebar.

### Files to Modify

1. `src/lib/mobile-navigation.ts`
   - Import `MessageCircle` from lucide-react
   - Add Chat item to `primaryNavItems` at position 4:
     ```typescript
     { name: 'Chat', href: '/chat', icon: MessageCircle }
     ```
   - Move Goals to `overflowNavItems` at position 1

2. `src/components/dashboard/DashboardSidebar.tsx`
   - Import `MessageCircle` from lucide-react
   - Insert Chat item after Dashboard in navigationItems array:
     ```typescript
     { name: 'Chat', href: '/chat', icon: MessageCircle }
     ```

### Tests
- Manual testing: Verify Chat appears in mobile bottom nav
- Manual testing: Verify Chat appears in desktop sidebar
- Manual testing: Verify Goals moved to overflow sheet
- Manual testing: Verify navigation works correctly

### Success Criteria
- Chat visible in mobile bottom nav (4th position)
- Chat visible in desktop sidebar (2nd position)
- Goals accessible from More sheet
- Active state highlighting works for /chat route

---

## Builder 3: UI Polish & Session Titles

### Scope
Session title auto-generation, loading states, error handling improvements.

### Files to Modify

1. `src/app/api/chat/stream/route.ts`
   - After saving assistant message (around line 234)
   - Query message count for session
   - If 2 messages, generate title from first user message
   - Update session title in database

2. `src/components/chat/FileUploadZone.tsx`
   - Add `isProcessing` state
   - Show loading indicator during file processing
   - Disable drag-drop while processing

3. `src/components/chat/ChatInput.tsx`
   - Add dismiss button (X) to error banner
   - Auto-clear error on new message send

4. `src/components/chat/ChatPageClient.tsx`
   - Add `onError` handler to createSession mutation
   - Show toast notification on failure

5. `src/components/chat/TransactionPreview.tsx`
   - Add `creditCardBills` prop
   - Render excluded CC bills section with warning
   - Show expandable details for excluded transactions

### Success Criteria
- Session title updates after first message exchange
- File upload shows spinner during processing
- Error messages dismissible with X button
- Session creation failure shows toast
- CC bills shown in preview with explanation
