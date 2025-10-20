'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EncouragingProgressProps {
  percentage: number
  spent: number
  budget: number
  className?: string
}

export function EncouragingProgress({
  percentage,
  spent,
  budget,
  className,
}: EncouragingProgressProps) {
  const getVariant = () => {
    if (percentage < 50) return 'excellent'
    if (percentage < 75) return 'good'
    if (percentage < 90) return 'approaching'
    if (percentage < 100) return 'nearLimit'
    return 'attention'
  }

  const variant = getVariant()

  const variantStyles = {
    excellent: 'from-sage-400 to-sage-600',
    good: 'from-sage-300 to-sage-500',
    approaching: 'from-gold/50 to-gold',
    nearLimit: 'from-gold/60 to-gold/90',
    attention: 'from-coral/30 to-coral/60',
  }

  const getMessage = () => {
    if (percentage < 50) return 'Great start! 🌱'
    if (percentage < 75) return "You're doing well!"
    if (percentage < 90) return 'Almost there!'
    if (percentage < 100) return 'Excellent progress!'
    return 'Time to review this budget'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-warm-gray-600">{getMessage()}</span>
        <span className="font-medium tabular-nums text-warm-gray-700">
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-warm-gray-100">
        <motion.div
          className={cn(
            'h-full rounded-full bg-gradient-to-r',
            variantStyles[variant]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <p className="text-xs text-warm-gray-500 tabular-nums">
        ${spent.toFixed(2)} of ${budget.toFixed(2)}
      </p>
    </div>
  )
}
