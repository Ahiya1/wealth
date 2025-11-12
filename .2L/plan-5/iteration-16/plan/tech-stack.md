# Technology Stack - Iteration 16

## Core Framework

**Decision:** Next.js 14 (App Router) with React 18 + TypeScript

**Rationale:**
- Already established in Iterations 1-15 (no changes needed)
- Server Components reduce client bundle size
- File-based routing simplifies page structure
- Built-in performance optimizations (image optimization, code splitting)

**Alternatives Considered:**
- N/A - Framework already established, iteration builds on existing infrastructure

## Export Infrastructure (Existing - Iterations 14-15)

**Backend Utilities:**
- `src/lib/csvExport.ts` - CSV generators for all 6 data types (UTF-8 BOM, quote escaping)
- `src/lib/xlsxExport.ts` - Excel workbook generators (uses xlsx library)
- `src/lib/jsonExport.ts` - JSON export with pretty-printing
- `src/lib/archiveExport.ts` - ZIP package creator (uses archiver library)
- `src/lib/aiContextGenerator.ts` - AI metadata generator
- `src/lib/readmeGenerator.ts` - README template generator

**tRPC Endpoints:**
- `src/server/api/routers/exports.router.ts` - All export procedures
  - `exportTransactions` - Supports date range filters
  - `exportBudgets` - All budgets
  - `exportGoals` - All goals
  - `exportAccounts` - All accounts with sanitized Plaid data
  - `exportRecurringTransactions` - Recurring templates
  - `exportCategories` - Category hierarchy
  - `exportComplete` - Complete ZIP package

**Status:** ✅ Fully functional from Iterations 14-15, no changes needed

## Web Share API (Native Browser Feature)

**Decision:** Native Web Share API with graceful fallback to standard download

**Rationale:**
- **Zero dependencies:** No npm packages required, no bundle size increase
- **77% browser support:** iOS Safari 12.1+, Chrome Android 89+, Edge 95+
- **Native OS integration:** Uses iOS share sheet, Android share sheet (best UX)
- **Graceful degradation:** Fallback to download works on all browsers
- **98% mobile coverage:** iOS 12.1+ and Android Chrome 89+ cover nearly all active mobile devices

**Browser Compatibility:**

| Platform | Version | Share API Support | Fallback Strategy |
|----------|---------|-------------------|-------------------|
| iOS Safari | 12.1+ | ✅ Full support | N/A |
| iOS Safari | <12.1 | ❌ No support | Standard download |
| Chrome Android | 89+ | ✅ Full support | N/A |
| Chrome Android | <89 | ❌ No support | Standard download |
| Firefox (all) | All | ❌ No support | Standard download |
| Desktop Chrome | 89+ (Win/ChromeOS) | ⚠️ Limited support | Standard download |
| Desktop Safari | 12.1+ | ⚠️ Limited support | Standard download |
| Desktop Edge | 95+ | ⚠️ Limited support | Standard download |

**Implementation Strategy:**

```typescript
// Feature detection
if (navigator.share && navigator.canShare({ files: [file] })) {
  // Attempt Web Share API
  try {
    await navigator.share({
      files: [file],
      title: 'Wealth Export',
      text: `Financial data export: ${filename}`
    })
  } catch (error) {
    // User cancelled or share failed
    // Fall through to download
    if (error.name !== 'AbortError') {
      downloadFile(blob, filename)
    }
  }
} else {
  // No share support, use download
  downloadFile(blob, filename)
}
```

**API Documentation:** https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share

**Alternatives Considered:**
- **Third-party libraries (web-share-polyfill):** Not needed, native fallback is cleaner
- **Clipboard API for copy:** Out of scope for MVP, defer to post-MVP
- **Custom share modal:** Worse UX than native share sheet, unnecessary complexity

## File API (Native Browser Feature)

**Decision:** Native File API to create File objects from Blobs

