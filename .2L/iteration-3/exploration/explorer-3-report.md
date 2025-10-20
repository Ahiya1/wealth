# Explorer 3 Report: Technical Dependencies & Integration Patterns

## Executive Summary

Iteration 3 requires transitioning from NextAuth to Supabase Auth, implementing beautiful UI with framer-motion animations, and enhancing typography with Google Fonts. Key findings: (1) Supabase Auth integration is straightforward with @supabase/supabase-js v2.58.0 and @supabase/auth-ui-react v0.4.7, (2) framer-motion v12.23.22 provides production-ready animation capabilities, (3) Next.js 14 native font optimization already in use (Inter), can easily add Crimson Pro serif font, (4) Additional shadcn/ui components needed: tooltip, hover-card, avatar, scroll-area, sonner, (5) No major peer dependency conflicts identified, (6) Testing strategy requires both auth flow testing and UI component testing.

---

## Discoveries

### Current Dependency State

**Existing Core Dependencies:**
- Next.js: ^14.2.33 (React 18.3.1, React-DOM 18.3.1)
- @supabase/supabase-js: NOT INSTALLED (need to add)
- next-auth: 5.0.0-beta.25 (will replace with Supabase Auth)
- framer-motion: NOT INSTALLED (need to add)
- Recharts: 2.12.7 (already installed for charts)
- Tailwind CSS: 3.4.1
- shadcn/ui: 18 components already installed

**Current shadcn/ui Components (18 total):**
1. badge.tsx
2. select.tsx
3. dialog.tsx
4. skeleton.tsx
5. toast.tsx
6. alert-dialog.tsx
7. popover.tsx
8. dropdown-menu.tsx
9. separator.tsx
10. progress.tsx
11. tabs.tsx
12. card.tsx
13. button.tsx
14. calendar.tsx
15. input.tsx
16. label.tsx
17. textarea.tsx
18. use-toast.tsx (hook)

**Current Font Setup:**
- Inter (Google Font) via next/font/google - Already configured in layout.tsx
- No serif font currently installed
- Tailwind config uses HSL color variables

**Missing Dependencies for Iteration 3:**
1. @supabase/supabase-js (core Supabase client)
2. @supabase/auth-ui-react (pre-built auth UI components)
3. @supabase/auth-ui-shared (theme utilities)
4. framer-motion (animations)
5. Additional shadcn/ui components (tooltip, hover-card, avatar, scroll-area, sonner)

### Supabase Infrastructure Status

**Local Supabase Setup (From Explorer 1 Report):**
- Supabase CLI installed as devDependency (v1.226.4)
- Local Supabase running on Docker
- Database connection via pgBouncer (port 54322)
- Direct connection (port 5432)
- Supabase Studio available (port 54323)

**Current Database Configuration:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

**Supabase Environment Variables (Already in .env.example):**
```bash
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="<get from: npx supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<get from: npx supabase status>"
```

**Note:** Supabase local infrastructure is ready. Just need to install client libraries and implement auth integration.

---

## Dependency Analysis & Versions

### 1. Supabase Auth Stack

#### @supabase/supabase-js

**Latest Version:** 2.58.0 (as of January 2025)

**Purpose:** Core Supabase JavaScript client for auth, database, storage, realtime

**Installation:**
```bash
npm install @supabase/supabase-js@^2.58.0
```

**Size:** ~50KB minified + gzipped

**Features Needed:**
- Auth methods (signUp, signInWithPassword, signInWithOAuth)
- Session management (getSession, onAuthStateChange)
- Password reset flows
- Magic link (passwordless) authentication
- OAuth provider configuration

**Compatibility:**
- React 18.x: ✅ Fully compatible
- Next.js 14.x: ✅ Works with App Router
- Server Components: ✅ Can create client in server components
- Client Components: ✅ Can create client in client components

**Integration Pattern:**
```typescript
// lib/supabase/client.ts (Client-side)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (Server-side)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

**Important:** Supabase v2 uses @supabase/ssr package for Next.js integration, which provides createBrowserClient and createServerClient helpers.

**Additional Dependency:**
```bash
npm install @supabase/ssr@^0.5.2
```

#### @supabase/auth-ui-react

**Latest Version:** 0.4.7

**Purpose:** Pre-built React components for authentication UI

**Installation:**
```bash
npm install @supabase/auth-ui-react@^0.4.7
```

**Size:** ~30KB minified + gzipped

**Components Provided:**
- `<Auth />` - Complete auth form (sign in/up/magic link/oauth)
- Pre-styled with customizable themes
- Handles all auth flows automatically
- Form validation built-in

**Integration Pattern:**
```tsx
'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const supabase = createClient()
  
  return (
    <Auth
      supabaseClient={supabase}
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: 'hsl(142, 76%, 36%)', // Sage green
              brandAccent: 'hsl(142, 76%, 30%)',
            },
          },
        },
      }}
      providers={['google', 'github']}
      redirectTo="http://localhost:3000/dashboard"
    />
  )
}
```

**Customization Options:**
- Theme customization (colors, fonts, spacing)
- Show/hide providers
- Custom labels and messages
- CSS class overrides

**Compatibility:**
- React 18.x: ✅ Fully compatible
- Next.js 14 App Router: ✅ Works (must be client component)
- Tailwind CSS: ✅ Can style with custom classes

#### @supabase/auth-ui-shared

**Latest Version:** 0.1.8

**Purpose:** Shared theme utilities for auth-ui-react

**Installation:**
```bash
npm install @supabase/auth-ui-shared@^0.1.8
```

**Size:** ~5KB minified + gzipped

**Themes Provided:**
- ThemeSupa (default Supabase theme)
- ThemeMinimal (minimalist theme)
- Custom theme builder utilities

**Usage:**
```typescript
import { ThemeSupa } from '@supabase/auth-ui-shared'
```

**Compatibility:**
- Peer dependency of @supabase/auth-ui-react
- No standalone usage needed

### 2. Animation Library

#### framer-motion

**Latest Version:** 12.23.22

**Purpose:** Production-ready animation library for React

**Installation:**
```bash
npm install framer-motion@^12.23.22
```

**Size:** ~150KB minified + gzipped

**Key Features Needed for Iteration 3:**
1. **Page Transitions** - Smooth route changes
2. **Card Animations** - Hover effects, lift, glow
3. **Button Interactions** - Scale, shimmer effects
4. **Form Feedback** - Shake on error, checkmark on success
5. **Chart Animations** - Draw in, count-up numbers
6. **Loading States** - Pulsing, skeleton loaders
7. **Success Celebrations** - Confetti, particle effects

**Compatibility:**
- React 18.x: ✅ Fully compatible
- Next.js 14.x: ✅ Works with App Router
- Server Components: ⚠️ Must wrap in 'use client' directive
- TypeScript: ✅ Full TypeScript support

**Integration Patterns:**

**Pattern 1: Page Transitions**
```tsx
'use client'
import { motion } from 'framer-motion'

