# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Iteration 7 adds user management and data export capabilities to the Wealth application. This report analyzes technology needs for CSV/JSON exports, theme switching, account settings, profile management, and secure account deletion. The codebase already has strong foundations for these features through existing CSV export utilities, form patterns, and Supabase auth integration. **Key finding:** Most required libraries already exist; this iteration focuses on composing existing patterns into new features with minimal new dependencies.

## Discoveries

### Existing Infrastructure (EXCELLENT FOUNDATION)

#### CSV/JSON Export Capabilities

**Already Implemented:**
- `/home/ahiya/Ahiya/wealth/src/lib/csvExport.ts` - Complete CSV generation utility
- `generateTransactionCSV()` function with proper escaping, date formatting
- `downloadCSV()` function for client-side file downloads
- `ExportButton` component in transactions with dropdown UI pattern
- Uses blob URLs for secure downloads, proper cleanup

**Pattern Analysis:**
```typescript
// Existing pattern (transactions)
export function generateTransactionCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Payee', 'Category', 'Account', 'Amount', 'Tags', 'Notes']
  const headerRow = headers.join(',')
  
  const dataRows = transactions.map((txn) => {
    const amount = typeof txn.amount === 'number' ? txn.amount : Number(txn.amount.toString())
    const row = [
      format(new Date(txn.date), 'yyyy-MM-dd'),
      `"${txn.payee.replace(/"/g, '""')}"`, // Proper escaping
      txn.category.name,
      txn.account.name,
      amount.toString(),
      `"${txn.tags.join(', ')}"`,
      `"${(txn.notes || '').replace(/"/g, '""')}"`,
    ]
    return row.join(',')
  })
  
  return [headerRow, ...dataRows].join('\n')
}

// Client-side download
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url) // Cleanup
}
```

**What's Missing:** Export functions for budgets, goals, accounts (need to create)

#### Form Handling Patterns

**Already Established:**
- React Hook Form 7.53.2 with Zod validation (all forms)
- `@hookform/resolvers` 3.9.1 for Zod integration
- Consistent pattern across TransactionForm, BudgetForm, GoalForm, AccountForm
- Error handling with toast notifications
- Loading states with disabled buttons

**Example Pattern:**
```typescript
const formSchema = z.object({
  field: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(formSchema),
  defaultValues: { /* ... */ },
})

const mutation = trpc.users.update.useMutation({
  onSuccess: () => toast({ title: 'Saved' }),
  onError: (err) => toast({ title: 'Error', variant: 'destructive' }),
})
```

**Recommendation:** Use identical pattern for account settings form

#### Dialog/Modal Patterns

**Already Implemented:**
- `@radix-ui/react-alert-dialog` 1.1.15 installed
- `/home/ahiya/Ahiya/wealth/src/components/ui/alert-dialog.tsx` - Complete implementation
- Accessible, keyboard-friendly, escape key support
- Overlay with backdrop blur
- Confirmation pattern with Cancel/Action buttons

**Current Usage:**
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Recommendation:** Perfect for account deletion flow; add extra confirmation step

#### Authentication & User Management

**Supabase Integration (Iteration 3):**
- `/home/ahiya/Ahiya/wealth/src/lib/supabase/server.ts` - Server-side auth
- `/home/ahiya/Ahiya/wealth/src/lib/supabase/client.ts` - Client-side auth
- Supabase Auth UI components for sign in/sign up
- User model in Prisma with `supabaseAuthId` link

**User Model:**
```prisma
model User {
  id             String    @id @default(cuid())
  supabaseAuthId String?   @unique
  email          String    @unique
  name           String?
  image          String?
  currency       String    @default("USD")
  timezone       String    @default("America/New_York")
  
  // Relationships
  accounts            Account[]
  transactions        Transaction[]
  budgets             Budget[]
  goals               Goal[]
}
```

**Existing tRPC Endpoints:**
```typescript
// src/server/api/routers/users.router.ts
users.me              // Get current user
users.completeOnboarding
users.skipOnboarding
```

**What's Missing:** Update profile, delete account endpoints

### Technology Gaps Analysis

#### Theme Switching (NOT IMPLEMENTED)

**Current State:**
- Tailwind configured with `darkMode: ['class']` in config
- CSS variables defined in `globals.css` (sage palette)
- NO theme provider installed
- NO theme switcher UI
- Only light mode variables defined

**Required:**
- `next-themes` library (industry standard for Next.js)
- ThemeProvider wrapper in app layout
- Dark mode CSS variable definitions
- Theme toggle component

**Why next-themes:**
1. Built specifically for Next.js (handles SSR, hydration)
2. Zero flash of wrong theme (syncs with system before paint)
3. Respects `prefers-color-scheme`
4. localStorage persistence
5. 2.8kb gzipped (tiny)
6. Already used by shadcn/ui examples

**Bundle Size Impact:** +2.8kb (acceptable)

#### JSON Export Support (PARTIAL)

**Current:** Only CSV export implemented
**Need:** JSON export for programmatic use, API integration

**Recommendation:** Add `generateJSON()` utility alongside CSV functions

**Implementation:**
```typescript
export function generateTransactionJSON(transactions: Transaction[]): string {
  const exportData = transactions.map(txn => ({
    date: format(new Date(txn.date), 'yyyy-MM-dd'),
    payee: txn.payee,
    category: txn.category.name,
    account: txn.account.name,
    amount: Number(txn.amount),
    tags: txn.tags,
    notes: txn.notes,
  }))
  
  return JSON.stringify(exportData, null, 2) // Pretty print
}