**Rationale:**
- **Zero dependencies:** No npm packages required
- **Universal support:** All modern browsers (100% of target browsers)
- **Required for Web Share API:** Share API requires File objects, not Blobs
- **Simple API:** Single constructor call

**Implementation:**

```typescript
const blob = new Blob([content], { type: mimeType })
const file = new File([blob], filename, { type: mimeType })
```

**API Documentation:** https://developer.mozilla.org/en-US/docs/Web/API/File

## Platform Detection

**Decision:** User agent parsing + navigator.share feature detection

**Rationale:**
- **No dependencies:** Use native navigator.userAgent string
- **Platform-specific UX:** Show correct icon (iOS share icon, Android share icon, download icon)
- **Feature detection:** Check navigator.share availability at runtime
- **Simple logic:** iOS vs Android vs Desktop detection with regex

**Implementation:**

```typescript
function getPlatformInfo() {
  const ua = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)
  const isMobile = isIOS || isAndroid || window.matchMedia('(max-width: 768px)').matches
  const hasShareAPI = typeof navigator.share === 'function'

  return {
    isIOS,
    isAndroid,
    isMobile,
    hasShareAPI,
    canShare: hasShareAPI && typeof navigator.canShare === 'function',
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
  }
}
```

**Alternatives Considered:**
- **Platform detection libraries (platform.js, bowser):** Overkill for simple iOS/Android/Desktop detection
- **CSS media queries only:** Can't detect share API availability
- **Server-side detection (user-agent header):** Client-side needed for Web Share API

## UI Component Library

**Decision:** Radix UI primitives + Custom components + Tailwind CSS

**Rationale:**
- Already established in project (Iterations 1-15)
- Radix UI DropdownMenu for format selector (accessible, keyboard navigation)
- Custom Button component with touch-friendly sizing (44px mobile, 40px desktop)
- Tailwind utilities for responsive design

**Key Components (Existing):**
- `@radix-ui/react-dropdown-menu` - Format selector dropdown ✅
- `src/components/ui/button.tsx` - Button with loading state, 44px mobile sizing ✅
- `src/components/ui/progress.tsx` - Progress bar for large exports ✅

**New Components (Iteration 16):**
- `src/components/exports/ExportButton.tsx` - Platform-aware export button
- `src/components/exports/FormatSelector.tsx` - CSV/JSON/Excel dropdown

**Touch Target Standards:**

All interactive elements meet WCAG AA minimum (44px):
- Export buttons: `size="default"` = 44px mobile (h-11 class)
- Format selector: 44px button height
- Dropdown items: `min-h-[44px]` class
- Large actions: `size="lg"` = 48px mobile (h-12 class)

**Implementation Notes:**

Existing Button component already implements touch-friendly sizing:
```typescript
size: {
  default: "h-11 px-4 py-2 sm:h-10",    // 44px mobile, 40px desktop
  sm: "h-10 rounded-lg px-3 sm:h-9",    // 40px mobile, 36px desktop
  lg: "h-12 rounded-lg px-8 sm:h-11",   // 48px mobile, 44px desktop
  icon: "h-11 w-11 sm:h-10 sm:w-10",    // 44x44 mobile, 40x40 desktop
}
```

## Icons

**Decision:** Lucide React icons

**Rationale:**
- Already used throughout project (consistency)
- Tree-shakeable (only imported icons bundled)
- MIT licensed, no attribution required
- Comprehensive icon set (Download, Share2, ShareIcon, FileText, FileJson, FileSpreadsheet)

**Icons Used:**
- `Download` - Desktop download icon
- `Share2` - Android share icon
- `ShareIcon` - iOS share icon (matches iOS system icon)
- `FileText` - CSV format icon
- `FileJson` - JSON format icon
- `FileSpreadsheet` - Excel format icon
- `Loader2` - Loading spinner (already in Button component)
- `ChevronDown` - Format selector dropdown indicator

**Package:** `lucide-react` (already installed) ✅

## State Management