export default function Page() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page content */}
    </motion.div>
  )
}
```

**Pattern 2: Card Hover Effects**
```tsx
<motion.div
  whileHover={{ scale: 1.02, y: -4 }}
  transition={{ type: 'spring', stiffness: 300 }}
  className="card"
>
  {/* Card content */}
</motion.div>
```

**Pattern 3: Button Interactions**
```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  whileHover={{ scale: 1.05 }}
>
  Click me
</motion.button>
```

**Pattern 4: Number Count-Up (for currency)**
```tsx
import { motion, useSpring, useTransform } from 'framer-motion'

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 100, damping: 30 })
  const display = useTransform(spring, (current) => 
    Math.round(current).toLocaleString()
  )
  
  return <motion.span>{display}</motion.span>
}
```

**Pattern 5: Shake on Error**
```tsx
const shake = {
  x: [0, -10, 10, -10, 10, 0],
  transition: { duration: 0.5 }
}

<motion.div animate={hasError ? shake : {}}>
  <Input error={error} />
</motion.div>
```

**Pattern 6: Confetti/Celebration**
```tsx
import { motion } from 'framer-motion'

function Confetti() {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: -100, opacity: 0 }}
      transition={{ duration: 1, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: '#FFD700',
        borderRadius: '50%',
      }}
    />
  )
}
```

**Performance Considerations:**
- Use `layout` prop sparingly (expensive)
- Prefer `whileHover` over CSS :hover (better performance)
- Use `useReducedMotion` hook for accessibility
- Avoid animating expensive properties (use transform/opacity)

**Accessibility:**
```tsx
import { useReducedMotion } from 'framer-motion'

function Component() {
  const shouldReduceMotion = useReducedMotion()
  
  return (
    <motion.div
      animate={{ 
        opacity: 1, 
        y: shouldReduceMotion ? 0 : 20 
      }}
    >
      {/* Content */}
    </motion.div>
  )
}
```

### 3. Typography & Fonts

#### next/font (Built into Next.js 14)

**Current Status:** Already using Inter font in layout.tsx

**No Installation Required** - Built into Next.js 14

**Current Setup:**
```typescript
// src/app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
```

**Iteration 3 Requirement:** Add Crimson Pro serif font for headlines

**Integration Pattern:**
```typescript
// src/app/layout.tsx
import { Inter, Crimson_Pro } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const crimsonPro = Crimson_Pro({ 
  subsets: ['latin'],
  variable: '--font-crimson',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${crimsonPro.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
```

**Tailwind Config Update:**
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-crimson)', 'serif'],
      },
    },
  },
}
```

**Usage in Components:**
```tsx
<h1 className="font-serif text-4xl">Headline with Crimson Pro</h1>
<p className="font-sans text-base">Body text with Inter</p>
```

**Benefits of next/font:**
- Automatic font optimization
- Self-hosted fonts (no external requests)
- Zero layout shift (font metrics calculated at build time)
- Subset optimization (only includes characters used)
- Preloading support

**Considerations:**
- Font files included in build output (~100-200KB per font family)
- Build time slightly increased (font generation)
- First load slightly slower (more JS to parse)
- Trade-off: Worth it for performance and UX

### 4. Additional Component Library Dependencies

#### shadcn/ui Components to Add

Based on Iteration 3 requirements, need to install these additional shadcn/ui components:

**1. Tooltip**
```bash
npx shadcn-ui@latest add tooltip
```
**Purpose:** Hover explanations for icons, budget status, etc.
**Usage:** Account cards, transaction categories, budget progress
**Size:** ~5KB

**2. Hover Card**
```bash
npx shadcn-ui@latest add hover-card
```
**Purpose:** Rich hover previews (e.g., hover account to see details)
**Usage:** Dashboard cards, navigation items
**Size:** ~8KB

**3. Avatar**
```bash
npx shadcn-ui@latest add avatar
```
**Purpose:** User profile images, initials fallback
**Usage:** Header, settings, user menu
**Size:** ~3KB

**4. Scroll Area**
```bash
npx shadcn-ui@latest add scroll-area
```
**Purpose:** Custom scrollbars for lists (transactions, categories)
**Usage:** Transaction list, category list, sidebar
**Size:** ~10KB

**5. Sonner (Toast Notifications)**
```bash
npx shadcn-ui@latest add sonner
```
**Purpose:** Better toast notifications than current toast.tsx
**Usage:** Success messages, error alerts, confirmations
**Size:** ~15KB
**Note:** Replaces current toast implementation

**Total Added Size:** ~41KB (negligible)

#### Component Dependencies

All shadcn/ui components depend on:
- @radix-ui/* primitives (already installed for existing components)
- class-variance-authority (already installed)
- clsx (already installed)
- tailwind-merge (already installed)

**No new dependencies required** - shadcn/ui components are just copied into src/components/ui/

### 5. Chart Library (Already Satisfied)

**Recharts 2.12.7** - Already installed

**Purpose:** Data visualization for analytics page

**No changes needed** - Will just style with new color palette

**Integration with framer-motion:**
```tsx
import { motion } from 'framer-motion'
import { LineChart, Line } from 'recharts'

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.2 }}
>
  <LineChart data={data}>
    <Line 
      type="monotone" 
      dataKey="value" 
      stroke="hsl(142, 76%, 36%)"
      strokeWidth={2}
    />
  </LineChart>
</motion.div>
```

---

## Supabase Auth Integration Patterns

### Pattern 1: Client-Side Auth (Browser)

**Use Case:** Sign in/up forms, OAuth flows, client-side session checks

**Setup:**
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Usage in Sign In Form:**
```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh() // Refresh server components
    }
  }

  return (
    <form onSubmit={handleSignIn}>
      {/* Form fields */}
    </form>
  )
}
```

### Pattern 2: Server-Side Auth (Route Handlers, Server Components)

**Use Case:** Protected routes, API endpoints, server-side session validation

**Setup:**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

**Usage in Server Component:**
```tsx
// app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/signin')
  }

  return <div>Welcome {user.email}</div>
}
```

### Pattern 3: Middleware Protection (Protected Routes)

**Use Case:** Protect entire route groups, redirect unauthenticated users

**Setup:**
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/signin' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/signin', '/signup']
}
```

