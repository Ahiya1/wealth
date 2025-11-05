# Project Vision: Mobile Experience Polish

**Created:** 2025-11-05T00:00:00Z
**Plan:** plan-4

---

## Problem Statement

The Wealth application currently works great on mobile phones but lacks the polished, curated feel of an app designed specifically for mobile. Users encounter layout issues (boxes extending beyond screen boundaries), suboptimal touch targets, and a general sense that the experience was "made responsive" rather than "designed for mobile."

**Current pain points:**
- Content overflow: Some components (cards, tables, forms) extend beyond the viewport on mobile screens
- Inconsistent spacing: Desktop-centric padding/margins that feel either cramped or wasteful on mobile
- Touch targets: Some interactive elements are too small or too close together for comfortable thumb interaction
- Navigation: Hamburger menu works but could be more thumb-friendly with bottom navigation
- Layout adaptations: Components that could benefit from mobile-specific arrangements (vertical stacking, simplified views)
- Missing native-feeling interactions: Swipes, pull-to-refresh, haptic feedback patterns
- Safe area handling: Notches and rounded corners not consistently respected

---

## Target Users

**Primary user:** Mobile-first wealth tracker user
- Primarily uses phone for quick financial checks throughout the day
- Expects smooth, native-like interactions
- Values quick access to key actions (add transaction, check balance)
- Uses app in various contexts (one-handed while commuting, quick glance, detailed review)

**Secondary users:** Desktop users who occasionally use mobile
- Expects consistency but values mobile optimization

---

## Core Value Proposition

Transform the mobile experience from "responsive web app" to "feels like it was curated for my phone" through pixel-perfect layouts, touch-optimized interactions, and mobile-first design patterns.

**Key benefits:**
1. **Zero layout breaks** - Every component fits perfectly within viewport, no horizontal scrolling or cut-off content
2. **Thumb-zone optimization** - Critical actions positioned for one-handed thumb reach
3. **Native-feeling interactions** - Smooth animations, intuitive gestures, appropriate feedback
4. **Context-aware layouts** - Components that adapt intelligently to portrait/landscape and small/medium screens
5. **Performance excellence** - Fast loading, smooth scrolling, optimized for mobile networks

---

## Feature Breakdown

### Must-Have (MVP)

#### 1. **Layout & Overflow Fixes**
   - Description: Eliminate all instances of content extending beyond viewport
   - User story: As a mobile user, I want all content to fit within my screen so that I never need to scroll horizontally or miss information
   - Acceptance criteria:
     - [ ] Dashboard cards (Affirmation, FinancialHealthIndicator, DashboardStats, RecentTransactions, UpcomingBills) fit within viewport on 375px and up
     - [ ] Tables (transactions, budgets) use horizontal scrolling containers with proper boundaries
     - [ ] Forms and input fields are fully visible without overflow
     - [ ] Sidebar (DashboardSidebar) slides properly without content shifting
     - [ ] Analytics charts (Recharts components) scale appropriately
     - [ ] Dropdown menus (Radix UI) position intelligently to stay on screen
     - [ ] Settings pages with long lists work without horizontal scroll

#### 2. **Touch Target Optimization**
   - Description: Ensure all interactive elements meet minimum 44x44px touch target size and have adequate spacing
   - User story: As a mobile user, I want to tap buttons and links accurately so that I don't accidentally tap the wrong thing
   - Acceptance criteria:
     - [ ] All buttons, links, and interactive icons minimum 44x44px hit area
     - [ ] Minimum 8px spacing between adjacent touch targets
     - [ ] Navigation items in sidebar have comfortable tap zones
     - [ ] Card actions (edit, delete, etc.) have adequate spacing
     - [ ] Form inputs have sufficient height (min 48px)
     - [ ] Dropdown trigger areas are generously sized
     - [ ] Checkbox and radio inputs use larger custom designs

#### 3. **Bottom Navigation Bar**
   - Description: Add thumb-friendly bottom navigation for key sections
   - User story: As a mobile user, I want quick access to main sections at the bottom of my screen so that I can navigate with my thumb
   - Acceptance criteria:
     - [ ] Fixed bottom navigation bar with 5 key sections: Dashboard, Transactions, Budgets, Goals, More
     - [ ] Active state indication with color + icon fill
     - [ ] Smooth transition between sections
     - [ ] Respects safe area (iPhone bottom bar, Android gesture bar)
     - [ ] Hide on scroll down, show on scroll up (for content visibility)
     - [ ] Hamburger sidebar still available for full menu + account dropdown
     - [ ] "More" tab opens sheet with remaining navigation options