**Decision:** React hooks (useState, useMemo, useEffect) + localStorage for format persistence

**Rationale:**
- **No global state needed:** Export UI is page-scoped (transactions export only affects Transactions page)
- **Simple state:** Format selection (CSV/JSON/Excel), loading state, error state
- **Format persistence:** Save user's format preference to localStorage (remembers between sessions)
- **Filter state:** Already managed by page components, reuse for exports

**Implementation Pattern:**

```typescript
// Format selection with localStorage persistence
const [format, setFormat] = useState<ExportFormat>(() => {
  const saved = localStorage.getItem('exportFormat')
  return (saved as ExportFormat) || 'CSV'
})

useEffect(() => {
  localStorage.setItem('exportFormat', format)
}, [format])

// Platform detection (memoized)
const platform = useMemo(() => getPlatformInfo(), [])

// Export mutation
const exportMutation = trpc.exports.exportTransactions.useMutation()
```

**Alternatives Considered:**
- **Zustand/Redux:** Overkill for page-scoped state
- **Context API:** Not needed, no cross-component state sharing
- **Server state only (no localStorage):** User preference would reset on page reload

## Toast Notifications

**Decision:** Sonner (already installed)

**Rationale:**
- Already used for all notifications in project (consistency)
- Excellent mobile support (bottom positioning, swipe to dismiss)
- TypeScript support
- Customizable (success, error, info toasts)

**Implementation:**

```typescript
import { toast } from 'sonner'

// Success
toast.success('Export successful', {
  description: `${recordCount} records exported`
})

// Error
toast.error('Export failed', {
  description: error.message
})

// Info (large file warning)
toast.info('Large export', {
  description: 'File is too large to share, downloading instead'
})
```

**Package:** `sonner` (already installed) ✅

## Date Handling

**Decision:** date-fns (already installed)

**Rationale:**
- Already used throughout project for date formatting
- Tree-shakeable (only imported functions bundled)
- Excellent TypeScript support
- Comprehensive date utilities

**Functions Used:**
- `format(date, 'yyyy-MM-dd')` - Filename date formatting
- `startOfMonth(date)` - Default date range start
- `endOfMonth(date)` - Default date range end

**Package:** `date-fns` (already installed) ✅

## Development Tools

### Type Safety

**TypeScript Strict Mode:** Enabled ✅
- No `any` types (use proper interfaces)
- Strict null checks
- No implicit returns

**Type Definitions:**

```typescript
// Export formats
type ExportFormat = 'CSV' | 'JSON' | 'EXCEL'

// Platform info
interface PlatformInfo {
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  hasShareAPI: boolean
  canShare: boolean
  platform: 'ios' | 'android' | 'desktop'
}

// Export result (from tRPC)
interface ExportResult {
  content: string      // base64-encoded
  filename: string
  mimeType: string
  recordCount: number
  fileSize: number
}
```

### Code Quality

**ESLint:** Already configured ✅
- React hooks rules
- Next.js recommended rules
- TypeScript ESLint rules

**Prettier:** Already configured ✅
- Consistent formatting
- Import sorting

**No New Configuration Needed**

### Build & Deploy

**Build Tool:** Next.js built-in (Turbopack in dev, webpack in production) ✅

**Deployment Target:** Vercel ✅
- Automatic deployments from main branch
- Preview deployments for PRs
- Edge runtime for API routes

**Environment Variables:** None required for Web Share API (client-side only)

**CI/CD:** GitHub Actions (already configured) ✅

## Dependencies Summary

### New Dependencies

**ZERO** - All functionality uses native browser APIs or existing dependencies 🎉

### Existing Dependencies (Leverage)

