// Default category definitions for Builder-2

export const DEFAULT_CATEGORIES = [
  // Parent categories
  { name: 'Groceries', icon: 'ShoppingCart', color: '#10b981', parent: null },
  { name: 'Dining', icon: 'Utensils', color: '#f59e0b', parent: null },
  { name: 'Transportation', icon: 'Car', color: '#3b82f6', parent: null },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', parent: null },
  { name: 'Entertainment', icon: 'Tv', color: '#8b5cf6', parent: null },
  { name: 'Health', icon: 'Heart', color: '#ef4444', parent: null },
  { name: 'Housing', icon: 'Home', color: '#6b7280', parent: null },
  { name: 'Income', icon: 'DollarSign', color: '#10b981', parent: null },
  { name: 'Miscellaneous', icon: 'MoreHorizontal', color: '#9ca3af', parent: null },

  // Child categories
  { name: 'Restaurants', icon: 'Store', color: '#f59e0b', parent: 'Dining' },
  { name: 'Coffee', icon: 'Coffee', color: '#f59e0b', parent: 'Dining' },
  { name: 'Gas', icon: 'Fuel', color: '#3b82f6', parent: 'Transportation' },
  { name: 'Public Transit', icon: 'Bus', color: '#3b82f6', parent: 'Transportation' },
  { name: 'Subscriptions', icon: 'CreditCard', color: '#8b5cf6', parent: 'Entertainment' },
  { name: 'Utilities', icon: 'Zap', color: '#6b7280', parent: 'Housing' },
  { name: 'Salary', icon: 'Briefcase', color: '#10b981', parent: 'Income' },
] as const

export type DefaultCategory = typeof DEFAULT_CATEGORIES[number]

// ============================================================================
// CURRENCY - NIS ONLY
// ============================================================================
// Wealth uses NIS (Israeli Shekel) exclusively for production MVP
// All amounts are stored and displayed in NIS (₪)

export const CURRENCY_CODE = 'NIS' as const
export const CURRENCY_SYMBOL = '₪' as const
export const CURRENCY_NAME = 'Israeli Shekel' as const
