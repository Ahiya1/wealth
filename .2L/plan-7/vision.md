# Project Vision: Wealth AI Financial Assistant

**Created:** 2025-11-30
**Plan:** plan-7

---

## Problem Statement

Manual transaction entry is the #1 friction point in personal finance apps. Users have data in multiple formats (bank statements, credit card PDFs, CSVs) but importing it is tedious and error-prone. Worse, bank transactions and credit card statements conflict - a ₪6,000 credit card bill shows as one bank transaction, but the itemized statement has 23 individual purchases.

**Current pain points:**
- Manual transaction entry is time-consuming and often abandoned
- Importing from files requires technical knowledge and careful duplicate checking
- Bank statements vs. credit card itemization creates double-counting confusion
- No intelligent assistance for understanding spending patterns
- Historical data cleanup after periods of non-use is overwhelming
- Users can't easily ask questions about their financial data

---

## Target Users

**Primary user:** Existing Wealth app users who want to:
- Import transactions from bank/credit card statements without manual entry
- Have intelligent conversations about their finances
- Get help cleaning up and organizing their financial data
- Receive insights and analysis on spending patterns

**User characteristics:**
- Has PDF/CSV bank statements and credit card statements
- Wants to understand their spending but finds manual analysis tedious
- May have gaps in their data from periods of non-use
- Values accuracy over speed (willing to review AI suggestions)

---

## Core Value Proposition

**A ChatGPT-style AI assistant that lives inside Wealth, understands your financial data, can import transactions from any file format, and helps you make sense of your money.**

**Key benefits:**
1. **Zero-friction imports** - Upload any statement, AI extracts and categorizes transactions
2. **Smart conflict resolution** - Automatically handles bank vs. credit card bill overlaps
3. **Conversational insights** - Ask questions in natural language, get instant answers
4. **Retroactive cleanup** - AI analyzes historical data and suggests fixes
5. **Learning system** - Gets smarter based on your categorization patterns

---

## Feature Breakdown

### Must-Have (MVP)

#### 1. **Chat Interface**
- **Description:** ChatGPT-style conversational UI at `/chat`
- **User story:** As a user, I want to have conversations with an AI about my finances so that I can get help without navigating complex menus
- **Acceptance criteria:**
  - [ ] Dedicated `/chat` page with message input and history
  - [ ] Real-time streaming responses
  - [ ] Session management (new chat, list previous chats, continue chat)
  - [ ] Mobile-responsive design consistent with Wealth UI
  - [ ] Markdown rendering for formatted responses

#### 2. **Session Persistence**
- **Description:** Save and retrieve chat conversations
- **User story:** As a user, I want my chat history saved so that I can reference past conversations
- **Acceptance criteria:**
  - [ ] ChatSession and ChatMessage database models
  - [ ] Auto-generated session titles from first message
  - [ ] Session list sidebar/drawer
  - [ ] Delete session capability
  - [ ] Sessions scoped to authenticated user only

#### 3. **File Upload & Parsing**
- **Description:** Upload bank/credit card statements (PDF, CSV, Excel) and extract transactions
- **User story:** As a user, I want to upload my bank statement and have the AI extract transactions so that I don't have to enter them manually
- **Acceptance criteria:**
  - [ ] Drag-and-drop file upload in chat
  - [ ] Support for PDF (via Claude Vision), CSV, Excel formats
  - [ ] Claude Vision parses statement structure intelligently
  - [ ] Extracts: date, amount, payee/description, reference numbers
  - [ ] Handles Israeli bank formats (FIBI, Leumi, Hapoalim, Discount, Mizrahi)
  - [ ] Handles Israeli credit cards (Cal, Max, Isracard, Amex)

#### 4. **Smart Transaction Comparison**
- **Description:** Compare extracted transactions against existing data to identify new, duplicate, and conflicting entries
- **User story:** As a user, I want the AI to check for duplicates before adding transactions so that I don't get duplicate entries
- **Acceptance criteria:**
  - [ ] Fetch existing transactions for relevant date range
  - [ ] Fuzzy matching on merchant names (70% similarity threshold)
  - [ ] Date tolerance matching (±2 days for processing delays)
  - [ ] Amount matching with small tolerance (rounding differences)
  - [ ] Clear presentation of: new, duplicate, uncertain matches
  - [ ] User confirmation before batch insert

