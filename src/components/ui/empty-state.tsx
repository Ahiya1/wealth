'use client'

import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="rounded-full bg-sage-50 dark:bg-sage-900 p-6 mb-4">
        <Icon className="h-12 w-12 text-sage-500 dark:text-sage-400" />
      </div>
      <h3 className="text-lg font-serif font-semibold text-warm-gray-900 dark:text-warm-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-warm-gray-600 dark:text-warm-gray-400 max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  )
}