export function downloadJSON(jsonContent: string, filename: string): void {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  // Same download logic as CSV
}
```

**Complexity:** LOW - JSON.stringify handles all escaping

#### Profile Management (MISSING UI)

**Backend Ready:** User model has name, email, image, currency, timezone
**Missing:** UI form to update these fields

**Required Fields:**
- Name (optional)
- Email (readonly - managed by Supabase)
- Profile image upload (future - skip for now)
- Currency preference (dropdown)
- Timezone (dropdown or auto-detect)

**Recommendation:** Create `/settings/account` page with profile form

## Patterns Identified

### Pattern 1: Multi-Format Export System

**Description:** Extend existing CSV export to support CSV + JSON for all data types

**Data Types to Export:**
1. Transactions (CSV ✅, JSON needed)
2. Budgets (both needed)
3. Goals (both needed)
4. Accounts (both needed)

**Architecture:**
```
src/lib/export/
  ├── csv.ts          # CSV generation utilities
  ├── json.ts         # JSON generation utilities
  └── types.ts        # Export type definitions
  
src/server/api/routers/export.router.ts  # tRPC endpoints
```

**API Design:**
```typescript
// tRPC router
export const exportRouter = router({
  transactions: protectedProcedure
    .input(z.object({
      format: z.enum(['csv', 'json']),
      filters: z.object({ /* same as transactions.list */ }),
    }))
    .query(async ({ ctx, input }) => {
      const transactions = await ctx.prisma.transaction.findMany({ /* ... */ })
      
      if (input.format === 'csv') {
        return {
          data: generateTransactionCSV(transactions),
          filename: `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`,
          mimeType: 'text/csv',
        }
      } else {
        return {
          data: generateTransactionJSON(transactions),
          filename: `transactions-${format(new Date(), 'yyyy-MM-dd')}.json`,
          mimeType: 'application/json',
        }
      }
    }),
    
  budgets: protectedProcedure
    .input(z.object({ format: z.enum(['csv', 'json']), month?: z.string() }))
    .query(/* similar pattern */),
    
  goals: protectedProcedure
    .input(z.object({ format: z.enum(['csv', 'json']) }))
    .query(/* similar pattern */),
    
  accounts: protectedProcedure
    .input(z.object({ format: z.enum(['csv', 'json']) }))
    .query(/* similar pattern */),
})
```

**UI Component Pattern:**
```tsx
// Reusable export button (replace existing ExportButton)
interface ExportButtonProps {
  dataType: 'transactions' | 'budgets' | 'goals' | 'accounts'
  filters?: Record<string, any>
  className?: string
}

