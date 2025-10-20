# Project Vision: Wealth - Conscious Money Relationship UX Transformation

**Created:** 2025-10-02T22:35:00Z
**Plan:** plan-1

---

## Problem Statement

The Wealth app currently works well functionally but lacks the **"you arrived home" feeling** that embodies a conscious relationship with money. Users should feel welcomed, supported, and at peace—not confronted with clinical financial data. Additionally, critical infrastructure gaps exist: no admin user roles, no currency switching capability, and confusing settings organization that doesn't support future monetization.

**Current pain points:**
- Opening the app feels functional but not emotionally supportive—data hits you before you can breathe
- No user tier system (admin roles, subscription tiers) to support growth and monetization
- Settings navigation is confusing (`/settings` → categories instead of overview)
- No dedicated space to manage account/membership (future billing, profile, preferences)
- **Currency is hardcoded to USD—impossible to switch currency system-wide**
- UX lacks warmth and gentleness expected from "mindful money management" positioning
- User ahiya.butman@gmail.com has no admin access despite being the owner

---

## Target Users

**Primary user:** Individual seeking a conscious, peaceful relationship with their finances
- Values awareness over optimization
- Wants clarity and intentionality, not obsessive tracking
- Seeks emotional support alongside financial data
- Appreciates calm, gentle design over aggressive gamification

**Secondary users (future):** International users requiring different currencies, admins managing the platform

---

## Core Value Proposition

Wealth is the **Marie Kondo of finance apps**—creating clarity, intentionality, and peace with money through gentle guidance and non-judgmental support.

**Key benefits:**
1. **Emotional safety first** - Feel welcomed and supported before seeing numbers
2. **Conscious awareness** - Understand your money patterns without anxiety
3. **Intentional simplicity** - Every feature reduces anxiety or increases awareness

**Positioning:**
- Mint = "See everything"
- YNAB = "Control everything"
- **Wealth = "Understand everything (so you can let go)"**

---

## Feature Breakdown

### Must-Have (MVP)

#### 1. **Currency Switching System**
   - **Description:** Allow users to change their currency system-wide with automatic conversion of all financial data
   - **User story:** As an international user, I want to switch from USD to EUR so that I can see all my finances in my preferred currency
   - **Acceptance criteria:**
     - [ ] New Settings → Currency & Localization page
     - [ ] Currency selector with major currencies (USD, EUR, GBP, CAD, AUD, JPY, etc.)
     - [ ] Confirmation dialog warning about conversion
     - [ ] Backend conversion job that converts:
       - [ ] All transaction amounts
       - [ ] All account balances
       - [ ] All budget amounts
       - [ ] All goal amounts
     - [ ] Exchange rate integration (use historical rates for past transactions)
     - [ ] `ExchangeRate` database table to cache rates
     - [ ] Success confirmation with summary
     - [ ] All currency displays update throughout app immediately

#### 2. **User Role & Tier System**
   - **Description:** Add role-based access control (USER/ADMIN) and subscription tier structure (FREE/PREMIUM) to prepare for growth
   - **User story:** As the platform owner, I want admin access so that I can manage users and view system metrics
   - **Acceptance criteria:**
     - [ ] Add `role` enum to User model (USER, ADMIN)
     - [ ] Add `subscriptionTier` enum to User model (FREE, PREMIUM)
     - [ ] Migration script to set ahiya.butman@gmail.com as ADMIN
     - [ ] Middleware to check admin access on protected routes
     - [ ] Admin navigation item (only visible to admins)
     - [ ] Basic admin dashboard at `/admin` with system-wide metrics:
       - [ ] Total users
       - [ ] Total transactions
       - [ ] Active users (last 30 days)
     - [ ] User list page at `/admin/users` with:
       - [ ] Email, role, subscription tier, created date
       - [ ] Search/filter functionality
     - [ ] Display subscription tier badge in Account settings (even if always FREE for now)

