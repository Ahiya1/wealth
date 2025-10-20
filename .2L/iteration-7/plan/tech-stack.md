# Technology Stack - Iteration 7

## Core Framework

**Decision:** Next.js 14.2.33 (App Router) - No changes

**Rationale:**
- Already established in codebase
- Server Components ideal for settings pages (profile data fetching)
- Client Components for interactive forms and theme toggle
- File-based routing supports /settings/account cleanly

## New Dependencies

### next-themes 0.2.1

**Decision:** Add next-themes library for theme management

**Rationale:**
- Industry standard for Next.js theme switching (11k+ GitHub stars)
- Prevents SSR flash of wrong theme (critical UX issue)
- Handles system preference detection automatically (`prefers-color-scheme`)
- localStorage persistence built-in
- Tiny bundle size (2.8kb gzipped)
- Used by shadcn/ui ecosystem (already compatible)
- Saves 2-3 hours vs manual implementation
- Battle-tested SSR/hydration handling

**Alternatives Considered:**
- Manual ThemeProvider: More control but must handle SSR flash, localStorage sync, system preference - error-prone
- use-dark-mode hook: Client-only, doesn't prevent flash
- No theme support: Not acceptable in 2025, accessibility requirement

**Installation:**
```bash
npm install next-themes
```

**Implementation Pattern:**
```typescript
// src/app/providers.tsx
import { ThemeProvider } from 'next-themes'

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

## Existing Stack (No Changes)

### Forms & Validation

**React Hook Form 7.53.2** - Already installed
- All existing forms use this pattern
- Excellent TypeScript support
- **@hookform/resolvers 3.9.1** for Zod integration
- **Zod 3.23.8** for schema validation

**Usage for Profile Form:**
```typescript
const formSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']),
  timezone: z.string(),
})

const form = useForm({
  resolver: zodResolver(formSchema),
  defaultValues: { ... },
})
```

### UI Components

**Radix UI 1.1.15** - Already installed
- AlertDialog for account deletion confirmation
- Select for currency/timezone dropdowns
- DropdownMenu for export format selection
- All components accessible (keyboard nav, ARIA)

**Tailwind CSS 3.4.1** - Already configured
- `darkMode: ['class']` already set
- Supports theme switching via class strategy
- Sage color palette established

### Backend

**tRPC 11.6.0** - Already configured
- Type-safe API layer
- Protected procedures for all mutations
- Query caching via React Query

**New Endpoints to Add:**
```typescript
users.updateProfile      // mutation
users.updatePreferences  // mutation
users.deleteAccount      // mutation
users.exportData         // query (JSON)
budgets.export           // query (CSV/JSON)
goals.export             // query (CSV/JSON)
accounts.export          // query (CSV/JSON)
```

**Prisma 5.22.0 + PostgreSQL** - Already configured
- User model has all needed fields (name, image, currency, timezone)
- Cascade deletes configured for all relationships
- No schema migrations needed

**Supabase Auth 2.58.0** - Already integrated
- Handles authentication
- Admin API for user deletion (`auth.admin.deleteUser`)
- Server-side client already configured

## Data Export Strategy

**CSV Generation:** Custom utilities (existing pattern)

**Current Implementation:**
- `/src/lib/csvExport.ts` has `generateTransactionCSV()` and `downloadCSV()`
- Proper quote escaping (`"` → `""`)
- UTF-8 encoding support
- Client-side blob download

**Extensions Needed:**
- `generateBudgetCSV(budgets[])`
- `generateGoalCSV(goals[])`
- `generateAccountCSV(accounts[])`
- Add UTF-8 BOM prefix for Excel compatibility

**JSON Export:** Built-in JSON.stringify

**Implementation:**
```typescript
export function generateTransactionJSON(transactions: Transaction[]): string {
  const exportData = transactions.map(txn => ({
    date: format(new Date(txn.date), 'yyyy-MM-dd'),
    payee: txn.payee,
    amount: Number(txn.amount),
    // ... all fields
  }))

  return JSON.stringify(exportData, null, 2) // Pretty print
}
```

**Download Pattern:**
```typescript
export function downloadJSON(jsonContent: string, filename: string): void {
  const blob = new Blob([jsonContent], {
    type: 'application/json;charset=utf-8;'
  })
  // Same download logic as CSV
}
```