export function ExportButton({ dataType, filters, className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  
  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true)
    try {
      const result = await trpc.export[dataType].query({ format, ...filters })
      
      const blob = new Blob([result.data], { type: result.mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      link.click()
      URL.revokeObjectURL(url)
      
      toast({ title: `Exported ${dataType} as ${format.toUpperCase()}` })
    } catch (error) {
      toast({ title: 'Export failed', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Use Case:** Consistent export UI across all pages (transactions, budgets, goals, accounts)

**Recommendation:** HIGH PRIORITY - Unifies export experience, small effort

### Pattern 2: Theme Switching with next-themes

**Description:** Add light/dark/system theme support using next-themes library

**Installation:**
```bash
npm install next-themes
```

**Setup:**

1. **Update Providers:**
```typescript
// src/app/providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// ... other imports

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </ThemeProvider>
  )
}
```

2. **Add Dark Mode CSS Variables:**
```css
/* src/app/globals.css */
@layer base {
  :root {
    /* Light mode (existing) */
    --sage-500: 140 13% 42%;
    --background: var(--warm-gray-50);
    --foreground: var(--warm-gray-900);
    /* ... all existing variables */
  }
  
  .dark {
    /* Dark mode palette */
    --background: 24 10% 11%;      /* warm-gray-900 */
    --foreground: 24 6% 98%;       /* warm-gray-50 */
    --card: 24 9% 16%;             /* warm-gray-800 */
    --card-foreground: 24 6% 96%;  /* warm-gray-100 */
    --primary: 140 12% 69%;        /* sage-300 (lighter for dark) */
    --primary-foreground: 140 18% 15%; /* sage-900 */
    --muted: 24 9% 16%;
    --muted-foreground: 24 4% 66%;
    --accent: 140 10% 92%;
    --accent-foreground: 140 15% 27%;
    --border: 24 7% 27%;
    --input: 24 7% 27%;
  }
}
```

3. **Theme Switcher Component:**
```tsx
// src/components/settings/ThemeSwitcher.tsx
'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

4. **Placement:**
- Dashboard sidebar (persistent access)
- Settings page (alongside account preferences)

**Why This Pattern:**
- Zero flash (theme applied before paint)
- localStorage persistence (remembers preference)
- System preference detection
- Accessible (keyboard navigation)
- Minimal JS (2.8kb)

**Recommendation:** ESSENTIAL - Expected feature in modern apps

### Pattern 3: Account Settings Page Architecture

**Description:** Centralized settings page with sections for profile, preferences, theme, danger zone

**URL Structure:**
```
/settings              # Main settings hub (existing)
  └─ /categories       # Existing
  └─ /account          # NEW - Profile & preferences
```

**Page Layout:**
```tsx
// src/app/(dashboard)/settings/account/page.tsx
'use client'

import { ProfileSection } from '@/components/settings/ProfileSection'
import { PreferencesSection } from '@/components/settings/PreferencesSection'
import { ThemeSection } from '@/components/settings/ThemeSection'
import { DangerZone } from '@/components/settings/DangerZone'
import { Separator } from '@/components/ui/separator'

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile, preferences, and account security
        </p>
      </div>
      
      <Separator />
      
      <ProfileSection />
      
      <Separator />
      
      <PreferencesSection />
      
      <Separator />
      
      <ThemeSection />
      
      <Separator />
      
      <DangerZone />
    </div>
  )
}
```

**Section Components:**

1. **ProfileSection** - Name, email (readonly), profile image placeholder
2. **PreferencesSection** - Currency, timezone selectors
3. **ThemeSection** - Theme switcher with explanation
4. **DangerZone** - Account deletion with multi-step confirmation

**Form Submission:**
```typescript
const updateProfile = trpc.users.updateProfile.useMutation({
  onSuccess: () => {
    toast({ title: 'Profile updated' })
    utils.users.me.invalidate()
  },
})

const updatePreferences = trpc.users.updatePreferences.useMutation({
  onSuccess: () => {
    toast({ title: 'Preferences saved' })
    utils.users.me.invalidate()
  },
})
```

**Recommendation:** HIGH PRIORITY - Core user management UX

### Pattern 4: Secure Account Deletion Flow

**Description:** Multi-step confirmation to prevent accidental account deletion

**Security Requirements:**
1. Confirm deletion in modal
2. Type email address to confirm
3. Show data loss warning (transactions, budgets, goals)
4. Final "I understand" checkbox
5. Delete from both Supabase Auth + Prisma

**Implementation:**

```tsx
// src/components/settings/DangerZone.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/components/ui/use-toast'
import { AlertTriangle } from 'lucide-react'

export function DangerZone() {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [understood, setUnderstood] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  
  const { data: user } = trpc.users.me.useQuery()
  
  const deleteAccount = trpc.users.deleteAccount.useMutation({
    onSuccess: () => {
      toast({ title: 'Account deleted' })
      router.push('/signin')
    },
    onError: () => {
      toast({ title: 'Deletion failed', variant: 'destructive' })
    },
  })
  
  const canDelete = confirmEmail === user?.email && understood
  
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
      <h3 className="text-lg font-semibold text-destructive mb-2">
        Danger Zone
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      
      <Button
        variant="destructive"
        onClick={() => setShowDeleteModal(true)}
      >
        Delete Account
      </Button>
      
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
              <p className="font-medium">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>All your transactions</li>
                <li>All your budgets and goals</li>
                <li>All your accounts and connections</li>
                <li>Your profile and preferences</li>
              </ul>
            </div>
            
            <div>
              <label className="text-sm font-medium">
                Type your email to confirm: {user?.email}
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-2"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="understand"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
              />
              <label htmlFor="understand" className="text-sm">
                I understand that this action is permanent and cannot be undone
              </label>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setConfirmEmail('')
                  setUnderstood(false)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteAccount.mutate()}
                disabled={!canDelete || deleteAccount.isPending}
                className="flex-1"
              >
                {deleteAccount.isPending ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

**Backend Implementation:**
```typescript
// src/server/api/routers/users.router.ts
deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
  const userId = ctx.user.id
  
  // 1. Delete all user data (cascade will handle relationships)
  await ctx.prisma.user.delete({
    where: { id: userId },
  })
  
  // 2. Delete from Supabase Auth
  const supabase = createClient()
  await supabase.auth.admin.deleteUser(ctx.user.supabaseAuthId)
  
  return { success: true }
})
```

**Security Considerations:**
- Email confirmation prevents typos/misclicks
- Checkbox forces user to read warning
- Data loss clearly communicated
- Cascade delete in Prisma (all relationships deleted)
- Supabase admin API for auth deletion

**Recommendation:** CRITICAL - Required for GDPR/CCPA compliance

### Pattern 5: Currency & Timezone Preferences

**Description:** User preferences for display formatting

**Current State:**
- User model has `currency` (default "USD") and `timezone` fields
- NO UI to change them
- Transactions use hard-coded formatters

**Implementation:**

```tsx
// src/components/settings/PreferencesSection.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'

const preferencesSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']),
  timezone: z.string(),
})

export function PreferencesSection() {
  const { data: user } = trpc.users.me.useQuery()
  const utils = trpc.useUtils()
  
  const { register, handleSubmit, setValue } = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      currency: user?.currency || 'USD',
      timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })
  
  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onSuccess: () => {
      toast({ title: 'Preferences saved' })
      utils.users.me.invalidate()
    },
  })
  
  const onSubmit = (data: z.infer<typeof preferencesSchema>) => {
    updatePreferences.mutate(data)
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Preferences</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Currency</label>
          <Select onValueChange={(val) => setValue('currency', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="CAD">CAD ($)</SelectItem>
              <SelectItem value="AUD">AUD ($)</SelectItem>
              <SelectItem value="JPY">JPY (¥)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Timezone</label>
          <Select onValueChange={(val) => setValue('timezone', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
              <SelectItem value="Europe/London">London</SelectItem>
              <SelectItem value="Europe/Paris">Paris</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button type="submit" disabled={updatePreferences.isPending}>
          Save Preferences
        </Button>
      </form>
    </div>
  )
}
```

**Recommendation:** MEDIUM PRIORITY - Nice to have, low complexity

## Complexity Assessment

### High Complexity Areas

#### 1. Account Deletion Flow (45 minutes)

**Why Complex:**
- Multi-step confirmation UI (modal, inputs, checkbox)
- Email validation logic
- Supabase Auth admin API integration
- Prisma cascade delete verification
- Error handling (partial deletion scenarios)
- Redirect after deletion

**Components to Build:**
- DangerZone component (AlertDialog with form validation)
- Backend mutation (deleteAccount)
- Supabase admin client setup

**Time Estimate:** 45 minutes

**Recommendation:** ONE builder handles complete flow (splitting creates security gaps)

### Medium Complexity Areas

#### 2. Multi-Format Export System (60 minutes)

**Why Medium:**
- 4 data types × 2 formats = 8 export functions
- Consistent filename generation
- Error handling for large datasets
- tRPC endpoint design (query vs mutation?)
- Update existing ExportButton component

**Breakdown:**
- Export utilities (csv.ts, json.ts): 20 min
- tRPC router (4 endpoints): 20 min
- Update ExportButton component: 15 min
- Testing/debugging: 5 min

**Time Estimate:** 60 minutes

**Recommendation:** ONE builder handles (consistent patterns)

#### 3. Account Settings Page + Profile Management (50 minutes)

**Why Medium:**
- Multiple sections (Profile, Preferences, Theme, Danger Zone)
- Form validation (name, email)
- Currency/timezone selectors
- Image upload placeholder (skip actual upload)
- Navigation from settings hub

**Breakdown:**
- Page layout + routing: 10 min
- ProfileSection component: 15 min
- PreferencesSection component: 15 min
- Backend mutations (updateProfile, updatePreferences): 10 min

**Time Estimate:** 50 minutes

**Recommendation:** ONE builder handles page, SPLIT DangerZone to deletion flow builder

### Low Complexity Areas

#### 4. Theme Switching Implementation (30 minutes)

**Why Low:**
- Install next-themes (5 min)
- Update Providers (5 min)
- Add dark mode CSS variables (10 min)
- Create ThemeSwitcher component (10 min)
- Place in sidebar/settings

**Time Estimate:** 30 minutes

**Complexity:** LOW - Well-documented pattern, shadcn/ui compatible

**Recommendation:** ONE builder handles (can be parallel)

#### 5. Update Settings Hub (15 minutes)

**Why Low:**
- Add "Account" link to existing /settings page
- Update navigation to include /settings/account
- Minor styling updates

**Time Estimate:** 15 minutes

**Complexity:** LOW - Minimal changes

**Recommendation:** Part of settings page builder's work

## Technology Recommendations

### Primary Stack (Already in Place)

#### Form Handling: React Hook Form 7.53.2 + Zod 3.23.8
**Why it works:**
- Already used in all forms (TransactionForm, BudgetForm, etc.)
- Excellent TypeScript support
- Zod integration via @hookform/resolvers
- Error handling patterns established
- **No new installation needed**

#### Export Utilities: Custom (date-fns 3.6.0 already installed)
**Why it works:**
- Existing csvExport.ts has proven patterns
- date-fns for date formatting
- No external CSV library needed (simple join logic)
- JSON.stringify for JSON export
- **No new dependencies**

#### Auth: Supabase 2.58.0 (Already Integrated)
**Why it works:**
- User auth already working (Iteration 3)
- Admin API for user deletion
- Auth state management
- **No changes needed**

#### Database: Prisma 5.22.0 + PostgreSQL
**Why it works:**
- Cascade deletes configured
- User model ready
- **No schema changes needed**

### Supporting Libraries to Install

#### Theme Switching: next-themes (REQUIRED)

```bash
npm install next-themes
```

**Version:** Latest (currently 0.2.1)

**Why needed:**
- Zero flash theme switching
- localStorage persistence
- System preference detection
- SSR/hydration safe
- Tiny bundle (2.8kb gzipped)

**Alternative considered:** Manual implementation
**Rejected because:** next-themes handles SSR edge cases, flash prevention, storage sync

**Integration complexity:** LOW - Drop-in provider pattern

#### File Download: Built-in Blob API (NO INSTALL)

**Why it works:**
- Native browser API
- Already used in ExportButton
- Blob + URL.createObjectURL pattern
- Proper cleanup with revokeObjectURL

**No library needed** (file-saver, downloadjs not required for simple downloads)

### Dependencies NOT Needed

**What we DON'T need:**

1. **CSV parsing library** (papaparse, csv-parser)
   - Reason: We're GENERATING, not parsing
   - Custom join logic sufficient

2. **File upload library** (react-dropzone, filepond)
   - Reason: Profile image upload deferred
   - Future iteration

3. **Separate form library** (formik)
   - Reason: React Hook Form already used
   - Consistent patterns

4. **Theme library** (other than next-themes)
   - Reason: next-themes is industry standard
   - No alternatives needed

5. **Settings management library** (react-settings, etc.)
   - Reason: Simple forms + tRPC sufficient
   - No complex state management

## Integration Points

### External APIs

#### Supabase Auth Admin API

**Purpose:** Delete user from Supabase Auth

**Usage:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin key
  { auth: { persistSession: false } }
)

await supabase.auth.admin.deleteUser(userId)
```

**Security:**
- Service role key (server-side only)
- NOT exposed to client
- Use in tRPC protected procedure

**Error Handling:**
- User already deleted: Treat as success
- Network error: Return error to client
- Partial deletion: Log error, manual cleanup

### Internal Integrations

#### Export System ↔ Existing Data Fetching

**Pattern:**
```typescript
// Use existing tRPC list queries
const transactions = await ctx.prisma.transaction.findMany({
  where: { userId: ctx.user.id, /* filters */ },
  include: { category: true, account: true },
})

// Pass to export utility
const csv = generateTransactionCSV(transactions)
```

**Why this works:**
- Reuses existing filter logic
- Same authorization checks
- Consistent data shape

#### Theme System ↔ Tailwind CSS

**Integration:**
```typescript
// ThemeProvider wraps app
<ThemeProvider attribute="class">  {/* Sets .dark class on <html> */}
  <App />
</ThemeProvider>

// Tailwind uses class strategy
// tailwind.config.ts
darkMode: ['class']  // Matches ThemeProvider

// CSS variables auto-switch
:root { /* light */ }
.dark { /* dark */ }
```

**Why this works:**
- ThemeProvider sets class attribute
- Tailwind detects .dark class
- CSS variables cascade automatically

#### Settings Page ↔ Dashboard Sidebar

**Navigation:**
```tsx
// Dashboard sidebar already has settings link
<Link href="/settings">Settings</Link>

// Settings hub page has sections
<Link href="/settings/categories">Categories</Link>  {/* Existing */}
<Link href="/settings/account">Account</Link>        {/* NEW */}
```

**Why this works:**
- Nested routing already established
- Layout component wraps all /settings pages
- Consistent breadcrumb navigation

#### Profile Updates ↔ User Display

**Data flow:**
```
User updates profile → tRPC mutation → Prisma update
   ↓
trpc.users.me.invalidate()  {/* Refetch user data */}
   ↓
Dashboard components re-render with new name
```

**Why this works:**
- React Query cache invalidation
- Optimistic updates possible
- Real-time UI updates

## Risks & Challenges

### Technical Risks

#### Risk 1: Theme Flash on Initial Load

**Impact:** Medium - Users see wrong theme briefly
**Likelihood:** Low with next-themes
**Mitigation:**
- next-themes injects script in <head> before paint
- Uses blocking script (intentional)
- Set defaultTheme="system" for auto-detection

**Testing:**
- Test with slow 3G throttling
- Test in Incognito (no localStorage)
- Verify no flash in production build

#### Risk 2: Large Export File Sizes

**Impact:** Medium - Browser memory issues for >10k rows
**Likelihood:** Low initially (small user data)
**Mitigation:**
- Limit exports to 10,000 rows
- Show warning for large datasets
- Offer date range filters
- Stream to file API (future)

**Current approach:**
```typescript
// Add limit to export queries
const transactions = await ctx.prisma.transaction.findMany({
  where: { userId: ctx.user.id },
  take: 10000, // Hard limit
  orderBy: { date: 'desc' },
})

if (count > 10000) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Export limited to 10,000 records. Please use filters.',
  })
}
```

#### Risk 3: Partial Account Deletion

**Impact:** HIGH - User deleted from Supabase but data remains in Prisma
**Likelihood:** Low
**Mitigation:**
- Delete from Prisma FIRST (cascade handles relationships)
- Then delete from Supabase
- If Supabase deletion fails, user can still sign in and retry
- Log failures for manual cleanup

**Implementation:**
```typescript
deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
  try {
    // 1. Delete from Prisma (cascade deletes all relationships)
    await ctx.prisma.user.delete({ where: { id: ctx.user.id } })
    
    // 2. Delete from Supabase Auth
    const supabase = createClient()
    const { error } = await supabase.auth.admin.deleteUser(ctx.user.supabaseAuthId)
    
    if (error) {
      console.error('Supabase deletion failed:', error)
      // User data already deleted, auth orphaned (acceptable)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Account deletion failed:', error)
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
  }
})
```

### Complexity Risks

#### Risk 1: Export Endpoint Design (Query vs Mutation)

**Issue:** Should exports be queries (GET) or mutations (POST)?

**Considerations:**
- Queries: Cacheable, simpler
- Mutations: Side effects (logging), rate-limiting

**Recommendation:** Use QUERIES
- Exports are read-only operations
- No database changes
- Caching beneficial (same filters = same CSV)
- Rate limiting via tRPC middleware if needed

#### Risk 2: Theme Persistence Across Devices

**Issue:** Theme preference not synced across devices

**Current approach:** localStorage only (device-specific)

**Future enhancement:** Store in database
```typescript
// User model
themePreference?: 'light' | 'dark' | 'system'

