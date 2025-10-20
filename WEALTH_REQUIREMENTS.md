# Wealth - Personal Finance Dashboard

**Tagline:** "Where your conscious relationship with money begins"

**Vision:** A mindful personal finance application that helps users understand their money habits, build healthy financial patterns, and achieve their financial goals through awareness and intentionality.

---

## Product Overview

Wealth is a single-user personal finance dashboard that connects to bank accounts (via Plaid), tracks spending patterns, manages budgets, and provides insights into financial health. The focus is on consciousness and intentionality rather than judgment - helping users build a positive relationship with money.

---

## Core Features

### 1. Authentication & Profile

**Requirements:**
- Email/password registration and login
- Google OAuth option
- Password reset flow
- User profile management (name, email, currency preference, timezone)
- Secure session management
- Optional 2FA (future enhancement)

**User Stories:**
- As a user, I can register with email/password or Google
- As a user, I can reset my password if I forget it
- As a user, I can update my profile information
- As a user, my sessions remain secure and expire appropriately

---

### 2. Account Management

**Requirements:**
- Connect bank accounts via Plaid API
- Manual account creation (for accounts not supported by Plaid)
- Support account types:
  - Checking accounts
  - Savings accounts
  - Credit cards
  - Investment accounts
  - Cash accounts
- Display current balances
- Account status indicators (active, inactive, needs reconnection)
- Ability to hide/archive accounts
- Edit account details (name, starting balance for manual accounts)

**User Stories:**
- As a user, I can connect my bank account securely through Plaid
- As a user, I can manually add accounts that Plaid doesn't support
- As a user, I can see all my accounts and their current balances at a glance
- As a user, I can edit or archive accounts I no longer use

**Data Model:**
```
Account {
  id: string
  userId: string
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash'
  name: string
  institution: string (from Plaid or manual)
  balance: number
  currency: string
  plaidAccountId?: string (if connected via Plaid)
  isManual: boolean
  isActive: boolean
  lastSynced?: Date
  createdAt: Date
  updatedAt: Date
}
```

---

### 3. Transaction Tracking

**Requirements:**
- Auto-import transactions from Plaid-connected accounts
- Manual transaction entry
- Transaction properties:
  - Date
  - Amount (positive for income, negative for expenses)
  - Payee/merchant
  - Category
  - Account
  - Notes/memo
  - Tags (optional)
- Auto-categorization using AI (Claude API) for imported transactions
- Manual category override
- Split transactions (e.g., Costco purchase split between groceries and household)
- Search functionality (by date, amount, payee, category)
- Advanced filtering (date ranges, categories, accounts, amount ranges)
- Bulk operations (bulk categorize, bulk delete)
- Transaction sync from Plaid (daily or on-demand)

**User Stories:**
- As a user, my transactions automatically import from connected accounts
- As a user, I can manually add cash transactions or transactions from manual accounts
- As a user, transactions are intelligently categorized so I don't have to do it all manually
- As a user, I can override any auto-categorization
- As a user, I can split a transaction across multiple categories
- As a user, I can search and filter my transaction history

**Data Model:**
```
Transaction {
  id: string
  userId: string
  accountId: string
  date: Date
  amount: number
  payee: string
  category: string
  notes?: string
  tags?: string[]
  plaidTransactionId?: string
  isManual: boolean
  splits?: TransactionSplit[]
  createdAt: Date
  updatedAt: Date
}

TransactionSplit {
  category: string
  amount: number
  notes?: string
}
```

---

### 4. Category Management

**Requirements:**
- Pre-defined category structure:
  - Income (Salary, Freelance, Investments, Other)
  - Housing (Rent/Mortgage, Utilities, Maintenance)
  - Transportation (Gas, Public Transit, Car Payment, Insurance)
  - Food (Groceries, Restaurants, Coffee)
  - Shopping (Clothing, Electronics, Home Goods)
  - Entertainment (Subscriptions, Hobbies, Events)
  - Health (Insurance, Medical, Fitness)
  - Personal (Grooming, Education, Gifts)
  - Financial (Savings, Investments, Debt Payments)
  - Miscellaneous
- Custom category creation
- Category icons and colors
- Hierarchical categories (parent/child relationships)
- Category archiving (for unused categories)

**User Stories:**
- As a user, I have sensible default categories that cover most spending
- As a user, I can create custom categories for my unique needs
- As a user, I can organize categories hierarchically (e.g., Food → Groceries, Restaurants)
- As a user, I can customize category colors and icons for visual clarity

---

### 5. Budget Management

**Requirements:**
- Create monthly budgets by category
- Set budget amounts
- Track spending vs. budget in real-time
- Visual indicators (progress bars, color coding):
  - Green: under 75% of budget
  - Yellow: 75-95% of budget
  - Red: over 95% or exceeded
- Budget rollover options (unused budget carries to next month)
- Recurring budget templates (set once, applies every month)
- Budget alerts (email/in-app when approaching limit)
- Budget history (see past months)
- Budget vs. actual comparison charts