#### 4. **Mobile-Optimized Dashboard Layout**
   - Description: Redesign dashboard component layout for mobile portrait mode
   - User story: As a mobile user, I want the dashboard to present information in an easy-to-scan vertical layout optimized for my screen
   - Acceptance criteria:
     - [ ] AffirmationCard: Full-width, appropriate height (not too tall)
     - [ ] Greeting: Compact, single line where possible
     - [ ] FinancialHealthIndicator: Mobile-specific layout (vertical meter or horizontal progress bar)
     - [ ] UpcomingBills: Card with scrollable list or collapsed with "View all"
     - [ ] RecentTransactions: Show 3-5 transactions, "View all" link
     - [ ] DashboardStats: 2-column grid on mobile (instead of 4-column)
     - [ ] Consistent card padding: 16px mobile, 24px desktop
     - [ ] Smooth page transitions with PageTransition component

#### 5. **Responsive Tables & Data Grids**
   - Description: Transform tables into mobile-friendly card layouts
   - User story: As a mobile user, I want to view transaction lists and data tables in a format that fits my screen and is easy to scan
   - Acceptance criteria:
     - [ ] Transactions page: Card-based layout on mobile (category icon, amount, date stacked)
     - [ ] Budget page: Expandable category cards with progress bars
     - [ ] Goals page: Vertical card layout with visual progress indicators
     - [ ] Analytics page: Charts sized for mobile, scrollable if needed
     - [ ] Accounts page: Card layout with tap to expand details
     - [ ] Admin tables: Horizontal scroll container with minimum column widths
     - [ ] Sticky headers for scrollable lists

#### 6. **Form & Input Optimization**
   - Description: Optimize all forms for mobile input
   - User story: As a mobile user, I want to fill out forms easily with my phone keyboard and have a smooth input experience
   - Acceptance criteria:
     - [ ] Input fields: min-height 48px, comfortable padding
     - [ ] Number inputs: Show numeric keyboard on mobile
     - [ ] Date pickers: Use native mobile date picker or optimized calendar
     - [ ] Dropdowns: Full-screen bottom sheet on mobile vs inline dropdown
     - [ ] Multi-step forms: Progress indicator at top
     - [ ] Form validation: Clear, non-blocking error messages
     - [ ] Submit buttons: Fixed at bottom or in view during input

#### 7. **Safe Area Handling**
   - Description: Properly handle iPhone notches, Android cutouts, and gesture bars
   - User story: As a mobile user with a modern phone, I want the app to respect my device's screen boundaries
   - Acceptance criteria:
     - [ ] Use env(safe-area-inset-*) CSS variables
     - [ ] Bottom navigation respects bottom safe area
     - [ ] Fixed headers respect top safe area (status bar, notch)
     - [ ] Sidebar overlay doesn't interfere with safe areas
     - [ ] Fullscreen modals/sheets respect all safe areas
     - [ ] Test on iPhone 14/15 (Dynamic Island), iPhone SE, Android with gesture nav

#### 8. **Performance Optimization for Mobile**
   - Description: Ensure smooth performance on mobile devices and networks
   - User story: As a mobile user, I want the app to load quickly and scroll smoothly even on slower connections
   - Acceptance criteria:
     - [ ] Lazy load dashboard components below fold
     - [ ] Optimize images: use next/image with appropriate sizes
     - [ ] Reduce initial bundle size for mobile (code splitting)
     - [ ] Smooth 60fps scrolling (check with Chrome DevTools)
     - [ ] Loading states for all async data fetching
     - [ ] Skeleton screens for dashboard cards
     - [ ] Optimize Recharts: use smaller dataset for mobile
     - [ ] PWA-ready: service worker for offline support (future enhancement)

---

### Should-Have (Post-MVP)

1. **Pull-to-refresh** - Native gesture to refresh dashboard data
2. **Swipe actions** - Swipe on transaction cards to reveal edit/delete/categorize
3. **Quick add FAB** - Floating action button for adding transactions from any screen
4. **Haptic feedback** - Subtle vibration feedback on key actions (using Vibration API)
5. **Gesture navigation** - Swipe between tabs on dashboard/pages
6. **Dark mode refinements** - Ensure dark mode is optimized for OLED screens
7. **Landscape optimization** - Better use of horizontal space in landscape mode
8. **Bottom sheets** - Replace modals with bottom sheets for mobile (filter, sort, actions)
9. **Sticky summary cards** - Keep key metrics visible when scrolling
10. **Voice input** - Voice-to-text for transaction descriptions

---

### Could-Have (Future)

1. **Native app** - React Native or Capacitor for true native experience
2. **Widget support** - Home screen widgets for quick balance check
3. **Shortcuts** - iOS Shortcuts / Android App Shortcuts integration
4. **Biometric quick actions** - Face ID/Touch ID for quick transaction logging
5. **Watch app** - Companion Apple Watch/Wear OS app
6. **Offline mode** - Full offline capability with sync
7. **Share sheet integration** - Share transactions via native share
8. **Camera integration** - Scan receipts with camera