### Pattern 4: Session Context Provider

**Use Case:** Make session available to all client components

**Setup:**
```tsx
// components/auth/SessionProvider.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const SessionContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <SessionContext.Provider value={{ user, loading }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
```

**Usage in Components:**
```tsx
'use client'
import { useSession } from '@/components/auth/SessionProvider'

export function UserProfile() {
  const { user, loading } = useSession()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not signed in</div>
  
  return <div>Hello {user.email}</div>
}
```

### Pattern 5: OAuth Integration (Google, GitHub)

**Setup in Supabase Dashboard:**
1. Enable Google provider
2. Add OAuth credentials
3. Set redirect URL: http://localhost:3000/auth/callback

**Client-Side OAuth Flow:**
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'

export function OAuthButtons() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button onClick={signInWithGoogle}>
      Sign in with Google
    </button>
  )
}
```

**Callback Route Handler:**
```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

### Pattern 6: Magic Link (Passwordless) Authentication

**Client-Side:**
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (!error) setSent(true)
  }

  if (sent) {
    return <div>Check your email for the magic link!</div>
  }

  return (
    <form onSubmit={sendMagicLink}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
      />
      <button type="submit">Send Magic Link</button>
    </form>
  )
}
```

### Pattern 7: Password Reset Flow

**Request Reset:**
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function sendResetEmail(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    
    if (!error) setSent(true)
  }

  return (
    <form onSubmit={sendResetEmail}>
      {/* Form */}
    </form>
  )
}
```

**Reset Password Page:**
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({
      password,
    })
    
    if (!error) {
      router.push('/dashboard')
    }
  }

  return (
    <form onSubmit={updatePassword}>
      {/* Form */}
    </form>
  )
}
```

### Pattern 8: tRPC Context Integration

**Replace NextAuth with Supabase in tRPC Context:**

**Before (NextAuth):**
```typescript
// src/server/api/trpc.ts
import { auth } from '@/lib/auth'

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth()
  return {
    session,
    prisma,
  }
}
```

**After (Supabase):**
```typescript
// src/server/api/trpc.ts
import { createClient } from '@/lib/supabase/server'

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return {
    user, // Supabase user object
    supabase,
    prisma,
  }
}

// Protected procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { user: ctx.user } })
})
```

**Important:** Update all tRPC routers to use `ctx.user` instead of `ctx.session`

---

## Animation Library Setup

### framer-motion Installation & Configuration

**Step 1: Install**
```bash
npm install framer-motion@^12.23.22
```

**Step 2: Create Animation Utilities**
```typescript
// lib/animations.ts
import { Variants } from 'framer-motion'

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

// Card animations
export const cardHover = {
  scale: 1.02,
  y: -4,
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
}

export const cardTap = {
  scale: 0.98,
}

// Button animations
export const buttonHover = {
  scale: 1.05,
}

export const buttonTap = {
  scale: 0.95,
}

// Form feedback
export const shakeAnimation = {
  x: [0, -10, 10, -10, 10, 0],
  transition: { duration: 0.5 },
}

export const successCheck = {
  pathLength: [0, 1],
  transition: { duration: 0.5, ease: 'easeInOut' },
}

// Number count-up
export const numberSpring = {
  stiffness: 100,
  damping: 30,
}

// Stagger children
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}
```

**Step 3: Create Reusable Animated Components**
```tsx
// components/animations/AnimatedCard.tsx
'use client'
import { motion } from 'framer-motion'
import { cardHover, cardTap } from '@/lib/animations'
import { Card } from '@/components/ui/card'

export function AnimatedCard({ children, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <motion.div
      whileHover={cardHover}
      whileTap={cardTap}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card {...props}>{children}</Card>
    </motion.div>
  )
}
```

```tsx
// components/animations/AnimatedButton.tsx
'use client'
import { motion } from 'framer-motion'
import { buttonHover, buttonTap } from '@/lib/animations'
import { Button } from '@/components/ui/button'

export function AnimatedButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <motion.div whileHover={buttonHover} whileTap={buttonTap}>
      <Button {...props}>{children}</Button>
    </motion.div>
  )
}
```

```tsx
// components/animations/PageTransition.tsx
'use client'
import { motion } from 'framer-motion'
import { pageVariants, pageTransition } from '@/lib/animations'

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}
```

**Step 4: Accessibility Setup**
```tsx
// lib/animations.ts (add this)
import { useReducedMotion } from 'framer-motion'