// Sync on change
const { setTheme } = useTheme()
const updateTheme = trpc.users.updateTheme.useMutation()

const changeTheme = (theme) => {
  setTheme(theme)            // Local
  updateTheme.mutate(theme)  // Sync to DB
}
```

**Recommendation for Iteration 7:** localStorage only (simpler), DB sync in future

#### Risk 3: Currency Conversion

**Issue:** User changes currency, existing transactions need conversion?

**Recommendation:** 
- Currency is DISPLAY preference only
- Don't convert historical data
- Show amounts in selected currency symbol
- Use exchange rate API in future for conversions

**Current approach:**
```typescript
// Display only
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// NO automatic conversion
// User's responsibility to interpret amounts
```

## Recommendations for Planner

### 1. Prioritize Theme Switching (Quick Win)

**Rationale:** 
- Users expect dark mode in 2025
- Small effort (30 minutes)
- High perceived value
- Already supported by Tailwind config

**Builder Deliverables:**
- Install next-themes
- Update Providers component
- Add dark mode CSS variables
- Create ThemeSwitcher component
- Place in sidebar + settings page

**Critical success factors:**
- No theme flash on load
- System preference detected
- Persists across sessions

**Time:** 30 minutes

### 2. Split Work into Logical Domains

**Builder 1: Export System (60 min)**
- Create src/lib/export/csv.ts (budgets, goals, accounts)
- Create src/lib/export/json.ts (all types)
- Create export.router.ts with 4 endpoints
- Update ExportButton to support all data types
- Test with large datasets

**Builder 2: Settings Page + Profile (50 min)**
- Create /settings/account page structure
- ProfileSection component (name, email display)
- PreferencesSection component (currency, timezone)
- ThemeSection wrapper (uses ThemeSwitcher)
- Backend mutations (updateProfile, updatePreferences)
- Update /settings hub with new link

**Builder 3: Account Deletion (45 min)**
- DangerZone component (multi-step confirmation)
- Email validation + checkbox logic
- Backend deleteAccount mutation
- Supabase admin API integration
- Cascade delete verification
- Post-deletion redirect

**Builder 4: Theme Implementation (30 min)**
- Install next-themes
- Update Providers
- Dark mode CSS variables
- ThemeSwitcher component
- Integration testing

**Total:** ~3 hours (parallelizable)

### 3. Provide Code Snippets for Consistency

**Export Function Template:**
```typescript
export function generate{DataType}CSV(items: {DataType}[]): string {
  const headers = ['Col1', 'Col2', ...]
  const rows = items.map(item => [
    item.field1,
    `"${item.field2.replace(/"/g, '""')}"`, // Escape quotes
    item.field3.toString(),
  ].join(','))
  
  return [headers.join(','), ...rows].join('\n')
}
```

**Export Endpoint Template:**
```typescript
{dataType}: protectedProcedure
  .input(z.object({
    format: z.enum(['csv', 'json']),
    filters: z.object({ /* ... */ }).optional(),
  }))
  .query(async ({ ctx, input }) => {
    const items = await ctx.prisma.{dataType}.findMany({ /* ... */ })
    
    const data = input.format === 'csv' 
      ? generate{DataType}CSV(items)
      : generate{DataType}JSON(items)
    
    return {
      data,
      filename: `{dataType}-${format(new Date(), 'yyyy-MM-dd')}.${input.format}`,
      mimeType: input.format === 'csv' ? 'text/csv' : 'application/json',
    }
  })
