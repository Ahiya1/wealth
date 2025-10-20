'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  PieChart,
  Target,
  BarChart3,
  Settings,
  Shield,
  User,
  LogOut,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardSidebarProps {
  user: SupabaseUser
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: userData } = trpc.users.me.useQuery()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const navigationItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Accounts',
      href: '/accounts',
      icon: Wallet,
    },
    {
      title: 'Transactions',
      href: '/transactions',
      icon: Receipt,
    },
    {
      title: 'Budgets',
      href: '/budgets',
      icon: PieChart,
    },
    {
      title: 'Goals',
      href: '/goals',
      icon: Target,
    },
    {
      title: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ]

  // Add admin link conditionally
  if (userData?.role === 'ADMIN') {
    navigationItems.push({
      title: 'Admin',
      href: '/admin',
      icon: Shield,
    })
  }

  return (
    <aside className="w-64 bg-white dark:bg-warm-gray-900 border-r border-warm-gray-200 dark:border-warm-gray-700 min-h-screen flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-warm-gray-200 dark:border-warm-gray-700">
        <h1 className="text-2xl font-bold text-sage-600 dark:text-sage-400">Wealth</h1>
        <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mt-1">
          Mindful Money Management
        </p>
      </div>

      {/* Demo Mode Badge */}
      {userData?.isDemoUser && (
        <div className="mx-4 mt-4 rounded-lg border border-gold/30 dark:border-gold-600/30 bg-gold/10 dark:bg-gold-900/20 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-gold-700 dark:text-gold-400">
            <Info className="h-3 w-3" />
            Demo Mode
          </p>
          <p className="mt-1 text-xs text-warm-gray-600 dark:text-warm-gray-400">
            Showing sample data
          </p>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                'hover:bg-sage-50 dark:hover:bg-sage-900/30',
                isActive
                  ? 'bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 font-medium'
                  : 'text-warm-gray-700 dark:text-warm-gray-300'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section with Avatar Dropdown */}
      <div className="p-4 border-t border-warm-gray-200 dark:border-warm-gray-700">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sage-50 dark:hover:bg-sage-900/30 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 font-semibold">
                {userData?.email?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm truncate text-warm-gray-900 dark:text-warm-gray-100">
                  {userData?.name || 'User'}
                </p>
                <p className="text-xs text-warm-gray-600 dark:text-warm-gray-400 truncate">
                  {userData?.email || user.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/account" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Overview
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/profile" className="cursor-pointer">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/membership" className="cursor-pointer">
                Membership
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/security" className="cursor-pointer">
                Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={signingOut}
              className="cursor-pointer text-terracotta-600 dark:text-terracotta-400 focus:text-terracotta-600 dark:focus:text-terracotta-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