export function useAnimationConfig() {
  const shouldReduceMotion = useReducedMotion()
  
  return {
    animate: !shouldReduceMotion,
    transition: shouldReduceMotion 
      ? { duration: 0 }
      : { type: 'spring', stiffness: 300, damping: 30 },
  }
}
```

**Step 5: Number Count-Up Utility**
```tsx
// components/animations/AnimatedNumber.tsx
'use client'
import { motion, useSpring, useTransform, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  format?: (n: number) => string
}

export function AnimatedNumber({ 
  value, 
  format = (n) => n.toLocaleString() 
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  
  const spring = useSpring(0, { stiffness: 100, damping: 30 })
  const display = useTransform(spring, (current) => format(Math.round(current)))

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, value, spring])

  return <motion.span ref={ref}>{display}</motion.span>
}
```

**Usage Example:**
```tsx
<AnimatedNumber 
  value={netWorth} 
  format={(n) => `$${n.toLocaleString()}`} 
/>
```

---

## Typography & Font Integration

### Google Fonts Setup with Next.js 14

**Current State:** Inter font already configured in layout.tsx

**Iteration 3 Addition:** Crimson Pro serif font for headlines

**Implementation:**

**Step 1: Update Layout**
```typescript
// src/app/layout.tsx
import { Inter, Crimson_Pro } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const crimsonPro = Crimson_Pro({ 
  subsets: ['latin'],
  variable: '--font-crimson',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${crimsonPro.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
```

**Step 2: Update Tailwind Config**
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-crimson)', 'Georgia', 'serif'],
      },
    },
  },
}
```

**Step 3: Typography Utility Classes**
```css
/* src/app/globals.css (add these) */
.text-headline-1 {
  @apply font-serif text-5xl font-semibold leading-tight;
}

.text-headline-2 {
  @apply font-serif text-4xl font-semibold leading-snug;
}

.text-headline-3 {
  @apply font-serif text-3xl font-medium leading-snug;
}

.text-body-lg {
  @apply font-sans text-lg leading-relaxed;
}

.text-body {
  @apply font-sans text-base leading-relaxed;
}

.text-body-sm {
  @apply font-sans text-sm leading-normal;
}
```

**Step 4: Usage in Components**
```tsx
// Dashboard header
<h1 className="text-headline-2 text-gray-900">
  Welcome back, {user.name}
</h1>

<p className="text-body text-gray-600 mt-2">
  "Your conscious relationship with money begins here"
</p>

// Section headings
<h2 className="text-headline-3 text-gray-800">
  Recent Transactions
</h2>

// Body text
<p className="text-body-sm text-gray-500">
  Last updated 5 minutes ago
</p>
```

**Performance Considerations:**
- Inter + Crimson Pro = ~200-300KB total (compressed)
- Self-hosted (no external requests to Google Fonts)
- Preloaded automatically by Next.js
- No layout shift (font metrics calculated at build)

**Font Loading Strategy:**
- `display: 'swap'` - Show fallback, then swap to custom font
- Prevents FOIT (flash of invisible text)
- Ensures text always visible

---

## Component Library Dependencies

### shadcn/ui Additional Components

**Installation Commands:**

```bash
# 1. Tooltip
npx shadcn-ui@latest add tooltip

# 2. Hover Card
npx shadcn-ui@latest add hover-card

# 3. Avatar
npx shadcn-ui@latest add avatar

# 4. Scroll Area
npx shadcn-ui@latest add scroll-area

# 5. Sonner (replaces toast)
npx shadcn-ui@latest add sonner
```

**Usage Patterns:**

**1. Tooltip (for icons and hints)**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button className="icon-button">
        <InfoIcon />
      </button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Your budget is 85% spent this month</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**2. Hover Card (for rich previews)**
```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

<HoverCard>
  <HoverCardTrigger asChild>
    <a href="/accounts/123">Checking Account</a>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Chase Checking</h4>
      <p className="text-sm">Balance: $5,234.50</p>
      <p className="text-xs text-muted-foreground">Last transaction: 2 hours ago</p>
    </div>
  </HoverCardContent>
</HoverCard>
```

**3. Avatar (for user profiles)**
```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

<Avatar>
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
</Avatar>
```

**4. Scroll Area (for lists)**
```tsx
import { ScrollArea } from '@/components/ui/scroll-area'

<ScrollArea className="h-[400px] w-full rounded-md border p-4">
  {transactions.map((tx) => (
    <TransactionItem key={tx.id} transaction={tx} />
  ))}
</ScrollArea>
```

**5. Sonner (toast notifications)**
```tsx
import { toast } from 'sonner'

// Success
toast.success('Budget created successfully!')

// Error
toast.error('Failed to save transaction')

// With action
toast.message('Transaction deleted', {
  action: {
    label: 'Undo',
    onClick: () => undoDelete(),
  },
})
```

**Setup Sonner in Layout:**
```tsx
// src/app/layout.tsx
import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
```

---

## Testing Strategy

### 1. Auth Flow Testing

**Test Suite 1: Email/Password Authentication**

**Test Cases:**
- [ ] Sign up with email/password creates user in database
- [ ] Email verification email sent (if enabled)
- [ ] Sign in with valid credentials succeeds
- [ ] Sign in with invalid credentials fails with error message
- [ ] Session persists across page reloads
- [ ] Sign out clears session
- [ ] Protected routes redirect to sign in
- [ ] Authenticated users redirected from auth pages to dashboard

**Manual Testing:**
1. Navigate to /signup
2. Fill form with test credentials
3. Submit and verify redirect to dashboard
4. Check Supabase dashboard for new user record
5. Sign out and navigate to /signin
6. Sign in with same credentials
7. Verify dashboard loads with user data
8. Refresh page and verify session persists
9. Sign out and try to access /dashboard
10. Verify redirect to /signin

**Test Suite 2: OAuth Authentication**

**Test Cases:**
- [ ] Google OAuth button redirects to Google
- [ ] OAuth callback creates user in database
- [ ] OAuth callback redirects to dashboard
- [ ] User can sign in with Google multiple times
- [ ] OAuth account linked to existing email if matches

**Manual Testing:**
1. Navigate to /signin
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify redirect to dashboard
5. Check Supabase dashboard for user record
6. Sign out and sign in with Google again
7. Verify immediate redirect to dashboard

**Test Suite 3: Magic Link (Passwordless)**

**Test Cases:**
- [ ] Magic link email sent to provided email
- [ ] Clicking magic link signs in user
- [ ] Magic link redirect goes to dashboard
- [ ] Expired magic link shows error message

**Manual Testing:**
1. Navigate to /signin
2. Click "Sign in with magic link"
3. Enter email and submit
4. Check email for magic link
5. Click link and verify redirect to dashboard
6. Check Supabase dashboard for session

**Test Suite 4: Password Reset**

**Test Cases:**
- [ ] Password reset email sent
- [ ] Reset link goes to reset password page
- [ ] New password can be set
- [ ] Sign in works with new password
- [ ] Old password no longer works

**Manual Testing:**
1. Navigate to /forgot-password
2. Enter email and submit
3. Check email for reset link
4. Click link and go to reset page
5. Enter new password and submit
6. Sign in with new password
7. Verify old password fails

### 2. UI Component Testing

**Test Suite 5: Animation Testing**

**Test Cases:**
- [ ] Page transitions smooth and complete
- [ ] Card hover effects trigger on hover
- [ ] Button animations trigger on click
- [ ] Number count-up animates from 0 to value
- [ ] Reduced motion respected (prefers-reduced-motion)
- [ ] Animations don't block interactions

**Manual Testing:**
1. Navigate between pages and check transitions
2. Hover over cards and check lift effect
3. Click buttons and check tap animation
4. Load dashboard and watch numbers count up
5. Enable reduced motion in OS settings
6. Verify animations disabled or simplified

**Performance Testing:**
- [ ] 60fps maintained during animations
- [ ] No layout shift during animation
- [ ] Animation doesn't block other interactions

**Test Suite 6: Typography Testing**

**Test Cases:**
- [ ] Serif font loads for headlines
- [ ] Sans-serif font loads for body text
- [ ] Font weights render correctly (400, 500, 600, 700)
- [ ] No FOIT (flash of invisible text)
- [ ] No layout shift on font load
- [ ] Fallback fonts readable

**Manual Testing:**
1. Load page with network throttling
2. Verify text visible immediately (fallback)
3. Watch for font swap (should be smooth)
4. Check headlines use Crimson Pro
5. Check body text uses Inter
6. Verify font weights render correctly

**Test Suite 7: Component Library Testing**

**Test Cases:**
- [ ] Tooltip appears on hover
- [ ] Hover card shows rich content
- [ ] Avatar displays image or fallback
- [ ] Scroll area scrolls smoothly
- [ ] Sonner toasts appear and dismiss
- [ ] All components accessible (keyboard nav)

**Manual Testing:**
1. Hover over info icons → tooltip appears
2. Hover over account links → hover card with details
3. Check user avatar in header
4. Scroll transaction list → custom scrollbar
5. Trigger success/error actions → toast notifications
6. Tab through components → keyboard navigation works

### 3. Integration Testing

**Test Suite 8: Supabase + tRPC Integration**

**Test Cases:**
- [ ] tRPC context receives Supabase user
- [ ] Protected procedures require authentication
- [ ] Unauthenticated requests return UNAUTHORIZED
- [ ] User data available in all procedures
- [ ] Session refresh works after expiry

**Manual Testing:**
1. Sign in and open browser DevTools
2. Navigate to dashboard (triggers tRPC calls)
3. Check Network tab for /api/trpc requests
4. Verify all requests return 200 OK
5. Sign out and try to access protected route
6. Verify 401 UNAUTHORIZED response

**Test Suite 9: Auth + Database Integration**

**Test Cases:**
- [ ] User sign up creates Prisma User record
- [ ] User ID from Supabase matches Prisma user.id
- [ ] Accounts linked to correct user
- [ ] Transactions linked to correct user
- [ ] Budgets linked to correct user

**Manual Testing:**
1. Sign up new user
2. Open Prisma Studio (npx prisma studio)
3. Check User table has new record
4. Create account, transaction, budget
5. Verify all records have correct userId
6. Sign in as different user
7. Verify only see own data

### 4. Automated Testing

**Vitest Unit Tests:**

```typescript
// __tests__/supabase-client.test.ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@/lib/supabase/client'

describe('Supabase Client', () => {
  it('creates client with correct config', () => {
    const client = createClient()
    expect(client).toBeDefined()
  })
})
```

**Playwright E2E Tests:**

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('sign up flow', async ({ page }) => {
    await page.goto('http://localhost:3000/signup')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('sign in flow', async ({ page }) => {
    await page.goto('http://localhost:3000/signin')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('protected route redirects when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
    await expect(page).toHaveURL(/\/signin/)
  })
})
```

---

## Potential Conflicts & Resolutions

### 1. NextAuth vs Supabase Auth Conflict

**Issue:** Both NextAuth and Supabase Auth try to manage sessions

**Impact:** HIGH - Session conflicts, duplicate auth flows

**Resolution:**
1. **Remove NextAuth completely** from dependencies
2. Remove `src/lib/auth.ts` (NextAuth config)
3. Remove `src/app/api/auth/[...nextauth]/route.ts`
4. Update all imports from NextAuth to Supabase
5. Update tRPC context to use Supabase user
6. Update middleware to use Supabase session

**Migration Checklist:**
- [ ] Uninstall next-auth: `npm uninstall next-auth`
- [ ] Remove NextAuth config files
- [ ] Update tRPC context
- [ ] Update middleware
- [ ] Update all auth pages
- [ ] Test all auth flows
- [ ] Migrate existing user sessions (if production)

**Code Changes:**
```bash
# Remove NextAuth
npm uninstall next-auth @auth/prisma-adapter

# Install Supabase
npm install @supabase/supabase-js @supabase/ssr @supabase/auth-ui-react @supabase/auth-ui-shared
```

### 2. React 18 Hydration with framer-motion

**Issue:** framer-motion animations can cause hydration mismatches in SSR

**Impact:** MEDIUM - Console warnings, potential layout shifts

**Resolution:**
1. Always use 'use client' directive in animated components
2. Use `useEffect` to trigger animations after mount
3. Avoid animating during SSR

**Pattern:**
```tsx
'use client'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function AnimatedComponent() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return <div>Loading...</div> // Static SSR
  }
  
  return (
    <motion.div animate={{ opacity: 1 }}>
      {/* Animated content */}
    </motion.div>
  )
}
```

### 3. Tailwind CSS Class Conflicts with shadcn/ui

**Issue:** New color palette might conflict with existing shadcn/ui components

**Impact:** LOW - Some components may need restyling

**Resolution:**
1. Update Tailwind config with new color palette
2. Test all existing shadcn/ui components
3. Override colors in components as needed

**Updated Tailwind Config:**
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Keep existing shadcn/ui colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        // Add Iteration 3 colors
        sage: {
          50: '#f6f7f6',
          100: '#e3e8e3',
          200: '#c7d1c7',
          300: '#a3b4a3',
          400: '#7d947d',
          500: '#5f7a5f',
          600: '#4a614a',
          700: '#3d4f3d',
          800: '#2f3e2f',
          900: '#1f2b1f',
        },
        // ... other colors
      },
    },
  },
}
```

### 4. Font Loading Performance

**Issue:** Loading two font families increases initial load time

**Impact:** LOW - ~300KB additional bandwidth

**Resolution:**
1. Use `display: 'swap'` to prevent FOIT
2. Preload fonts in `<head>`
3. Use font subsetting (only Latin characters)
4. Consider loading Crimson Pro only on pages with headlines

**Optimization:**
```typescript
const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-crimson',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'serif'],
})
```

### 5. Animation Performance on Low-End Devices

**Issue:** Complex animations may drop below 60fps on mobile

**Impact:** MEDIUM - Poor UX on slower devices

**Resolution:**
1. Use `will-change` sparingly
2. Animate only transform and opacity (GPU-accelerated)
3. Reduce motion on mobile
4. Implement `useReducedMotion` hook

**Optimization:**
```tsx
import { useReducedMotion } from 'framer-motion'

function Component() {
  const shouldReduceMotion = useReducedMotion()
  
  return (
    <motion.div
      animate={{ 
        opacity: 1,
        y: shouldReduceMotion ? 0 : 20, // Disable y animation if reduced motion
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
      }}
    >
      {/* Content */}
    </motion.div>
  )
}
```

### 6. Supabase Auth UI Customization Limitations

**Issue:** @supabase/auth-ui-react has limited styling options

**Impact:** MEDIUM - May not match exact design requirements

**Resolution:**
1. Use `appearance` prop for basic theming
2. Override with CSS custom properties
3. Build custom auth forms if UI too restrictive

**Custom Styling:**
```tsx
<Auth
  supabaseClient={supabase}
  appearance={{
    theme: ThemeSupa,
    variables: {
      default: {
        colors: {
          brand: 'hsl(142, 76%, 36%)',
          brandAccent: 'hsl(142, 76%, 30%)',
        },
        fonts: {
          bodyFontFamily: 'var(--font-inter)',
          buttonFontFamily: 'var(--font-inter)',
          inputFontFamily: 'var(--font-inter)',
          labelFontFamily: 'var(--font-inter)',
        },
        radii: {
          borderRadiusButton: '0.5rem',
          buttonBorderRadius: '0.5rem',
          inputBorderRadius: '0.5rem',
        },
      },
    },
    className: {
      container: 'my-custom-container',
      button: 'my-custom-button',
    },
  }}
/>
```

**Alternative:** Build custom forms with Supabase client directly

### 7. Environment Variable Naming

**Issue:** Supabase requires NEXT_PUBLIC_ prefix for client-side access

**Impact:** LOW - Just configuration

**Resolution:**
Add to .env.local:
```bash
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key>"
SUPABASE_SERVICE_ROLE_KEY="<service role key>" # Server-only
```

**Important:** NEVER expose service role key to client

---

## Recommendations for Planner

### 1. Prioritize NextAuth to Supabase Migration (CRITICAL)

**Rationale:** This is the foundation. All auth flows depend on it. Can't build new UI until auth works.

**Estimated Time:** 2-3 hours

**Tasks:**
1. Remove NextAuth (30 min)
2. Install Supabase packages (15 min)
3. Create Supabase client utilities (30 min)
4. Update tRPC context (30 min)
5. Update middleware (30 min)
6. Test all auth flows (45 min)

**Builder Split:** Single builder can handle this sequentially

### 2. Install All Dependencies First

**Rationale:** Avoid mid-task version conflicts. Get all packages installed and verified compatible.

**Command:**
```bash
npm install \
  @supabase/supabase-js@^2.58.0 \
  @supabase/ssr@^0.5.2 \
  @supabase/auth-ui-react@^0.4.7 \
  @supabase/auth-ui-shared@^0.1.8 \
  framer-motion@^12.23.22

# Remove NextAuth
npm uninstall next-auth @auth/prisma-adapter

# Add shadcn/ui components
npx shadcn-ui@latest add tooltip hover-card avatar scroll-area sonner
```

**Estimated Time:** 15-20 minutes

### 3. Implement Font Changes Early

**Rationale:** Foundation for all UI work. Typography affects every page.

**Estimated Time:** 30 minutes

**Tasks:**
1. Update layout.tsx with Crimson Pro (10 min)
2. Update tailwind.config.ts (5 min)
3. Add typography utility classes (10 min)
4. Test on sample page (5 min)

**Builder Split:** Can be done in parallel with auth migration

### 4. Create Animation Utilities Before Component Work

**Rationale:** Standardized animations. Builders can use predefined utilities instead of re-implementing.

**Estimated Time:** 1 hour

**Tasks:**
1. Create lib/animations.ts (30 min)
2. Create reusable animated components (30 min)
3. Document usage patterns (included in report)

**Builder Split:** Single builder creates utilities, then others use them

### 5. Test Auth Integration Thoroughly Before UI Work

**Rationale:** No point building beautiful UI if auth doesn't work. Blocking dependency.

**Test Checklist:**
- [ ] Sign up works
- [ ] Sign in works
- [ ] Session persists
- [ ] Protected routes work
- [ ] tRPC context has user
- [ ] Middleware redirects correctly

**Estimated Time:** 30-45 minutes

### 6. Use Supabase Auth UI for Initial Implementation

**Rationale:** Faster to use pre-built components. Can customize later if needed.

**Recommendation:**
- Phase 1: Use @supabase/auth-ui-react with custom theming
- Phase 2 (if needed): Build custom forms with Supabase client

**Estimated Time:** 
- With Auth UI: 1 hour
- Custom forms: 3-4 hours

**Decision:** Start with Auth UI, assess if customization sufficient

### 7. Implement Color Palette Update Separately

**Rationale:** Big visual change. Test thoroughly before deploying to all pages.

**Approach:**
1. Update tailwind.config.ts with new colors
2. Update globals.css with new CSS variables
3. Test on one page (dashboard)
4. Roll out to all pages

**Estimated Time:** 2-3 hours

**Builder Split:** Single builder for consistency

### 8. Create Component Testing Checklist

**Rationale:** Ensure quality. Each builder tests their work before PR.

**Checklist:**
- [ ] Component renders without errors
- [ ] Animations smooth (60fps)
- [ ] Keyboard navigation works
- [ ] Reduced motion respected
- [ ] Colors match design
- [ ] Typography correct
- [ ] Responsive on mobile

**Estimated Time:** 10 minutes per component

### 9. Document Integration Patterns in README

**Rationale:** Team consistency. Future developers need clear patterns.

**Documentation Sections:**
- How to create Supabase client (browser vs server)
- How to use animated components
- How to apply typography styles
- How to use new color palette
- How to test auth flows

**Estimated Time:** 1 hour

**Builder Split:** Documentation builder (can be same as planner)

### 10. Consider Feature Flags for Risky Changes

**Rationale:** Iteration 3 has big changes (auth migration, UI redesign). Feature flags allow gradual rollout.

**Recommendation:**
```typescript
// lib/features.ts
export const features = {
  useSupabaseAuth: process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true',
  useNewDesign: process.env.NEXT_PUBLIC_USE_NEW_DESIGN === 'true',
  useAnimations: process.env.NEXT_PUBLIC_USE_ANIMATIONS === 'true',
}
```

**Usage:**
```tsx
import { features } from '@/lib/features'

function AuthPage() {
  if (features.useSupabaseAuth) {
    return <SupabaseAuthForm />
  }
  return <NextAuthForm />
}
```

**Estimated Time:** 30 minutes to set up

---

## Resource Map

### Critical Files to Create

**1. Supabase Client Files**
- `/home/ahiya/Ahiya/wealth/src/lib/supabase/client.ts` - Browser client
- `/home/ahiya/Ahiya/wealth/src/lib/supabase/server.ts` - Server client
- `/home/ahiya/Ahiya/wealth/src/lib/supabase/middleware.ts` - Middleware helper

**2. Animation Utilities**
- `/home/ahiya/Ahiya/wealth/src/lib/animations.ts` - Animation constants and hooks
- `/home/ahiya/Ahiya/wealth/src/components/animations/AnimatedCard.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/animations/AnimatedButton.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/animations/PageTransition.tsx`
- `/home/ahiya/Ahiya/wealth/src/components/animations/AnimatedNumber.tsx`

**3. Auth Components**
- `/home/ahiya/Ahiya/wealth/src/components/auth/SessionProvider.tsx` - Session context
- `/home/ahiya/Ahiya/wealth/src/app/(auth)/signin/page.tsx` - Updated with Supabase
- `/home/ahiya/Ahiya/wealth/src/app/(auth)/signup/page.tsx` - Updated with Supabase
- `/home/ahiya/Ahiya/wealth/src/app/auth/callback/route.ts` - OAuth callback

**4. Middleware**
- `/home/ahiya/Ahiya/wealth/middleware.ts` - Update to use Supabase

### Critical Files to Modify

**1. Layout and Configuration**
- `/home/ahiya/Ahiya/wealth/src/app/layout.tsx` - Add Crimson Pro font
- `/home/ahiya/Ahiya/wealth/tailwind.config.ts` - Add new colors and fonts
- `/home/ahiya/Ahiya/wealth/src/app/globals.css` - Add typography classes

**2. tRPC Integration**
- `/home/ahiya/Ahiya/wealth/src/server/api/trpc.ts` - Update context to use Supabase
- All router files - Update to use `ctx.user` instead of `ctx.session`

**3. Environment Variables**
- `/home/ahiya/Ahiya/wealth/.env.example` - Add Supabase public variables

### Dependencies to Install

**Package Installations:**
```bash
# Core Supabase
npm install @supabase/supabase-js@^2.58.0
npm install @supabase/ssr@^0.5.2
npm install @supabase/auth-ui-react@^0.4.7
npm install @supabase/auth-ui-shared@^0.1.8

# Animations
npm install framer-motion@^12.23.22

# Remove NextAuth
npm uninstall next-auth @auth/prisma-adapter

# shadcn/ui components (CLI commands)
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add hover-card
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add sonner
```

**Total Installation Time:** ~5 minutes (depending on network)

### Testing Infrastructure

**Test Files to Create:**
```
__tests__/
├── supabase/
│   ├── client.test.ts
│   └── auth.test.ts
├── animations/
│   ├── animated-number.test.ts
│   └── use-animation-config.test.ts
e2e/
├── auth.spec.ts
├── animations.spec.ts
└── ui-components.spec.ts
```

**Test Commands:**
```bash
# Unit tests
npm run test

# E2E tests
npx playwright test

# Visual regression tests (optional)
npx playwright test --update-snapshots
```

### Documentation to Update

**1. README.md**
- Add Supabase setup instructions
- Document new auth flows
- Explain animation utilities
- Typography usage guide

**2. CONTRIBUTING.md**
- Component creation guidelines
- Animation best practices
- Accessibility requirements

**3. .env.example**
- Add Supabase variables with explanations

---

## Questions for Planner

### 1. Should we migrate existing NextAuth users to Supabase?

**Context:** If production users exist with NextAuth sessions, they need migration.

**Options:**
- A) Fresh start - All users re-register with Supabase
- B) Migrate user data - Copy user records, invalidate sessions
- C) Dual auth - Support both during transition period

