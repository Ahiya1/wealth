'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { getPageTransition } from '@/lib/animations'
import { DURATION } from '@/lib/animations'

interface PageTransitionProps {
  children: React.ReactNode
  duration?: 'normal' | 'slow'
}

export function PageTransition({ children, duration = 'normal' }: PageTransitionProps) {
  const reducedMotion = useReducedMotion()

  const durationValue = duration === 'slow' ? DURATION.slow : DURATION.normal
  const animation = getPageTransition(reducedMotion, durationValue)

  return <motion.div {...animation}>{children}</motion.div>
}