```

### 4. Establish Export Limits Early

**Recommendation:**
- Hard limit: 10,000 rows per export
- Show warning at 5,000+ rows
- Encourage date range filtering
- Document in UI

**User messaging:**
```tsx
{count > 5000 && (
  <Alert>
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Large Export</AlertTitle>
    <AlertDescription>
      This export contains {count.toLocaleString()} records. 
      Consider filtering by date range for faster downloads.
    </AlertDescription>
  </Alert>
)}
```

### 5. Design Deletion Flow for Safety

**Multi-step confirmation:**

1. Click "Delete Account" button
2. Modal opens with warning
3. Read data loss details
4. Type email address
5. Check "I understand" checkbox
6. Final "Delete Account" button enabled
7. Deletion executes
8. Redirect to sign in page

**Each step prevents:**
- Misclick (modal)
- Not reading (data loss list)
- Typo (email validation)
- Rushed decision (checkbox)

**Recommendation:** Do NOT simplify this flow - safety > convenience

### 6. Use Existing Patterns Religiously

**Form handling:**
- Copy pattern from TransactionForm
- Use same error handling
- Same toast notifications
- Same loading states

**tRPC mutations:**
- Copy pattern from transactions.router.ts
- Use same authorization checks
- Same error codes
- Same invalidation strategy

**UI components:**
- Use shadcn/ui components (already installed)
- Use sage palette colors
- Use existing button variants
- Use existing spacing scale

**Rationale:** Consistency > innovation for CRUD operations

### 7. Test Account Deletion Thoroughly

**Test cases:**

1. **Happy path:**
   - User deletes account
   - All data removed from Prisma
   - Auth user removed from Supabase
   - Redirect works

2. **Prisma deletion fails:**
   - Error shown to user
   - No Supabase deletion attempted
   - User can retry

3. **Supabase deletion fails:**
   - Prisma data already deleted
   - Error logged (not shown - user data gone anyway)
   - User redirected to sign in

4. **User signs in after deletion:**
   - Supabase allows sign in (orphaned auth)
   - No data in Prisma
   - Onboarding flow starts fresh

**Recommendation:** Manual testing + unit tests for deletion logic

### 8. Document Currency Limitation

**Current limitation:** Currency is display-only, no conversion

**User messaging:**
```tsx
<Alert>
  <Info className="h-4 w-4" />
  <AlertDescription>
    Changing your currency preference updates how amounts are displayed. 
    Existing transaction amounts are not converted.
  </AlertDescription>
