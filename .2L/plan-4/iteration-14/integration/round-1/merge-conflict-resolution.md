# Merge Conflict Resolution Guide

**File:** `src/app/(dashboard)/layout.tsx`
**Status:** MANUAL MERGE REQUIRED
**Risk:** MEDIUM
**Time Estimate:** 5 minutes

---

## Conflict Overview

Both Builder-1 and Builder-2 modified the same file:
- **Builder-1:** Added bottom padding clearance for bottom nav
- **Builder-2:** Added import and BottomNavigation component

**Both changes are needed and compatible.**

---

## Current File State (Before Integration)

You need to check the current state of the file before merging. It might have:
- Just the original code (no builder changes yet)
- Builder-1's changes only (if integrated first)
- Builder-2's changes only (unlikely)

---

## Required Changes

### Change 1: Add Import (Builder-2)

**Location:** Top of file, after other imports

**Add this line:**
```typescript
import { BottomNavigation } from '@/components/mobile/BottomNavigation'
```

**Full import section should look like:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { OnboardingTrigger } from '@/components/onboarding/OnboardingTrigger'
import { cn } from '@/lib/utils'
import { BottomNavigation } from '@/components/mobile/BottomNavigation' // ← ADD THIS
```

---

### Change 2: Add Bottom Padding (Builder-1)

**Location:** Main container div className

**Find this line (approximately line 28):**
```typescript
<div className={cn(
  "container mx-auto px-4 py-8 max-w-7xl",
  "pt-16 lg:pt-8",
  // ... existing classes
)}>
```

**Change to:**
```typescript
<div className={cn(
  "container mx-auto px-4 py-8 max-w-7xl",
  "pt-16 lg:pt-8",
  "pb-24 lg:pb-8", // ← ADD THIS LINE
)}>
```

---

### Change 3: Add BottomNavigation Component (Builder-2)

**Location:** After the closing `</div>` of the flex container, before the final closing `</div>`

**Add this component:**
```typescript
{/* Bottom navigation (mobile only) */}
<BottomNavigation />
```

---

## Complete Merged File Template

**Use this as reference for the final structure:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { OnboardingTrigger } from '@/components/onboarding/OnboardingTrigger'
import { cn } from '@/lib/utils'
import { BottomNavigation } from '@/components/mobile/BottomNavigation' // ← CHANGE 1

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-warm-gray-50 dark:bg-warm-gray-950">
      <OnboardingTrigger />
      <div className="flex">
        <DashboardSidebar user={user} />

        <main className="flex-1 overflow-auto w-full lg:w-auto">
          <div className={cn(
            "container mx-auto px-4 py-8 max-w-7xl",
            "pt-16 lg:pt-8",
            "pb-24 lg:pb-8", // ← CHANGE 2: Bottom clearance for bottom nav
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom navigation (mobile only) */}
      <BottomNavigation /> {/* ← CHANGE 3: Bottom nav component */}
    </div>
  )
}
```

---

## Verification Steps

After merging, verify:

### 1. Import Statement
```bash
# Check that import is present
grep "import { BottomNavigation }" src/app/\(dashboard\)/layout.tsx
```

**Expected output:**
```
import { BottomNavigation } from '@/components/mobile/BottomNavigation'
```

### 2. Bottom Padding
```bash
# Check that pb-24 lg:pb-8 is present
grep "pb-24 lg:pb-8" src/app/\(dashboard\)/layout.tsx
```

**Expected output:**
```
"pb-24 lg:pb-8",
```

### 3. Component Rendering
```bash
# Check that BottomNavigation component is rendered
grep "<BottomNavigation />" src/app/\(dashboard\)/layout.tsx
```

**Expected output:**
```
<BottomNavigation />
```

### 4. Component Position
**Critical:** BottomNavigation must be OUTSIDE the flex container.

**File structure should be:**
```
<div className="min-h-screen">
  <OnboardingTrigger />
  <div className="flex">         ← Flex container starts
    <DashboardSidebar />
    <main>
      <div>
        {children}
      </div>
    </main>
  </div>                          ← Flex container ends
  <BottomNavigation />            ← Bottom nav OUTSIDE flex container
</div>
```

**Why this matters:**
- Bottom nav needs `position: fixed` to work
- If inside flex container, fixed positioning breaks
- Must be outside to properly overlay content