#### 5. **Credit Card Bill Resolution**
- **Description:** Detect credit card bill transactions and link them to itemized purchases
- **User story:** As a user, I want the AI to understand that my ₪6,000 bank charge is a credit card bill and replace it with itemized transactions when I upload the credit card statement
- **Acceptance criteria:**
  - [ ] Detect credit card bill transactions (payee patterns, round amounts, recurring dates)
  - [ ] New category: "Credit Card Payment" (excluded from spending analytics)
  - [ ] Link itemized credit card transactions to their bill
  - [ ] Analytics exclude CC bill category to prevent double-counting
  - [ ] AI prompts user for credit card statement when bill detected

#### 6. **Query Tools (Read-Only)**
- **Description:** AI can query user's financial data to answer questions
- **User story:** As a user, I want to ask "How much did I spend on food last month?" and get an accurate answer
- **Acceptance criteria:**
  - [ ] Tool: `get_transactions` - filter by date, category, account, amount
  - [ ] Tool: `get_spending_summary` - totals by category for period
  - [ ] Tool: `get_budget_status` - current spend vs. budget
  - [ ] Tool: `get_account_balances` - all account balances
  - [ ] Tool: `get_categories` - list available categories
  - [ ] Tool: `search_transactions` - free-text search

#### 7. **Action Tools (Write Operations)**
- **Description:** AI can create and modify transactions with appropriate confirmation
- **User story:** As a user, I want to say "Add a ₪50 coffee expense" and have it created
- **Acceptance criteria:**
  - [ ] Tool: `create_transaction` - single transaction creation
  - [ ] Tool: `create_transactions_batch` - bulk import from parsed files
  - [ ] Tool: `update_transaction` - modify existing transaction
  - [ ] Tool: `categorize_transactions` - bulk re-categorization
  - [ ] Confirmation required for batch operations (>5 transactions)
  - [ ] Single transaction creation can be instant

#### 8. **Auto-Categorization**
- **Description:** Leverage existing MerchantCategoryCache and Claude for intelligent categorization
- **User story:** As a user, I want imported transactions to be automatically categorized based on my history
- **Acceptance criteria:**
  - [ ] Check MerchantCategoryCache first (high confidence)
  - [ ] Fall back to Claude categorization for unknown merchants
  - [ ] Learn from user corrections
  - [ ] Show categorization confidence (high/medium/low)
  - [ ] Flag low-confidence items for user review

### Should-Have (Post-MVP)

1. **Retroactive Cleanup Mode** - Analyze months of data, find duplicates, fix categories, identify patterns
2. **Financial Advice** - "Am I on track with my budget?" with actionable suggestions
3. **Recurring Transaction Detection** - "I notice Netflix charges monthly, want to set up recurring?"
4. **Receipt Scanning** - Photo of paper receipt → extracted transaction
5. **Refund Matching** - "This ₪200 from Amazon looks like a refund for your Nov 3 purchase"
6. **Split Transactions** - "This ₪500 ATM withdrawal - want to split it?"
7. **Budget Recommendations** - AI suggests budget amounts based on spending history
8. **Floating Chat Access** - Chat button accessible from any page

### Could-Have (Future)

1. **Voice Input** - Speak transactions instead of typing
2. **Proactive Alerts** - AI notices unusual spending and alerts user
3. **Multi-language** - Hebrew interface option
4. **Scheduled Reports** - Weekly/monthly AI-generated summaries via email
5. **Goal Planning** - "How much do I need to save monthly to reach my goal?"
6. **Tax Preparation** - Identify tax-deductible expenses, generate reports

---

## User Flows

### Flow 1: Import Bank Statement

**Steps:**
1. User opens `/chat` or starts new session
2. User drags bank statement PDF into chat
3. AI parses PDF using Claude Vision
4. AI calls `get_transactions` to fetch existing data for date range
5. AI compares and identifies: new (38), duplicates (6), credit card bills (1)
6. AI presents summary with details
7. User confirms or adjusts
8. AI calls `create_transactions_batch` to add confirmed transactions
9. AI reports success: "Added 38 transactions, skipped 6 duplicates"

**Edge cases:**
- Malformed PDF: AI reports which parts couldn't be parsed, suggests re-upload
- All duplicates: AI explains nothing new to add
- Partial duplicates: AI shows side-by-side comparison for uncertain matches