</Alert>
```

**Future enhancement:** Exchange rate API integration (not in scope)

**Recommendation:** Set expectations clearly to avoid confusion

## Resource Map

### Critical Files to Create

#### Export System (Builder 1)

**New files:**
- `/home/ahiya/Ahiya/wealth/src/lib/export/csv.ts` - CSV generators for all types
- `/home/ahiya/Ahiya/wealth/src/lib/export/json.ts` - JSON generators for all types
- `/home/ahiya/Ahiya/wealth/src/lib/export/types.ts` - Shared TypeScript interfaces
- `/home/ahiya/Ahiya/wealth/src/server/api/routers/export.router.ts` - tRPC endpoints

**Modified files:**
- `/home/ahiya/Ahiya/wealth/src/components/transactions/ExportButton.tsx` - Generic export button
- `/home/ahiya/Ahiya/wealth/src/server/api/root.ts` - Add export router

#### Settings Page (Builder 2)

**New files:**
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/settings/account/page.tsx` - Settings page
- `/home/ahiya/Ahiya/wealth/src/components/settings/ProfileSection.tsx` - Profile form
- `/home/ahiya/Ahiya/wealth/src/components/settings/PreferencesSection.tsx` - Currency/timezone
- `/home/ahiya/Ahiya/wealth/src/components/settings/ThemeSection.tsx` - Theme switcher wrapper