#### 3. **Settings & Account Restructure**
   - **Description:** Split Settings (system preferences) from Account (personal/membership management) for clarity
   - **User story:** As a user, I want clear separation between system settings and my account management so that I can easily find what I need
   - **Acceptance criteria:**
     - [ ] **Settings** section (system preferences):
       - [ ] `/settings` - Overview page with all subsections
       - [ ] `/settings/categories` - Category management (existing)
       - [ ] `/settings/currency` - Currency & Localization (new)
       - [ ] `/settings/appearance` - Theme and display preferences
       - [ ] `/settings/data` - Export, privacy, danger zone
     - [ ] **Account** section (personal management):
       - [ ] `/account` - Account overview
       - [ ] `/account/profile` - Name, email, avatar
       - [ ] `/account/membership` - Subscription tier, billing placeholder
       - [ ] `/account/security` - Password change, sessions
       - [ ] `/account/preferences` - Timezone, notification preferences
     - [ ] Update sidebar: Settings link goes to `/settings` (not `/settings/categories`)
     - [ ] Add avatar dropdown in top-right with Account menu
     - [ ] Breadcrumb navigation on all settings/account pages

#### 4. **Dashboard UX Transformation**
   - **Description:** Reorder and redesign dashboard to lead with emotional support, then show financial reality
   - **User story:** As a user, I want to feel welcomed and supported when I open the app so that checking my finances feels peaceful, not stressful
   - **Acceptance criteria:**
     - [ ] **New hierarchy:**
       1. Affirmation card (larger, more prominent, centered)
       2. Personalized greeting below affirmation
       3. Financial health indicator (one big card: "You're on track" or "Review needed" with gentle visual)
       4. Recent activity (transactions)
       5. Stats cards (moved lower, optional detail)
     - [ ] Affirmation card redesign:
       - [ ] Larger text (at least 1.5x current size)
       - [ ] Center-aligned
       - [ ] Softer background (paper texture or gradient)
       - [ ] Daily rotation of affirmations
       - [ ] Optional: Add monthly intention prompt
     - [ ] Financial health indicator:
       - [ ] Single progress circle or gentle gauge (not red/green)
       - [ ] Supportive language ("Looking good", "Needs attention", never "Failed" or "Overspent")
       - [ ] Shows overall budget status for current month
     - [ ] Smooth fade-in animation on page load (breath before data)

#### 5. **Visual Warmth & Polish**
   - **Description:** Soften the entire UI to match "mindful money management" positioning
   - **User story:** As a user, I want the app to feel warm and gentle so that managing money reduces my anxiety instead of increasing it
   - **Acceptance criteria:**
     - [ ] **Rounded corners everywhere** (consistent border-radius on all cards, buttons, inputs)
     - [ ] **Softer shadows** (replace hard borders with gentle box-shadows)
     - [ ] **Typography refinement:**
       - [ ] Use serif font for headings (warmth)
       - [ ] Reduce size of large numbers (less aggressive)
       - [ ] Increase line-height for readability
     - [ ] **Color expansion:**
       - [ ] Keep sage green (primary) and warm gray (neutral)
       - [ ] Add soft terracotta/clay for positive actions
       - [ ] Add dusty blue for analytical sections
       - [ ] Mute gold accent (less bright)
     - [ ] **Micro-interactions:**
       - [ ] Gentle hover states (scale 1.02, not color flash)
       - [ ] Smooth transitions everywhere (200-300ms ease-in-out)
       - [ ] Loading states as gentle pulse/fade (not spinners)
     - [ ] **PageTransition component** used consistently on all routes
     - [ ] Optional: Subtle paper texture on card backgrounds

### Should-Have (Post-MVP)

1. **Admin User Management** - Impersonate users, manually adjust subscriptions, view user activity logs
2. **Enhanced Affirmation System** - User can save favorite affirmations, add custom intentions, weekly reflections
3. **Mindful Mode** - Hide all numbers, show only trends and emotional check-ins
4. **Currency Auto-Detection** - Detect user's location and suggest currency on signup
5. **Multi-currency Support** - Track accounts in different currencies simultaneously

### Could-Have (Future)

1. **Billing Integration** - Stripe subscription management, upgrade/downgrade flows
2. **Mobile App** - Native iOS/Android apps
3. **Household/Family Accounts** - Multi-user support with shared finances
4. **Localization/i18n** - Full translation support
5. **Financial Coaching** - AI-powered insights and guidance

---

## User Flows

### Flow 1: Currency Switching

