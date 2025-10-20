// src/components/goals/CompletedGoalCelebration.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { type Goal } from '@prisma/client'
import { PartyPopper } from 'lucide-react'
import { motion } from 'framer-motion'
import { successBounce } from '@/lib/animations'

interface CompletedGoalCelebrationProps {
  goal: Goal
  open: boolean
  onClose: () => void
}

export function CompletedGoalCelebration({ goal, open, onClose }: CompletedGoalCelebrationProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center space-y-6 py-6">
          <div className="flex justify-center">
            <motion.div {...successBounce} className="rounded-full bg-sage-50 p-6">
              <PartyPopper className="h-16 w-16 text-sage-600" />
            </motion.div>
          </div>

          <DialogHeader>
            <DialogTitle className="text-3xl text-center">
              Congratulations!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-lg text-muted-foreground">You&apos;ve completed your goal:</p>
            <p className="text-2xl font-bold text-primary">{goal.name}</p>
            <p className="text-xl text-muted-foreground">
              {formatCurrency(Number(goal.targetAmount))} achieved!
            </p>
          </div>

          <div className="rounded-lg bg-sage-50 p-4">
            <p className="text-sm text-sage-700 leading-relaxed">
              Great work on reaching your goal! This is a significant achievement.
              Keep up the momentum with your next financial goal!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