**Modified files:**
- `/home/ahiya/Ahiya/wealth/src/app/(dashboard)/settings/page.tsx` - Add account link
- `/home/ahiya/Ahiya/wealth/src/server/api/routers/users.router.ts` - Add mutations

#### Account Deletion (Builder 3)

**New files:**
- `/home/ahiya/Ahiya/wealth/src/components/settings/DangerZone.tsx` - Deletion UI

**Modified files:**
- `/home/ahiya/Ahiya/wealth/src/server/api/routers/users.router.ts` - Add deleteAccount mutation
- `/home/ahiya/Ahiya/wealth/src/lib/supabase/admin.ts` - Admin client (NEW)

#### Theme System (Builder 4)

**New files:**
- `/home/ahiya/Ahiya/wealth/src/components/settings/ThemeSwitcher.tsx` - Theme toggle

**Modified files:**
- `/home/ahiya/Ahiya/wealth/src/app/providers.tsx` - Add ThemeProvider
- `/home/ahiya/Ahiya/wealth/src/app/globals.css` - Dark mode variables
- `/home/ahiya/Ahiya/wealth/package.json` - Add next-themes
- `/home/ahiya/Ahiya/wealth/src/components/dashboard/DashboardSidebar.tsx` - Add theme toggle

### Key Dependencies

#### Already Installed (Use As-Is)
- `react-hook-form@7.53.2` - Form handling
- `@hookform/resolvers@3.9.1` - Zod validation
- `zod@3.23.8` - Schema validation
- `@radix-ui/react-alert-dialog@1.1.15` - Confirmation modals
- `date-fns@3.6.0` - Date formatting
- `@supabase/supabase-js@2.58.0` - Auth
- `@prisma/client@5.22.0` - Database

#### To Install (Builder 4)
```bash
npm install next-themes
```

**Version:** ^0.2.1 (latest)
**Size:** 2.8kb gzipped
**Purpose:** Theme switching

### Testing Infrastructure

#### Manual Testing Checklist

**Export System:**
- [ ] Export transactions as CSV (verify format)
- [ ] Export transactions as JSON (verify structure)
- [ ] Export budgets (both formats)
- [ ] Export goals (both formats)
- [ ] Export accounts (both formats)
- [ ] Test with empty data (verify empty file)
- [ ] Test with 1000+ rows (verify performance)
- [ ] Test filename generation (date format)

**Theme Switching:**
- [ ] Toggle light/dark/system
- [ ] Verify no flash on page load
- [ ] Check localStorage persistence
- [ ] Test system preference detection
- [ ] Verify all pages render correctly in dark mode
- [ ] Check color contrast (WCAG AA)

**Account Settings:**
- [ ] Update profile name (save + display)
- [ ] Change currency (verify display update)
- [ ] Change timezone (verify display update)
- [ ] Form validation (required fields)
- [ ] Error handling (network failure)

**Account Deletion:**
- [ ] Open deletion modal
- [ ] Type wrong email (button disabled)
- [ ] Uncheck checkbox (button disabled)
- [ ] Type correct email + check (button enabled)
- [ ] Cancel (modal closes, data preserved)
- [ ] Delete (data removed, redirect works)
- [ ] Verify Prisma data deleted (all relationships)
- [ ] Verify Supabase auth deleted

#### Automated Testing (Optional)

**Unit tests for export utilities:**
```typescript
// src/lib/export/__tests__/csv.test.ts
describe('generateTransactionCSV', () => {
  it('escapes quotes in payee names', () => {
    const txns = [{ payee: 'Joe\'s "Coffee" Shop', ... }]
    const csv = generateTransactionCSV(txns)
    expect(csv).toContain('"Joe\'s ""Coffee"" Shop"')
  })
  
  it('handles empty transactions', () => {
    const csv = generateTransactionCSV([])
    expect(csv).toBe('Date,Payee,Category,Account,Amount,Tags,Notes')
  })
})
```