**Dependencies:**
- **date-fns 3.6.0** (already installed) for date formatting
- No CSV parsing library needed (papaparse not required)
- No file-saver library needed (native Blob API sufficient)

## Theme System Architecture

### CSS Variables Strategy

**Current State:**
- Light mode variables defined in `globals.css`
- Sage palette (primary), Warm Gray (neutral), accent colors
- All components use CSS variables (not hard-coded colors)

**Dark Mode Implementation:**
```css
@layer base {
  :root {
    /* Light mode (existing) */
    --background: var(--warm-gray-50);    /* 24 6% 96% */
    --foreground: var(--warm-gray-900);   /* 24 10% 11% */
    --primary: var(--sage-600);           /* 140 14% 33% */
    --card: var(--warm-white);
    --border: var(--warm-gray-200);
    /* ... all existing variables ... */
  }

  .dark {
    /* Dark mode palette */
    --background: 24 10% 11%;      /* dark warm-gray */
    --foreground: 24 6% 96%;       /* light warm-gray */
    --primary: 140 12% 69%;        /* lighter sage for contrast */
    --primary-foreground: 140 18% 15%;
    --card: 24 9% 16%;             /* warm-gray-800 */
    --card-foreground: 24 6% 96%;
    --muted: 24 9% 16%;
    --muted-foreground: 24 4% 66%;
    --border: 24 7% 27%;
    --input: 24 7% 27%;
    --accent: 140 10% 92%;
    --accent-foreground: 140 15% 27%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
  }
}
```

**Color Contrast Requirements:**
- WCAG AA standard: 4.5:1 for normal text, 3:1 for large text
- WCAG AAA standard: 7:1 for normal text (stretch goal)
- Use WebAIM contrast checker during development
- Verify with browser DevTools accessibility panel

### Theme Toggle Component

**Implementation:**
```tsx
// src/components/settings/ThemeSwitcher.tsx
'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { DropdownMenu } from '@/components/ui/dropdown-menu'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="icon">
          <Sun className="rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Placement:**
- Settings page (primary location)
- Dashboard sidebar (quick access)

## Authentication & User Deletion

### Supabase Admin API Setup

**Current:** Server-side Supabase client exists (`/src/lib/supabase/server.ts`)

**New:** Admin client for user deletion

**Implementation:**
```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Admin key (server-only)
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

**Security:**
- Service role key NEVER exposed to client
- Used only in tRPC protected procedures (server-side)
- Different from anon key (more permissions)

**Usage in Account Deletion:**
```typescript
deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
  // 1. Delete from Prisma (cascade handles all relationships)
  await ctx.prisma.user.delete({ where: { id: ctx.user.id } })

  // 2. Delete from Supabase Auth
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(
    ctx.user.supabaseAuthId
  )

  if (error) {
    console.error('Supabase deletion failed:', error)
    // Log but don't throw - user data already deleted
  }

  return { success: true }
})
```

### Cascade Delete Strategy

**Prisma Schema (already configured):**
```prisma
model User {
  categories    Category[]     // Cascade on delete
  accounts      Account[]      // Cascade on delete
  transactions  Transaction[]  // Cascade on delete
  budgets       Budget[]       // Cascade on delete
  goals         Goal[]         // Cascade on delete
}
```

**Deletion Order (automatic via Prisma):**
1. BudgetAlert (foreign key to Budget)
2. Budget (foreign key to User)
3. Goal (foreign key to User)
4. Transaction (foreign key to Account → User)
5. Account (foreign key to User)
6. Category (where userId not null)
7. User record

**What's NOT deleted:**
- MerchantCategoryCache (global lookup table)
- System categories (where userId is null)

## Environment Variables

**Required for Iteration 7:**

```bash
# Existing (no changes)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
DATABASE_URL=postgresql://xxx

# New (for account deletion)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # Admin key (server-side only)
```

**How to Get Service Role Key:**
1. Go to Supabase project dashboard
2. Navigate to Settings → API
3. Copy "service_role" key (not anon key)
4. Add to .env.local (development) and production environment

