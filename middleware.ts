import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Middleware for protected routes with Supabase Auth
 *
 * Validates user session and handles redirects for authenticated/unauthenticated users
 * Enforces admin-only access for /admin routes via role checking
 */
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
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Protect other authenticated routes
  const protectedPaths = ['/accounts', '/transactions', '/budgets', '/goals', '/analytics', '/settings', '/account']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && isProtectedPath) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Admin route protection (requires authentication + ADMIN role)
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check authentication first
    if (!user) {
      const redirectUrl = new URL('/signin', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Fetch Prisma user to check role (lean query - only select role field)
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseAuthId: user.id },
      select: { id: true, role: true }
    })

    // Redirect non-admin users to dashboard with error
    if (!prismaUser || prismaUser.role !== 'ADMIN') {
      const redirectUrl = new URL('/dashboard', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(redirectUrl)
    }

    // Log admin access in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[Admin Access]', {
        userId: prismaUser.id,
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString()
      })
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (
    request.nextUrl.pathname === '/signin' ||
    request.nextUrl.pathname === '/signup'
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/accounts/:path*',
    '/transactions/:path*',
    '/budgets/:path*',
    '/goals/:path*',
    '/analytics/:path*',
    '/settings/:path*',
    '/account/:path*',
    '/admin/:path*',
    '/signin',
    '/signup',
  ],
}
