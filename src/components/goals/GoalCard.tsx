// src/components/goals/GoalCard.tsx
'use client'

import { type Account, type Goal } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { PiggyBank, TrendingDown, TrendingUp, Edit, Trash2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { celebrationAnimation, cardHoverElevated } from '@/lib/animations'

interface GoalWithAccount extends Goal {
  linkedAccount: Account | null
}

interface GoalCardProps {
  goal: GoalWithAccount
  onEdit: () => void
  onDelete: () => void
}

const GOAL_TYPE_CONFIG = {
  SAVINGS: {
    icon: PiggyBank,
    label: 'Savings Goal',
    bgColor: 'bg-sage-50',
    iconColor: 'text-sage-600',
  },
  DEBT_PAYOFF: {
    icon: TrendingDown,
    label: 'Debt Payoff',
    bgColor: 'bg-warm-gray-50',
    iconColor: 'text-warm-gray-600',
  },
  INVESTMENT: {
    icon: TrendingUp,
    label: 'Investment Goal',
    bgColor: 'bg-sky/10',
    iconColor: 'text-sky',
  },
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const config = GOAL_TYPE_CONFIG[goal.type]
  const Icon = config.icon

  const currentAmount = Number(goal.currentAmount)
  const targetAmount = Number(goal.targetAmount)
  const percentComplete = Math.min((currentAmount / targetAmount) * 100, 100)
  const remaining = targetAmount - currentAmount
  const daysRemaining = differenceInDays(goal.targetDate, new Date())

  const getEncouragingMessage = () => {
    if (goal.isCompleted) return 'Congratulations! Goal achieved!'
    if (percentComplete >= 90) return 'Almost there! Keep going!'
    if (percentComplete >= 75) return "You're on track!"
    if (percentComplete >= 50) return 'Great progress!'
    if (percentComplete >= 25) return 'Off to a good start!'
    return 'Every step counts!'
  }

  const getStatusText = () => {
    if (goal.isCompleted) return 'Completed'
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)} days past target`
    if (daysRemaining === 0) return 'Target date is today'
    if (daysRemaining < 30) return `${daysRemaining} days left`
    return `${daysRemaining} days remaining`
  }

  const getStatusColor = () => {
    if (goal.isCompleted) return 'text-sage-600'
    if (daysRemaining < 30) return 'text-warm-gray-600'
    if (daysRemaining < 0) return 'text-coral'
    return 'text-warm-gray-500'
  }

  return (
    <motion.div {...cardHoverElevated}>
      <Card className="relative hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`rounded-lg p-2 ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">
                <Link
                  href={`/goals/${goal.id}`}
                  className="hover:underline text-warm-gray-900"
                >
                  {goal.name}
                </Link>
              </CardTitle>
              <p className="text-sm text-warm-gray-600">{config.label}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4 text-warm-gray-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-warm-gray-600" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Ring */}
        <div className="flex items-center justify-center py-4">
          <div className="relative">
            <ProgressRing percentage={percentComplete} size={120} strokeWidth={8} />
          </div>
        </div>

        {/* Amounts */}
        <div className="text-center space-y-1">
          <p className="text-sm text-warm-gray-600">
            {formatCurrency(currentAmount)} of {formatCurrency(targetAmount)}
          </p>
          <p className="text-xs text-warm-gray-500">
            {remaining > 0 ? `${formatCurrency(remaining)} remaining` : 'Target reached!'}
          </p>
        </div>

        {/* Encouraging Message */}
        {goal.isCompleted ? (
          <motion.div
            {...celebrationAnimation}
            className="rounded-lg bg-gradient-to-br from-sage-50 to-warm-gray-50 border-sage-200 border p-3 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-sage-600" />
              <p className="font-serif text-lg font-semibold text-sage-700">
                {getEncouragingMessage()}
              </p>
            </div>
            <p className="text-xs text-warm-gray-600">
              Completed on {format(goal.completedAt || new Date(), 'MMM d, yyyy')}
            </p>
          </motion.div>
        ) : (
          <div className="rounded-lg bg-sage-50 p-3 text-center">
            <p className="text-sm font-serif font-semibold text-sage-700">
              {getEncouragingMessage()}
            </p>
          </div>
        )}

        {/* Target Date and Status */}
        <div className="flex items-center justify-between text-sm border-t pt-3">
          <div>
            <p className="text-xs text-warm-gray-500">Target Date</p>
            <p className="font-semibold text-warm-gray-700">
              {format(goal.targetDate, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            {goal.linkedAccount && (
              <Badge variant="outline" className="text-xs mt-1 border-sage-200">
                {goal.linkedAccount.name}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  )
}