**Error handling:**
- File too large: "This file is too large. Try splitting by month."
- Unrecognized format: "I don't recognize this format. Is this a bank statement?"
- API failure: "I'm having trouble right now. Please try again in a moment."

### Flow 2: Credit Card Bill Resolution

**Steps:**
1. User imports bank statement with ₪6,000 "Visa Cal" transaction
2. AI detects this as credit card bill, creates with "Credit Card Payment" category
3. AI asks: "I see a credit card bill for ₪6,000. Do you have the itemized statement?"
4. User uploads credit card PDF
5. AI parses 23 itemized transactions totaling ₪6,000
6. AI links them to the bill transaction
7. AI presents: "Found 23 transactions matching this bill. Want me to add them?"
8. User confirms
9. Bill transaction marked as resolved, itemized transactions added

**Edge cases:**
- Amount mismatch: "The itemized total is ₪6,050 but the bill was ₪6,000. Could include fees or interest."
- Partial upload: "This statement only covers ₪4,000 of the ₪6,000 bill. Missing transactions?"

### Flow 3: Ask a Question

**Steps:**
1. User asks: "How much did I spend on restaurants this month?"
2. AI calls `get_spending_summary({ month: "2025-11", category: "Restaurants" })`
3. AI responds: "You spent ₪1,847 on restaurants in November. That's 23% higher than October (₪1,502)."
4. User asks: "Where did most of that go?"
5. AI calls `get_transactions({ month: "2025-11", category: "Restaurants", sort: "amount_desc", limit: 5 })`
6. AI responds with top 5 restaurant expenses

### Flow 4: Retroactive Cleanup

**Steps:**
1. User: "I haven't used the app in a while. Help me clean up."
2. AI calls `get_transactions({ dateRange: "last 6 months" })`
3. AI analyzes patterns, duplicates, categorization inconsistencies
4. AI presents cleanup report:
   - 23 potential duplicates
   - 156 uncategorized transactions (can auto-fix 89%)
   - 4 unresolved credit card bills
   - Category inconsistencies (Aroma in both Restaurants and Coffee)
5. User chooses: "Fix what you're confident about, show me the rest"
6. AI executes confident fixes, presents uncertain items one by one

---

## Data Model Overview

**New entities:**

1. **ChatSession**
   - Fields: id, userId, title, createdAt, updatedAt
   - Relationships: User (owner), ChatMessages (has many)

2. **ChatMessage**
   - Fields: id, sessionId, role (USER/ASSISTANT/TOOL_CALL/TOOL_RESULT), content, toolCalls (JSON), toolResults (JSON), createdAt
   - Relationships: ChatSession (belongs to)

3. **Transaction (extended)**
   - New fields:
     - `isCreditCardBill` (Boolean) - marks CC bill transactions
     - `linkedCreditBillId` (String?) - links itemized CC transactions to their bill
   - Relationships: Self-reference for CC bill linking

**Modified entities:**

1. **Category**
   - Add system category: "Credit Card Payment" (isDefault: true, excludeFromAnalytics: true)

---

## Technical Requirements

### API Architecture

**Approach:** Messages API with Tool Use (NOT Agent SDK)

**Rationale:**
- Controlled, well-defined tool access
- User confirmation for financial actions
- Cost-efficient for chat sessions
- Simpler architecture, existing patterns
- Agent SDK is overkill (designed for autonomous computer access)

### Model Selection

**Primary:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250514`)
- Fast responses (2-5s) for conversational UX
- Cost-effective for frequent interactions
- Excellent at tool use and structured extraction
- Great Vision capabilities for PDF parsing

**Optional Hybrid:** Claude Opus 4.5 for complex tasks
- Retroactive cleanup analysis (months of data)
- Nuanced financial advice
- Ambiguous conflict resolution
- User-triggered "deep analysis" mode

### Tool Definitions

```typescript
// Read-only tools
get_transactions({ dateRange?, category?, account?, search?, limit?, sort? })
get_spending_summary({ month, category? })
get_budget_status({ month })
get_account_balances()
get_categories()
search_transactions({ query })

// Write tools (require confirmation for batch)
create_transaction({ amount, payee, category, date, account, notes? })
create_transactions_batch({ transactions[], confirmationRequired: true })
update_transaction({ id, changes })
delete_transaction({ id, confirmationRequired: true })
categorize_transactions({ transactionIds[], categoryId })