**Integration tests for deletion:**
```typescript
// src/server/api/routers/__tests__/users.router.test.ts
describe('deleteAccount', () => {
  it('deletes user and all relationships', async () => {
    const user = await createTestUser()
    await createTestTransaction(user.id)
    
    await caller.users.deleteAccount()
    
    const deletedUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(deletedUser).toBeNull()
    
    const orphanedTxns = await prisma.transaction.count({ where: { userId: user.id } })
    expect(orphanedTxns).toBe(0)
  })
})
```

## Questions for Planner

### Technical Decisions

1. **Export Row Limits:** Hard limit at 10k rows or allow unlimited with warning?
   - **Recommendation:** 10k hard limit (prevents browser crashes)

2. **Profile Image Upload:** Include in Iteration 7 or defer to future?
   - **Recommendation:** Defer (adds complexity, needs S3/storage setup)

3. **Theme Preference Sync:** localStorage only or also store in database?
   - **Recommendation:** localStorage for now, DB sync in future iteration

4. **Currency Conversion:** Just display preference or add conversion rates?
   - **Recommendation:** Display only (conversion needs external API)

5. **Export Format:** CSV + JSON or also Excel/PDF?
   - **Recommendation:** CSV + JSON only (Excel needs library, PDF complex)

### Implementation Scope

6. **Deletion Confirmation:** Current 3-step flow or simplify?
   - **Recommendation:** Keep 3-step (safety critical)

7. **Settings Navigation:** Sidebar + settings page or settings page only?
   - **Recommendation:** Both (sidebar for quick access, settings page for discoverability)

8. **Export Location:** Separate /export page or buttons on existing pages?
   - **Recommendation:** Buttons on existing pages (less navigation)

9. **Timezone List:** Full IANA list (400+) or common timezones (10)?
   - **Recommendation:** Common timezones + auto-detect (UX > completeness)

10. **Dark Mode Colors:** Full redesign or auto-invert?
    - **Recommendation:** Full redesign (already have sage palette, just need dark variants)

### Builder Coordination

11. **Export + Settings Builders:** Parallel or sequential?
    - **Recommendation:** Parallel (independent features)

12. **Theme Builder:** When to start?
    - **Recommendation:** First (other builders need dark mode for testing)

13. **Testing Strategy:** Per-builder or batch at end?
    - **Recommendation:** Per-builder (catch issues early)

### Quality & Security

14. **Deletion Audit Log:** Track deletions in separate table?
    - **Recommendation:** Yes for compliance (GDPR right to erasure proof)

15. **Export Rate Limiting:** Prevent abuse (1000 exports/minute)?
    - **Recommendation:** Yes via tRPC middleware (10 exports/minute per user)

16. **Supabase Admin Key:** Environment variable or encrypted config?
    - **Recommendation:** Environment variable (server-side only, never exposed)

## Summary & Builder Task Breakdown

### Estimated Timeline

**Total: ~3 hours**

1. **Builder 1: Theme System** (30 min)
   - Install next-themes
   - Update Providers + dark mode CSS
   - ThemeSwitcher component
   - Integration testing

2. **Builder 2: Export System** (60 min)
   - CSV/JSON generators for budgets, goals, accounts
   - Export router with 4 endpoints
   - Update ExportButton component
   - Testing

3. **Builder 3: Settings Page + Profile** (50 min)
   - /settings/account page
   - Profile + Preferences sections
   - Theme section integration
   - Backend mutations

4. **Builder 4: Account Deletion** (45 min)
   - DangerZone component
   - Multi-step confirmation flow
   - Backend deletion mutation
   - Supabase admin integration

5. **Integration & Testing** (15 min)
   - Dark mode verification
   - Export testing (all formats)
   - Deletion flow testing

### Success Metrics

**Quantitative:**
- [ ] 4 data types × 2 formats = 8 working exports
- [ ] Theme persists across sessions
- [ ] Account deletion removes 100% of user data
- [ ] All settings forms have validation
- [ ] Dark mode color contrast ≥4.5:1 (WCAG AA)

**Qualitative:**
- [ ] Export buttons consistent across all pages
- [ ] Deletion flow feels safe (no anxiety)
- [ ] Theme switch has no visual glitches
- [ ] Settings page organized logically

### Critical Dependencies

```
Builder 1 (Theme) ─┐
                   ├─→ Builder 3 (Settings) ─→ Integration
Builder 2 (Export) ─┤
                   └─→ Builder 4 (Deletion) ─→ Integration
```

**Parallel execution:** Builders 1-4 can work simultaneously
**Blocker:** None (all independent features)

### Key Takeaways

**Leverage existing patterns:**
- CSV export utility already proven
- Form handling patterns established
- tRPC mutation patterns consistent
- UI components (AlertDialog, forms) ready

**Keep it simple:**
- No currency conversion (display only)
- No profile image upload (defer)
- No theme sync to DB (localStorage sufficient)
- No Excel/PDF export (CSV/JSON enough)

**Prioritize safety:**
- Multi-step deletion confirmation
- Email validation required
- Cascade deletes verified
- Audit logging recommended

**Expected user value:**
- Theme switching: Highly requested, low effort
- Data export: Compliance + user control
- Profile management: Expected baseline
- Account deletion: Legal requirement (GDPR/CCPA)

---

**End of Explorer 2 Report - Iteration 7**