**Recommendation:** If no production users, Option A. If production users exist, Option B.

### 2. Should Supabase Auth UI be customized or use default theme?

**Context:** @supabase/auth-ui-react provides pre-built components but limited customization.

**Options:**
- A) Use Supabase Auth UI with custom theming (faster, less code)
- B) Build custom forms with Supabase client (full control, more work)
- C) Hybrid - Use Auth UI for OAuth, custom forms for email/password

**Recommendation:** Option A for initial implementation. Can migrate to Option B if customization insufficient.

### 3. How aggressive should animations be?

**Context:** Design requirements mention "smooth animations" but don't specify intensity.

**Options:**
- A) Subtle - Fade/slide transitions only (fast, performant)
- B) Moderate - Hover effects, page transitions, number count-up
- C) Heavy - Confetti, particle effects, complex choreography

**Recommendation:** Option B. Save Option C for milestone celebrations only.

### 4. Should we implement dark mode in Iteration 3?

**Context:** Requirements don't mention dark mode, but Tailwind config has `darkMode: ['class']`.

**Options:**
- A) Skip dark mode - Focus on light mode only
- B) Add dark mode - Implement full dark theme
- C) Dark mode foundation - Set up structure, implement later

**Recommendation:** Option A. Dark mode is significant scope creep. Add in future iteration.