// Import tools
parse_file({ fileContent: base64, fileType, hint? })
compare_with_existing({ transactions[], dateRange })
detect_credit_card_bills({ transactions[] })
link_credit_to_bill({ itemizedTransactionIds[], billTransactionId })
```

### Environment Configuration

**CRITICAL:** Feature must work in BOTH development and production environments.

**Development (.env.local):**
```bash
# Uncomment and configure for local development
ANTHROPIC_API_KEY="sk-ant-api03-..."
WEALTH_AI_ENABLED=true
WEALTH_AI_MODEL="claude-sonnet-4-5-20250514"
```

**Production (.env.production):**
```bash
ANTHROPIC_API_KEY="sk-ant-api03-..."  # Already configured
WEALTH_AI_ENABLED=true
WEALTH_AI_MODEL="claude-sonnet-4-5-20250514"
```

**Feature Flag:** `WEALTH_AI_ENABLED` controls whether the chat feature appears in the UI.

### File Processing

**PDF Parsing:** Claude Vision (direct image/PDF analysis)
- No external PDF parsing libraries needed
- Handles varied bank statement formats
- Can reason about table structures

**CSV/Excel:** Standard parsing libraries (already in project)
- xlsx package for Excel
- Built-in CSV parsing
- AI validates and normalizes extracted data

### Security Considerations

- Chat sessions scoped to authenticated user only
- Tool execution validated against user ownership
- No raw SQL or unrestricted data access
- Sensitive data (account numbers, etc.) not logged
- Rate limiting on AI API calls

---

## Success Criteria

**The MVP is successful when:**

1. **Import Success Rate**
   - Metric: % of transactions correctly extracted from uploaded files
   - Target: >90% accuracy on standard Israeli bank/CC formats

2. **Duplicate Prevention**
   - Metric: % of duplicates correctly identified
   - Target: >95% detection rate with <5% false positives

3. **Categorization Accuracy**
   - Metric: % of auto-categorized transactions user accepts without change
   - Target: >85% acceptance rate

4. **User Engagement**
   - Metric: % of active users who use chat feature
   - Target: >30% monthly active usage

5. **Time Savings**
   - Metric: Time to import a month of transactions
   - Target: <2 minutes (vs. 30+ minutes manual)

---

## Out of Scope

**Explicitly not included in MVP:**
- Voice input/output
- Proactive notifications from AI
- Scheduled automated reports
- Multi-language support (Hebrew UI)
- Direct bank API connections (Plaid/Open Banking) - handled by existing plan-6
- Investment portfolio analysis
- Tax preparation features

**Why:** Focus on core chat + import + query functionality. These features add complexity without validating the core value proposition.

---

## Assumptions

1. Users have access to their bank/credit card statements in digital format
2. Israeli bank statement formats are relatively consistent within each bank
3. Claude Vision can reliably parse tabular data from PDFs
4. Users will review and confirm batch imports before execution
5. Existing MerchantCategoryCache provides good baseline for categorization
6. Sonnet 4.5 is sufficient for most interactions (Opus reserved for complex analysis)

---

## Open Questions

1. **Session limits:** Should we limit chat history length? Context window considerations.
2. **Retry logic:** How to handle partial failures in batch imports?
3. **Offline support:** Should parsed transactions be cached if user doesn't confirm immediately?
4. **Sharing:** Could users share specific insights/reports from chat?

---

## Implementation Notes

### Leverage Existing Infrastructure

- **tRPC routers:** Add new `chat.router.ts`, tools call existing router methods
- **Prisma models:** Extend with ChatSession, ChatMessage
- **Anthropic SDK:** Already installed and configured
- **Categorization service:** Extend existing `categorize.service.ts`
- **UI patterns:** Follow existing shadcn/ui component patterns

### New Components Needed

- `ChatPage` - Main chat interface
- `ChatSidebar` - Session list
- `ChatMessage` - Message bubble component
- `FileUploadZone` - Drag-and-drop in chat
- `TransactionPreview` - Show parsed transactions for confirmation
- `ConfirmationDialog` - Batch action confirmation

### API Routes

- `POST /api/chat` - Send message, get streaming response
- `GET /api/chat/sessions` - List user's sessions
- `POST /api/chat/sessions` - Create new session
- `DELETE /api/chat/sessions/:id` - Delete session
- `GET /api/chat/sessions/:id/messages` - Get session messages

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning
