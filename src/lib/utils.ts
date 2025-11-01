import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format amount as NIS currency
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "1,234.56 ₪")
 */
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} ₪`
}

/**
 * Get NIS currency symbol
 * @returns "₪"
 */
export function getCurrencySymbol(): string {
  return '₪'
}