---

## User Flows

### Flow 1: Dashboard Quick Check (Primary Mobile Flow)

**Steps:**
1. User opens app (bookmark or PWA)
2. Splash screen / Loading state (skeleton)
3. Dashboard loads with affirmation card first (prioritized)
4. User scrolls down to view health indicator, bills, transactions
5. Bottom nav visible for quick access to other sections
6. User taps "Transactions" in bottom nav
7. Transaction list loads (card layout, not table)

**Edge cases:**
- Slow network: Show skeleton screens, progressive loading
- Large dataset: Virtualized list for transactions
- Offline: Show cached data with "offline" indicator

**Error handling:**
- Network error: Retry button with friendly message
- Auth expired: Redirect to signin without losing context

### Flow 2: Add Transaction on Mobile

**Steps:**
1. User taps FAB (floating action button) or "Add" in bottom nav "More" sheet
2. Full-screen form opens with bottom sheet animation
3. Form fields optimized: large touch targets, mobile keyboards
4. Category picker: bottom sheet with large, visual category icons
5. Amount input: numeric keyboard, proper decimal handling
6. Date picker: native mobile date picker
7. Submit button fixed at bottom
8. Success toast, return to previous screen with new transaction visible

**Edge cases:**
- Form validation: Inline errors above keyboard
- Network failure: Save as draft, retry when online
- Quick add: Simplified form with defaults for fast entry

**Error handling:**
- Invalid amount: Clear error message with suggestion
- Missing required field: Highlight field with error text
- Server error: Save locally, background retry

### Flow 3: One-Handed Navigation

**Steps:**
1. User holds phone in one hand, thumb at bottom
2. Taps bottom nav to switch sections (thumb zone)
3. Scrolls with thumb (smooth, no lag)
4. Taps large card actions (positioned in thumb reach)
5. Uses hamburger menu for secondary actions (top left, two-handed reach accepted)

**Edge cases:**
- Right-handed vs left-handed: Bottom nav centered works for both
- Small hands: Bottom nav items sized appropriately
- Landscape: Bottom nav adapts or relocates

### Flow 4: Data Review on Mobile (Analytics/Budgets)

**Steps:**
1. User navigates to Analytics
2. Charts load with mobile-optimized dimensions
3. User can zoom/pan charts with pinch/drag
4. Tap chart elements to see details
5. Filters accessible via bottom sheet (not sidebar)
6. Export/share options in menu

**Edge cases:**
- Complex charts: Simplify for mobile, show simplified view with "View full" option
- Large data range: Date range picker optimized for mobile
- Portrait vs landscape: Charts adapt layout

---

## Data Model Overview

**No new entities required** - this is purely a UI/UX enhancement.

**Existing entities remain unchanged:**
- User, Account, Transaction, Budget, Goal, Category, RecurringTransaction

**Potential new fields for tracking (optional):**
- User.preferences.mobileLayout: "bottom-nav" | "sidebar-only"
- User.preferences.enableHaptics: boolean
- User.preferences.enableGestures: boolean

---

## Technical Requirements

**Must support:**
- iOS Safari (iOS 15+)
- Chrome Mobile (Android 10+)
- Various screen sizes: 320px to 430px width (mobile), 768px+ (tablet/desktop)
- Touch events (tap, long-press, swipe)
- Safe area insets (notches, rounded corners)
- Mobile keyboards (numeric, email, text)
- Portrait and landscape orientations

**Constraints:**
- Maintain existing Next.js 14 app structure
- Use existing Tailwind CSS + Radix UI components
- Maintain dark mode support
- Keep existing functionality intact (no breaking changes)
- Progressive enhancement approach (works without JS)

**Preferences:**
- Mobile-first CSS approach (write mobile styles first, desktop overrides)
- Use Tailwind responsive breakpoints: sm:640px, md:768px, lg:1024px, xl:1280px
- Framer Motion for smooth animations (already in use)
- Consider Radix UI's mobile-optimized components (Sheet, Drawer)
- Use CSS custom properties for consistent spacing
- Implement design tokens for mobile-specific values

**Technical approach:**
- Audit all components with mobile viewport (375px, 390px, 414px)
- Create mobile-specific variants of complex components
- Use container queries where beneficial
- Implement virtual scrolling for long lists (react-window or similar)
- Optimize bundle size: dynamic imports for heavy components
- Add performance monitoring (Web Vitals)

---

## Success Criteria

**The mobile polish is successful when:**