---

## TypeScript Compilation Check

After merging, verify the file compiles:

```bash
npx tsc --noEmit src/app/\(dashboard\)/layout.tsx
```

**Expected output:** No errors

If you see errors like:
- "Cannot find module '@/components/mobile/BottomNavigation'" → Zone 3 not integrated yet
- "Property 'pb-24' is not defined" → Zone 1 not integrated yet

**Solution:** Ensure Zone 1 and Zone 3 are integrated before Zone 4.

---

## Visual Testing

After integration, test the merged file:

### Test 1: Mobile View (<768px)
```
1. npm run dev
2. Open http://localhost:3000/dashboard
3. Resize browser to 375px width
4. Bottom nav should be visible at bottom
5. Bottom nav should have 5 tabs (Dashboard, Transactions, Budgets, Goals, More)
```

**Expected:** Bottom nav visible, properly positioned

### Test 2: Desktop View (≥1280px)
```
1. Keep dev server running
2. Resize browser to 1280px width
3. Bottom nav should be hidden (lg:hidden)
4. Sidebar should be visible on left
```

**Expected:** Bottom nav hidden, sidebar visible

### Test 3: Bottom Clearance
```
1. Resize to 375px width (mobile)
2. Scroll to bottom of dashboard page
3. Verify last content is not hidden behind bottom nav
4. Should have ~96px clearance (pb-24)
```

**Expected:** No content hidden, proper clearance

### Test 4: Scroll to Top
```
1. On mobile (375px)
2. Scroll down the page
3. Scroll back to top
4. Bottom nav should be visible at all times
```

**Expected:** Bottom nav always visible (will add scroll-hide in later iteration)

---

## Common Mistakes to Avoid

### Mistake 1: Wrong Component Position
**Wrong:**
```typescript
<div className="flex">
  <DashboardSidebar />
  <main>
    {children}
    <BottomNavigation /> {/* ← WRONG: Inside main */}
  </main>
</div>
```

**Correct:**
```typescript
<div className="flex">
  <DashboardSidebar />
  <main>
    {children}
  </main>
</div>
<BottomNavigation /> {/* ← CORRECT: Outside flex */}
```

### Mistake 2: Missing Import
**Symptom:** TypeScript error "BottomNavigation is not defined"
**Fix:** Add import statement at top of file

### Mistake 3: Missing Bottom Padding
**Symptom:** Last content hidden behind bottom nav
**Fix:** Add `pb-24 lg:pb-8` to main container

### Mistake 4: Wrong Padding Value
**Wrong:** `pb-20 lg:pb-8` (not enough clearance)
**Correct:** `pb-24 lg:pb-8` (96px clearance on mobile)

---

## Rollback Plan

If merge goes wrong:

### Option 1: Revert File
```bash
git checkout HEAD -- src/app/\(dashboard\)/layout.tsx
```

### Option 2: Manual Fix
Read this guide again and carefully apply all 3 changes in order.

---

## Integration Dependencies

**This zone (Zone 4) depends on:**
- Zone 1: Foundation must be integrated first (for Tailwind utilities)
- Zone 3: Bottom nav components must exist (for import to resolve)

**Integration order:**
1. Zone 1 (Foundation) ✅
2. Zone 2 (UI Primitives) ✅
3. Zone 3 (Bottom Nav) ✅
4. **Zone 4 (Layout Merge)** ← YOU ARE HERE
5. Zone 5 (Page Layouts)

**Do not integrate Zone 4 until Zones 1 and 3 are complete.**

---

## Success Checklist

After merge, verify:
- [ ] Import statement added
- [ ] Bottom padding added (pb-24 lg:pb-8)
- [ ] BottomNavigation component added
- [ ] Component is outside flex container
- [ ] TypeScript compiles with no errors
- [ ] Bottom nav visible on mobile (<768px)
- [ ] Bottom nav hidden on desktop (≥1280px)
- [ ] Last content not hidden behind nav
- [ ] File follows mobile-first patterns

---

**Merge Status:** READY TO EXECUTE
**Complexity:** MEDIUM
**Time Required:** 5 minutes
**Risk:** LOW (with this guide)

Integrator: Follow this guide exactly and the merge will succeed.
