/**
 * Mobile Navigation Configuration
 *
 * Centralized configuration for bottom navigation and more sheet items.
 * This file defines the navigation structure for mobile devices.
 */

import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Calendar,
  BarChart3,
  Wallet,
  Settings,
  Shield,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  href: string
  icon: LucideIcon
  label: string
  requiresAdmin?: boolean
}

/**
 * Primary bottom navigation tabs (5 items max)
 * These appear directly in the bottom navigation bar
 */
export const primaryNavItems: NavigationItem[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/transactions',
    icon: Receipt,
    label: 'Transactions',
  },
  {
    href: '/budgets',
    icon: PieChart,
    label: 'Budgets',
  },
  {
    href: '/goals',
    icon: Target,
    label: 'Goals',
  },
]

/**
 * Overflow navigation items (shown in More sheet)
 * These appear when user taps "More" button
 */
export const overflowNavItems: NavigationItem[] = [
  {
    href: '/recurring',
    icon: Calendar,
    label: 'Recurring Transactions',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
  {
    href: '/accounts',
    icon: Wallet,
    label: 'Accounts',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  },
  {
    href: '/admin',
    icon: Shield,
    label: 'Admin',
    requiresAdmin: true,
  },
]

/**
 * Check if a navigation item is active based on current pathname
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname.startsWith(href)
}

/**
 * Check if any overflow item is active (for More button highlighting)
 */
export function isOverflowActive(pathname: string): boolean {
  return overflowNavItems.some((item) => isNavItemActive(pathname, item.href))
}

/**
 * Z-Index Hierarchy (for reference)
 *
 * z-100: Toasts (highest priority, never blocked)
 * z-50:  Modals, Dialogs, Dropdowns, Mobile hamburger button
 * z-45:  Bottom Navigation (NEW - between nav and modals)
 * z-40:  Sidebar overlay (mobile)
 * z-10:  Elevated cards, local dropdowns
 * z-0:   Main content (default)
 */
export const Z_INDEX = {
  TOAST: 100,
  MODAL: 50,
  BOTTOM_NAV: 45,
  SIDEBAR_OVERLAY: 40,
  ELEVATED: 10,
  CONTENT: 0,
} as const