1. **Zero Layout Issues**
   - Metric: Manual testing across 10 key screens at 375px, 390px, 414px viewports
   - Target: 0 horizontal scrollbars, 0 content cut-offs

2. **Touch Target Compliance**
   - Metric: Automated accessibility audit + manual testing
   - Target: 100% of interactive elements meet WCAG 2.1 minimum size (44x44px)

3. **Performance Metrics**
   - Metric: Lighthouse mobile score
   - Target: Performance 90+, Accessibility 100, Best Practices 100

4. **Smooth Interactions**
   - Metric: Chrome DevTools performance profiling
   - Target: 60fps during scrolling and animations, no jank

5. **User Feedback**
   - Metric: Subjective testing by developer/users
   - Target: "Feels like a native app" feedback from 3+ users

6. **Load Time**
   - Metric: First Contentful Paint (FCP), Largest Contentful Paint (LCP)
   - Target: FCP < 1.8s, LCP < 2.5s on 3G

---

## Out of Scope

**Explicitly not included in MVP:**
- Native iOS/Android app development
- Offline-first architecture (basic caching only)
- Advanced gestures (pinch-to-zoom on custom elements beyond charts)
- Haptic feedback (moved to post-MVP)
- Voice input/Siri shortcuts
- Widget development
- Camera/receipt scanning
- Biometric authentication for quick actions

**Why:** Focus on perfecting the web app mobile experience first. Native features and advanced interactions can be layered on once the foundation is solid.

---

## Assumptions

1. Users primarily use phones in portrait mode (vertical)
2. Most users have phones with 375px-414px width screens (iPhone 12-15 range)
3. Current desktop experience should remain unchanged
4. Existing component library (Radix UI) has sufficient mobile support
5. Performance bottlenecks are primarily layout-related, not data-related
6. Users are familiar with bottom navigation pattern from other apps
7. Existing animations (Framer Motion) don't cause performance issues

---

## Open Questions

1. Should we hide bottom nav when keyboard is open (more space for form) or keep it visible?
2. Do we want PWA installation prompt for mobile users?
3. Should landscape mode have a different layout (side-by-side) or just wider mobile layout?
4. Analytics page: simplify charts for mobile or keep full complexity with better scaling?
5. Admin pages: mobile-optimize or encourage desktop use?
6. Should we implement virtual scrolling for transaction lists now or wait for performance issues?
7. Do we want to add a mobile-specific onboarding tour?

---

## Implementation Priority

**Phase 1: Foundation (Week 1)**
- Audit all screens for overflow issues
- Fix layout bugs (Dashboard, Transactions, Budgets most critical)
- Update spacing system with mobile-first values
- Implement safe area handling

**Phase 2: Navigation (Week 2)**
- Build bottom navigation component
- Integrate with existing routing
- Test navigation flows
- Refine mobile sidebar interaction

**Phase 3: Components (Week 3)**
- Optimize touch targets across all components
- Transform tables to mobile card layouts
- Enhance forms for mobile input
- Optimize charts and visualizations

**Phase 4: Polish (Week 4)**
- Performance optimization
- Animation refinement
- Loading states and skeleton screens
- Cross-device testing and fixes

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning

---

## Technical Notes

**Key files to modify:**
- `src/app/(dashboard)/layout.tsx` - Add bottom navigation
- `src/components/dashboard/DashboardSidebar.tsx` - Mobile improvements
- `src/app/(dashboard)/dashboard/page.tsx` - Layout optimization
- `src/components/dashboard/*` - Individual dashboard components
- `src/app/(dashboard)/transactions/page.tsx` - Card-based mobile layout
- `src/app/(dashboard)/budgets/page.tsx` - Mobile budget cards
- `src/app/(dashboard)/goals/page.tsx` - Mobile goal cards
- `tailwind.config.js` - Add mobile-first design tokens
- `src/styles/globals.css` - Safe area CSS variables

**New components to create:**
- `src/components/mobile/BottomNavigation.tsx`
- `src/components/mobile/MobileCard.tsx` (reusable mobile card wrapper)
- `src/components/mobile/MobileSheet.tsx` (bottom sheet for filters/actions)
- `src/components/ui/safe-area.tsx` (safe area wrapper)

**Testing checklist:**
- [ ] iPhone SE (375x667) - Smallest common iPhone
- [ ] iPhone 12/13/14 (390x844) - Most common
- [ ] iPhone 14 Pro Max (430x932) - Largest iPhone
- [ ] Android mid-range (360x740) - Common Android
- [ ] iPad Mini (768x1024) - Tablet breakpoint
- [ ] Test in both portrait and landscape
- [ ] Test with and without Dynamic Island
- [ ] Test with Android gesture navigation
- [ ] Test dark mode on all devices