**Steps:**
1. User navigates to Settings → Currency & Localization
2. Sees current currency (USD) with "Change Currency" button
3. Clicks button, opens currency selector dialog
4. Selects new currency (e.g., EUR)
5. System shows confirmation: "This will convert all transactions, accounts, budgets, and goals to EUR using historical exchange rates. Continue?"
6. User confirms
7. System runs conversion job (shows progress indicator)
8. Success message: "Everything converted to EUR ✓"
9. User sees all amounts now in EUR throughout app

**Edge cases:**
- **Conversion in progress, user navigates away**: Show persistent notification "Currency conversion in progress..."
- **Exchange rate API fails**: Use fallback rates (daily backup), warn user if rates are stale
- **User switches back to original currency**: Re-convert using stored original amounts (if within 30 days) or fresh conversion

**Error handling:**
- **API timeout**: "Unable to fetch exchange rates. Please try again in a few minutes."
- **Conversion failure**: Roll back transaction, show error, no data corrupted

### Flow 2: Admin User Management

**Steps:**
1. Admin (ahiya.butman@gmail.com) logs in
2. Sees "Admin" navigation item in sidebar
3. Clicks, navigates to `/admin`
4. Sees dashboard with system metrics (total users, transactions, activity)
5. Clicks "User Management"
6. Sees list of all users with email, role, tier, created date
7. Can search by email
8. Future: Can click user to impersonate or adjust subscription

**Edge cases:**
- **Non-admin tries to access `/admin`**: Redirect to `/dashboard` with toast "Unauthorized"
- **Admin impersonates user**: Top banner shows "Viewing as [email]" with exit button

**Error handling:**
- **User list query fails**: Show error state with retry button

### Flow 3: Settings vs Account Navigation

**Steps:**
1. User clicks "Settings" in sidebar → goes to `/settings` overview
2. Sees sections: Categories, Currency, Appearance, Data & Privacy
3. Clicks "Categories" → navigates to `/settings/categories`
4. User clicks avatar dropdown in top-right → sees "My Account" menu item
5. Clicks "My Account" → navigates to `/account`
6. Sees sections: Profile, Membership, Security, Preferences
7. Clicks "Membership" → sees current tier (FREE), upgrade CTA (disabled for now), billing placeholder

**Edge cases:**
- **Direct navigation to old settings routes**: Redirect `/settings/account` → `/account/profile`

**Error handling:**
- N/A (navigation only)

### Flow 4: Dashboard Arrival Experience

**Steps:**
1. User navigates to `/dashboard`
2. Page fades in smoothly (500ms)
3. **First thing visible:** Large affirmation card, centered ("Money is a tool for the life you want to live")
4. After reading (2s or scroll), sees personalized greeting: "Good morning, Ahiya!"
5. Below: Financial health indicator (gentle circle: "You're on track this month - 65% of budget used")
6. Scrolls down: Recent transactions list
7. Scrolls further: Detailed stats cards (net worth, spending, income, etc.)

**Edge cases:**
- **First-time user (no transactions)**: Show onboarding prompt instead of stats

**Error handling:**
- **Stats query fails**: Show affirmation + greeting only, error state for stats section

---

## Data Model Overview

**Key entities to modify:**

### 1. **User** (existing, modifications)
   - **New fields:**
     - `role`: Enum (USER, ADMIN) - default USER
     - `subscriptionTier`: Enum (FREE, PREMIUM) - default FREE
     - `subscriptionStartedAt`: DateTime? - when user upgraded
     - `subscriptionExpiresAt`: DateTime? - for future trial/expiry tracking
   - **Existing fields to keep:**
     - `currency`: String - but now user can change it
     - `timezone`: String - move to Account preferences section
   - **Relationships:** Same (categories, accounts, transactions, budgets, goals)

### 2. **ExchangeRate** (new)
   - Fields: `id`, `date`, `fromCurrency`, `toCurrency`, `rate`, `createdAt`
   - Purpose: Cache exchange rates to avoid repeated API calls
   - Relationships: None (utility table)

### 3. **CurrencyConversionLog** (new, optional)
   - Fields: `id`, `userId`, `fromCurrency`, `toCurrency`, `convertedAt`, `transactionCount`, `status`
   - Purpose: Audit log for currency conversions
   - Relationships: User

### No changes needed for:
- Category, Account, Transaction, Budget, Goal, MerchantCategoryCache (amounts stay as-is, just displayed in user's currency)

---

## Technical Requirements

**Must support:**
- User role-based access control (middleware checking `role === 'ADMIN'`)
- System-wide currency conversion with historical exchange rates
- Responsive design (mobile-friendly, though not native app)
- Smooth animations and transitions throughout
- Server-side rendering for auth-protected pages (existing Next.js App Router)

**Constraints:**
- Must maintain existing Supabase Auth integration
- Must preserve all existing features (accounts, transactions, budgets, goals, analytics, Plaid)
- Currency conversion must be transactional (all-or-nothing, no partial conversions)
- Admin routes must be server-side protected (not just client-side hidden)

**Preferences:**
- Use existing tech stack (Next.js 14, Prisma, tRPC, Supabase)
- Continue using shadcn/ui + Radix UI components (but customize for warmth)
- Use exchangerate.host or similar free API for exchange rates
- Framer Motion for animations (already installed)
- Keep Tailwind config but expand color palette

**New dependencies needed:**
- None (all tooling already in place)

---

## Success Criteria

**The MVP is successful when:**

1. **Currency flexibility achieved**
   - Metric: User can change currency in settings
   - Target: Conversion completes in <30 seconds for 1000 transactions

2. **Emotional arrival experience**
   - Metric: Dashboard prioritizes affirmation and greeting over raw data
   - Target: Affirmation is first content visible on page load

3. **Admin access functional**
   - Metric: ahiya.butman@gmail.com can access `/admin` and view all users
   - Target: Admin dashboard shows accurate system-wide metrics

4. **Settings clarity**
   - Metric: Users can distinguish Settings (system) vs Account (personal)
   - Target: Navigation clearly separates the two concepts

5. **Visual warmth perceived**
   - Metric: Subjective - app feels noticeably warmer/gentler than before
   - Target: All sharp borders replaced with shadows, all transitions smooth

---

## Out of Scope

**Explicitly not included in MVP:**
- **Billing/payment integration** - Structure is prepared (subscription tiers), but no Stripe integration yet
- **Mobile native apps** - Web responsive is sufficient
- **New major features** - No household accounts, multi-currency accounts, financial coaching, etc.
- **Admin impersonation** - Admin can see user list, but can't log in as users (future enhancement)
- **Complete visual rebrand** - Keep existing sage/warm-gray palette, just soften and expand
- **Localization/translation** - English only for now
- **Advanced affirmation system** - Daily rotation is fine, no custom user affirmations yet

**Why:** This vision focuses on **refining what exists** to embody the conscious money relationship positioning. New features can come after the foundation feels right.

---

## Assumptions

1. User expects seamless currency conversion without manual re-entry of data
2. "Home feeling" can be achieved through visual/UX changes without new features
3. Admin user needs are minimal for now (view-only analytics, user list)
4. Users will accept ~30 second conversion time for currency switching
5. Exchange rate APIs will be available and reasonably accurate (historical rates)
6. Current sage/warm-gray color palette is directionally correct, just needs expansion
7. Most users access via desktop web (mobile responsiveness is secondary priority)

---

## Open Questions

1. Should currency conversion be reversible (store original amounts for 30 days)?
2. Do we need admin audit logs for all actions, or just currency conversions?
3. Should affirmations be time-based (morning/evening different) or just daily rotation?
4. When user changes currency, should we send confirmation email?
5. Should financial health indicator be simple (on track / needs attention) or more granular?
6. Do we need user-facing changelog/release notes for this transformation?

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning

---

## Design Philosophy

This transformation is guided by a core principle:

> **"An app about conscious money should feel conscious in every interaction."**

That means:
- **Breath before data** - Give users space to arrive before confronting them
- **Support before metrics** - Lead with encouragement, follow with information
- **Clarity over complexity** - Every UI element should reduce anxiety or increase awareness
- **Warmth over efficiency** - A slightly slower, warmer interaction is better than a fast, cold one
- **Intention over optimization** - We're not maximizing wealth, we're cultivating relationship with money

This is not Mint. This is not YNAB. This is Wealth—a gentle guide to financial consciousness.