**User Stories:**
- As a user, I can set monthly budgets for each spending category
- As a user, I see real-time progress toward my budget limits
- As a user, I receive gentle alerts when approaching budget limits
- As a user, I can review how well I stuck to my budget in previous months
- As a user, I can create budget templates that repeat monthly

**Data Model:**
```
Budget {
  id: string
  userId: string
  category: string
  amount: number
  month: string (YYYY-MM format)
  rollover: boolean
  createdAt: Date
  updatedAt: Date
}

BudgetAlert {
  id: string
  userId: string
  budgetId: string
  threshold: number (percentage)
  sent: boolean
  sentAt?: Date
}
```

---

### 6. Analytics & Insights

**Requirements:**
- **Dashboard Overview:**
  - Current net worth (sum of all account balances)
  - Monthly income vs. expenses
  - Top spending categories (current month)
  - Recent transactions
  - Budget status summary
  - Upcoming bills/recurring transactions

- **Spending Analysis:**
  - Spending by category (pie chart)
  - Spending trends over time (line/bar chart)
  - Month-over-month comparison
  - Average spending per category
  - Spending heatmap (calendar view)

- **Income Analysis:**
  - Income sources breakdown
  - Income trends over time
  - Income consistency tracking

- **Net Worth Tracking:**
  - Net worth over time (line chart)
  - Account balances snapshot
  - Net worth milestones

- **Custom Reports:**
  - Date range selection
  - Category filtering
  - Account filtering
  - Export to CSV

**User Stories:**
- As a user, I can see my financial health at a glance on the dashboard
- As a user, I can analyze my spending patterns over different time periods
- As a user, I can track my net worth growth over time
- As a user, I can generate custom reports for specific categories or date ranges
- As a user, I can export my data for further analysis or record-keeping

---

### 7. Goals & Planning

**Requirements:**
- Create savings goals:
  - Goal name
  - Target amount
  - Target date
  - Current progress
  - Linked account (optional)
- Goal tracking:
  - Visual progress indicators
  - Projected completion date based on current savings rate
  - Monthly contribution suggestions
- Debt payoff calculator:
  - Current debt amount
  - Interest rate
  - Minimum payment
  - Calculate payoff timeline
  - Compare payoff strategies (snowball vs. avalanche)
- Goal milestones and celebrations

**User Stories:**
- As a user, I can set savings goals with target amounts and dates
- As a user, I can track my progress toward my goals
- As a user, I receive suggestions on how much to save monthly to reach my goals
- As a user, I can calculate debt payoff timelines
- As a user, I celebrate when I reach financial milestones