### 5. Should we use server or client components for auth pages?

**Context:** Supabase can work in both server and client components.

**Options:**
- A) Server components - Better performance, SSR
- B) Client components - Easier auth state management
- C) Hybrid - Server components with client islands

**Recommendation:** Option B for auth pages (need client-side auth state). Option C for dashboard (server components with client auth checks).

### 6. How should we handle existing user sessions during migration?

**Context:** Switching from NextAuth to Supabase invalidates existing sessions.

**Options:**
- A) Hard cutover - All users signed out, must sign in again
- B) Session migration - Attempt to preserve sessions (complex)
- C) Gradual migration - Support both auth systems temporarily

**Recommendation:** Option A. Clean break. Communicate to users before migration.

### 7. Should we add animation presets or let builders create custom animations?

**Context:** Could provide more animation utilities or let builders be creative.

**Options:**
- A) Strict presets - All animations use predefined utilities
- B) Creative freedom - Builders implement animations as needed
- C) Presets + custom - Utilities for common cases, custom for unique

**Recommendation:** Option C. Provide utilities (page transitions, hovers, etc.) but allow custom animations for complex interactions.

---

## Summary

Iteration 3 focuses on three major technical areas:

### 1. Supabase Auth Migration (HIGH PRIORITY)
- Replace NextAuth with @supabase/supabase-js v2.58.0
- Use @supabase/auth-ui-react v0.4.7 for UI components
- Update tRPC context and middleware
- Test all auth flows thoroughly
- **Estimated Time:** 2-3 hours

### 2. Animation Implementation (MEDIUM PRIORITY)
- Install framer-motion v12.23.22
- Create animation utilities
- Implement page transitions, hover effects, number count-up
- Respect reduced motion preference
- **Estimated Time:** 2-3 hours

### 3. Typography & UI Enhancement (MEDIUM PRIORITY)
- Add Crimson Pro serif font via next/font
- Update color palette in Tailwind config
- Install additional shadcn/ui components
- Apply new design system across pages
- **Estimated Time:** 3-4 hours

**Total Estimated Time:** 7-10 hours

**Key Success Factors:**
1. Complete auth migration first (blocking dependency)
2. Install all dependencies upfront (avoid mid-task conflicts)
3. Create reusable utilities (animations, typography)
4. Test incrementally (auth, then UI, then animations)
5. Document patterns for team consistency

**Risks:**
- NextAuth to Supabase migration could reveal unexpected issues
- Animation performance on low-end devices
- Color palette changes might require extensive component updates
- Auth UI customization limitations

**Mitigation:**
- Thorough testing at each phase
- Performance profiling with Chrome DevTools
- Feature flags for risky changes
- Fallback to custom forms if Auth UI insufficient

---

**Report Complete** - Ready for planner integration.