**Security Notes:**
- Service role key has admin permissions (bypass RLS)
- NEVER expose to client code
- Use only in server-side tRPC procedures
- Rotate if compromised

## Performance Targets

**Export Generation:**
- CSV/JSON generation: <100ms for 1,000 rows
- Export download: <500ms total (including network)
- Hard limit: 10,000 rows per export
- Warning threshold: 5,000 rows

**Theme Switching:**
- Theme toggle response: <50ms (localStorage write)
- No visual flash on page load (next-themes prevents)
- CSS variable cascade: instant (browser-native)

**Profile Updates:**
- Form submission: <200ms (Prisma update + cache invalidation)
- Optimistic updates: Immediate UI feedback
- Error recovery: Toast notification + form state preserved

**Account Deletion:**
- Prisma cascade delete: <1s (typical user data)
- Supabase auth delete: <500ms (admin API call)
- Total deletion flow: <2s
- Redirect after deletion: Immediate

## Security Considerations

**Account Deletion:**
- Multi-step confirmation prevents accidental deletion
- Email validation ensures user awareness
- Checkbox confirms understanding of consequences
- Data preview shows exactly what will be deleted
- Server-side authorization (protectedProcedure)
- Admin API requires service role key (server-only)

**Data Exports:**
- All export endpoints use protectedProcedure
- Queries filtered by `userId: ctx.user.id`
- No cross-user data leakage possible
- 10,000 row limit prevents resource exhaustion
- Rate limiting via tRPC middleware (future)

**Theme Persistence:**
- localStorage only (no server-side sync)
- No sensitive data stored
- Client-side preference only
- XSS-safe (no eval, no script injection)

**Profile Updates:**
- Input validation via Zod schemas
- Email is read-only (Supabase-managed)
- Image field accepts URL only (no file upload)
- Currency/timezone from predefined lists
- No SQL injection risk (Prisma parameterized queries)

## Dependencies Summary

**To Install:**
```json
{
  "dependencies": {
    "next-themes": "^0.2.1"
  }
}
```

**Already Installed (Use As-Is):**
```json
{
  "dependencies": {
    "next": "14.2.33",
    "react": "18.3.1",
    "react-hook-form": "7.53.2",
    "@hookform/resolvers": "3.9.1",
    "zod": "3.23.8",
    "@radix-ui/react-alert-dialog": "1.1.15",
    "@radix-ui/react-select": "2.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "date-fns": "3.6.0",
    "@supabase/supabase-js": "2.58.0",
    "@prisma/client": "5.22.0",
    "@trpc/server": "11.6.0",
    "@trpc/client": "11.6.0",
    "@trpc/react-query": "11.6.0",
    "tailwindcss": "3.4.1"
  }
}
```

**NOT Needed:**
- papaparse (CSV parsing - we're generating, not parsing)
- file-saver (native Blob API sufficient)
- react-dropzone (no file upload yet)
- xlsx (Excel format not needed)
- jspdf (PDF export not in scope)
- use-dark-mode (next-themes better)

## Testing Tools

**Manual Testing:**
- Chrome DevTools → Lighthouse (accessibility audit)
- WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/)
- Browser DevTools → Accessibility panel
- Excel 2019+ (Windows & Mac)
- Google Sheets
- Mobile device testing (responsive)

**Automated Testing (Future):**
- Unit tests: Vitest (already configured)
- Integration tests: Playwright (MCP server available)
- Visual regression: Chromatic (future)
- A11y testing: axe-core (future)

## Code Quality Standards

**TypeScript:**
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Zod schemas for all user inputs
- tRPC router types auto-generated

**Forms:**
- React Hook Form + Zod pattern (established)
- Error messages user-friendly
- Loading states on all buttons
- Toast notifications for feedback

**Exports:**
- UTF-8 BOM prefix for CSV (Excel compatibility)
- Proper quote escaping (`" → ""`)
- Date formatting via date-fns
- Filename includes date (YYYY-MM-DD)

**Theme:**
- All colors via CSS variables
- No hard-coded hex colors
- Contrast ratio ≥4.5:1 verified
- Smooth transitions (no jarring switches)

**Security:**
- All mutations use protectedProcedure
- All queries filtered by ctx.user.id
- Admin keys server-side only
- Input validation on every endpoint