| Package | Version | Usage | Status |
|---------|---------|-------|--------|
| `next` | 14.x | Framework | ✅ Installed |
| `react` | 18.x | UI library | ✅ Installed |
| `@trpc/client` | Latest | Export mutations | ✅ Installed |
| `@trpc/server` | Latest | Backend endpoints | ✅ Installed |
| `zod` | Latest | Input validation | ✅ Installed |
| `@radix-ui/react-dropdown-menu` | Latest | Format selector | ✅ Installed |
| `lucide-react` | Latest | Icons | ✅ Installed |
| `sonner` | Latest | Toast notifications | ✅ Installed |
| `date-fns` | Latest | Date formatting | ✅ Installed |
| `tailwindcss` | Latest | Styling | ✅ Installed |

### Bundle Size Impact

**Estimated Additional Bundle Size:** ~3-5KB (gzipped)

Breakdown:
- ExportButton component: ~1KB
- FormatSelector component: ~1KB
- exportHelpers utility: ~2KB (platform detection, share/download logic)
- No new dependencies: 0KB

**Note:** Web Share API and File API are native browser features (no bundle size).

## Performance Targets

### Export Generation

- **1,000 transactions:** <2 seconds
- **5,000 transactions:** <5 seconds
- **10,000 transactions:** <10 seconds (show progress indicator)
- **Complete ZIP:** <15 seconds (show progress indicator)

**Rationale:** Backend export generation (Iterations 14-15) already meets these targets. Client-side decode + share/download adds <100ms.

### UI Responsiveness

- **First Contentful Paint:** <1.5s (Next.js optimization)
- **Export button click → Loading state:** <50ms (instant feedback)
- **Share sheet appearance:** <200ms (native OS control)
- **Download trigger:** <100ms (browser download manager)

### Network Performance

- **Export request:** Uses existing tRPC connection (already optimized)
- **Base64 decode:** Runs on main thread, ~50ms for 5MB file (acceptable)
- **Blob creation:** Instant (<10ms)

**Optimization:** If base64 decode becomes bottleneck (>100ms), move to Web Worker (post-MVP).

## Security Considerations

### Export Data Security

**Already Handled (Iterations 14-15):**
- All exports require authentication (tRPC protectedProcedure)
- User can only export their own data (userId filter in Prisma queries)
- Plaid access tokens redacted in account exports
- Sensitive fields sanitized before export

**Iteration 16 Additions:**
- Web Share API: Files shared via OS-level share sheet (same security as Save/Download)
- No new security risks (share API doesn't upload data anywhere, just triggers OS UI)

### Client-Side Data Handling

**Base64 Decoding:**
- Runs in browser memory (no persistence)
- Blob objects garbage collected after download/share
- Object URLs revoked after use (`URL.revokeObjectURL(url)`)

**LocalStorage (Format Preference):**
- Only stores user's format choice (CSV/JSON/EXCEL)
- No sensitive data in localStorage
- Cleared on logout (existing auth flow)

### Content Security Policy

**No Changes Needed:**
- Web Share API doesn't require CSP exceptions
- File API doesn't require CSP exceptions
- Blob URLs allowed by default Next.js CSP

## Accessibility Standards

### Touch Targets (WCAG AA)

**Minimum Size:** 44x44 pixels on mobile

**Implementation:**
- Export buttons: Use `size="default"` (44px mobile height) ✅
- Format selector button: 44px height ✅
- Dropdown items: `min-h-[44px]` class ✅
- Large actions: Use `size="lg"` (48px mobile height) ✅

**Verification:** Chrome DevTools mobile emulation + real device testing

### Keyboard Navigation

**All Interactive Elements:**
- Tab order: Format selector → Export button
- Enter/Space: Activate buttons and dropdown items
- Arrow keys: Navigate dropdown items
- Escape: Close dropdown

**Implementation:** Radix UI DropdownMenu handles keyboard navigation ✅

### Screen Reader Support

**Announcements:**
- Export button: "Export transactions, button" (aria-label)
- Loading state: "Exporting transactions, button, busy" (aria-busy)
- Success: Toast notification read by screen reader
- Error: Toast notification read by screen reader
- Export count: "Export 247 transactions" (read as part of button label)

**Implementation:** Button component and Sonner toasts already accessible ✅

### Color Contrast (WCAG AA)

**Minimum Ratio:** 4.5:1 for normal text, 3:1 for large text

**Export UI Colors:**
- Export button text: Uses theme text color (already meets contrast ratio) ✅
- Format selector: Uses theme text color ✅
- Toast notifications: Sonner default styles meet WCAG AA ✅

**Verification:** Chrome DevTools Lighthouse accessibility audit

## Browser Compatibility Matrix

| Feature | iOS Safari 12.1+ | Chrome Android 89+ | Desktop Chrome | Desktop Firefox | Desktop Safari |
|---------|------------------|---------------------|----------------|-----------------|----------------|
| Web Share API | ✅ Full | ✅ Full | ⚠️ Limited | ❌ No | ⚠️ Limited |
| File API | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Blob API | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Download Fallback | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Touch Targets | ✅ 44px | ✅ 44px | N/A | N/A | N/A |
| Format Selector | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

**Legend:**
- ✅ Full support
- ⚠️ Limited support (works but not ideal)
- ❌ No support (graceful fallback)

**Testing Strategy:**
1. Primary: iOS Safari 15+ (98% of target users)
2. Primary: Chrome Android 89+ (95% of target users)
3. Secondary: Desktop browsers (fallback validation)

## Configuration Files

### No New Configuration Required

**Existing Configuration (Already Set Up):**
- `tsconfig.json` - TypeScript strict mode ✅
- `tailwind.config.ts` - Touch target utilities ✅
- `next.config.mjs` - Next.js optimization ✅
- `package.json` - All dependencies installed ✅

**No Changes Needed for Iteration 16** 🎉

## Testing Infrastructure

### Manual Testing (Required)

**Real Devices:**
- iPhone 12+ (iOS 15+): Web Share API testing
- Android 10+ (Chrome 89+): Web Share API testing
- Desktop: Download fallback testing

**Chrome DevTools:**
- Mobile emulation (iPhone 14 Pro, Pixel 7): Touch target audit
- Network throttling (Slow 3G): Performance testing

**Cross-Browser:**
- Chrome: Primary browser
- Firefox: Fallback testing
- Safari: macOS testing
- Edge: Windows testing

### Test Scenarios

1. **Web Share API (Mobile)**
   - Trigger share → Select "Save to Files" → Verify file saved
   - Trigger share → Cancel → Verify no error toast
   - Large file (>50MB) → Verify fallback to download

2. **Download Fallback (Desktop)**
   - Click export → Verify download starts
   - Open file in Excel/Sheets/Editor → Verify content

3. **Filter-Aware Exports**
   - Apply filters → Export → Verify filtered data only

4. **Touch Targets**
   - Audit all buttons with mobile emulation → Verify ≥44px

5. **Performance**
   - 1k records: <2s
   - 5k records: <5s
   - 10k records: <10s with progress

### Automated Testing (Optional for MVP)

**Unit Tests:**
- `exportHelpers.test.ts` - Platform detection, decode logic
- `ExportButton.test.tsx` - Component rendering, platform icons

**Note:** Manual testing on real devices is more valuable for Web Share API (native OS component, difficult to mock).

## Summary

**Key Technology Decisions:**

✅ **Web Share API** - Native browser feature, zero dependencies, graceful fallback
✅ **File API** - Native browser feature, required for Web Share
✅ **Platform Detection** - User agent parsing, no dependencies
✅ **Touch-Friendly UI** - Existing Button component (44px mobile sizing)
✅ **Format Persistence** - localStorage for user preference
✅ **Zero New Dependencies** - All functionality uses native APIs or existing packages

**Why This Stack:**
- Minimal complexity (no new dependencies)
- Maximum compatibility (graceful fallback on all browsers)
- Native UX (iOS/Android share sheets)
- Performance optimized (no bundle size increase)
- Already proven infrastructure (Iterations 14-15 export backend)

**Ready for Implementation** ✅