**Data Model:**
```
Goal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: Date
  linkedAccountId?: string
  type: 'savings' | 'debt_payoff' | 'investment'
  isCompleted: boolean
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

---

### 8. Mindful Finance Features

**These features support the "conscious relationship with money" philosophy:**

- **Spending Reflections:**
  - After certain transactions, prompt user: "How did this purchase make you feel?"
  - Optional reflection notes on transactions
  - Tag transactions as "aligned" or "impulse"

- **Financial Affirmations:**
  - Display positive money affirmations on dashboard
  - Customizable affirmation library

- **Gratitude Journal:**
  - Log what you're grateful for financially
  - See gratitude entries alongside spending data

- **Values Alignment:**
  - Define your financial values
  - Tag spending categories as aligned with values
  - Report on values-aligned spending percentage

**User Stories:**
- As a user, I can reflect on how purchases made me feel
- As a user, I can define my financial values and see how my spending aligns
- As a user, I see positive affirmations about money
- As a user, I can practice financial gratitude

---

## Technical Requirements

### Tech Stack

**Recommendation (for Planner to finalize):**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth.js
- **API:** tRPC (type-safe API)
- **Plaid Integration:** Plaid API (sandbox mode for testing)
- **AI Categorization:** Claude API (Anthropic)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts or Chart.js
- **Forms:** React Hook Form + Zod validation
- **Date Handling:** date-fns
- **Deployment:** Vercel
- **Email:** Resend (for password reset, alerts)

### Infrastructure

- **Environment Variables:**
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `PLAID_CLIENT_ID`
  - `PLAID_SECRET`
  - `PLAID_ENV` (sandbox/development/production)
  - `ANTHROPIC_API_KEY`
  - `RESEND_API_KEY`

- **Database Migrations:**
  - Prisma migrations for schema changes
  - Seed script for default categories

- **API Rate Limiting:**
  - Rate limit Plaid sync operations
  - Rate limit Claude API calls

---

## Security Requirements

1. **Authentication:**
   - Secure password hashing (bcrypt)
   - JWT session tokens
   - HttpOnly cookies
   - CSRF protection

2. **Data Protection:**
   - All Plaid credentials encrypted at rest
   - User data isolated (row-level security)
   - No sensitive data in logs
   - Secure API key management

3. **Plaid Security:**
   - Use Plaid Link for secure connection
   - Store Plaid access tokens encrypted
   - Handle Plaid webhook signatures
   - Graceful handling of revoked access

---

## Quality Gates

### Testing Requirements
- Unit tests for utility functions (>80% coverage)
- Integration tests for API routes
- E2E tests for critical flows:
  - Registration/login
  - Account connection
  - Transaction creation
  - Budget setting
  - Goal creation
- Plaid integration tests (sandbox mode)

### Code Quality
- TypeScript strict mode enabled
- No TypeScript errors
- ESLint passing (with recommended rules)
- Prettier formatting
- No console.log statements in production code

### Performance
- Lighthouse score >90
- First Contentful Paint <1.5s
- Time to Interactive <3.5s
- Page bundle size <500KB
- API response times <200ms (p95)

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios meet standards

---

## MVP Success Criteria

**The MVP is complete when:**

1. ✅ User can register and login (email + Google OAuth)
2. ✅ User can connect a bank account via Plaid (sandbox)
3. ✅ Transactions automatically import from Plaid
4. ✅ Transactions are auto-categorized using AI
5. ✅ User can manually add transactions
6. ✅ User can create and manage budgets
7. ✅ User can see budget progress in real-time
8. ✅ Dashboard displays:
   - Net worth
   - Monthly income vs expenses
   - Top spending categories
   - Recent transactions
   - Budget status
9. ✅ Spending analytics page shows:
   - Spending by category chart
   - Spending trends over time
   - Month-over-month comparison
10. ✅ User can create and track savings goals
11. ✅ App is mobile-responsive
12. ✅ All tests passing
13. ✅ Deployed to Vercel and accessible via URL
14. ✅ Password reset flow works
15. ✅ User can export transaction data to CSV

---

## Out of Scope (Post-MVP)

- Multi-user support / family accounts
- Recurring transaction detection and management
- Bill reminders
- Investment portfolio tracking with real-time quotes
- Tax preparation features
- Mobile app (native iOS/Android)
- Bank account auto-sync scheduling
- Receipt image upload and OCR
- Cryptocurrency tracking
- International currency support
- Budget sharing/collaboration
- Financial advisor integration

---

## Testing Strategy for Solo User

**How to validate the application:**

1. **Setup Phase:**
   - Register account with email
   - Login with Google OAuth
   - Connect Plaid sandbox account (Chase, Wells Fargo, or BofA)
   - Add 1-2 manual accounts (cash, credit card)

2. **Transaction Testing:**
   - Let Plaid import initial transactions (~20-30)
   - Verify auto-categorization works
   - Add 10 manual transactions
   - Test transaction search and filtering
   - Try split transaction
   - Edit categories and verify changes

3. **Budget Testing:**
   - Create budgets for 5 categories (Groceries, Dining, Transportation, Shopping, Entertainment)
   - Set realistic amounts based on imported transactions
   - Verify budget progress displays correctly
   - Add transactions to push budget over limit
   - Verify color indicators change appropriately

4. **Analytics Testing:**
   - Check dashboard displays correct net worth
   - Verify spending by category chart
   - Check month-over-month comparison
   - Test custom date range selection
   - Export data to CSV and verify format

5. **Goals Testing:**
   - Create 2 savings goals
   - Set target amounts and dates
   - Manually update progress
   - Verify projections calculate correctly

6. **Edge Cases:**
   - Test with $0 transactions
   - Test with very large amounts
   - Test with negative balances
   - Test date boundaries (month start/end)
   - Test empty states (no transactions, no budgets)

7. **Mobile Testing:**
   - Test on mobile browser
   - Verify responsive design
   - Test touch interactions

**Total testing time: 30-45 minutes**

---

## Design Philosophy

**"Conscious Relationship with Money"**

The UI/UX should embody:
- **Calm, not anxious:** Gentle colors, no alarming reds unless truly critical
- **Insightful, not judgmental:** Frame overspending as "learning opportunities"
- **Empowering, not restrictive:** Budgets as guides, not limits
- **Mindful, not obsessive:** Encourage periodic check-ins, not constant monitoring
- **Positive, not punitive:** Celebrate wins, learn from challenges

**Design Principles:**
- Clarity over complexity
- Insight over data dump
- Progress over perfection
- Understanding over judgment

---

## Deliverables

1. **Functional Application:**
   - Working Next.js app
   - Database with migrations
   - Deployed to Vercel

2. **Documentation:**
   - README.md with setup instructions
   - API documentation
   - Environment variable template
   - Deployment guide

3. **Testing:**
   - Test suite with >80% coverage
   - E2E tests for critical flows
   - Plaid sandbox testing guide

4. **Code Quality:**
   - Clean, typed TypeScript
   - Organized file structure
   - Commented complex logic
   - Error handling throughout

---

## Timeline Expectation

**If 2L works well:**
- Exploration: 15-30 minutes
- Planning: 15-30 minutes
- Building: 2-3 hours
- Integration: 30-60 minutes
- Validation: 30-60 minutes
- Healing (if needed): 30-60 minutes

**Total: 4-6 hours of autonomous development**

---

**End of Requirements**

This is the complete specification for **Wealth**. The 2L protocol will take this as input and produce a production-ready MVP.
