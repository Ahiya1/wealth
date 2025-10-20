// src/components/budgets/MonthSelector.tsx
'use client'

import { format, addMonths, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSelectorProps {
  selectedMonth: string // YYYY-MM format
  onMonthChange: (month: string) => void
}

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const [year, month] = selectedMonth.split('-').map(Number)
  const currentDate = new Date(year || 0, (month || 1) - 1)

  const handlePreviousMonth = () => {
    const prevMonth = subMonths(currentDate, 1)
    onMonthChange(format(prevMonth, 'yyyy-MM'))
  }

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentDate, 1)
    onMonthChange(format(nextMonth, 'yyyy-MM'))
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    onMonthChange(format(now, 'yyyy-MM'))
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return selectedMonth === format(now, 'yyyy-MM')
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousMonth}
          className="border-sage-200 hover:bg-sage-50 hover:text-sage-700 focus:ring-sage-500"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </Button>
        <h2 className="text-2xl font-serif font-bold text-warm-gray-900">{format(currentDate, 'MMMM yyyy')}</h2>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          className="border-sage-200 hover:bg-sage-50 hover:text-sage-700 focus:ring-sage-500"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>
      {!isCurrentMonth() && (
        <Button
          variant="outline"
          onClick={handleCurrentMonth}
          className="border-sage-200 hover:bg-sage-50 hover:text-sage-700 focus:ring-sage-500"
        >
          Current Month
        </Button>
      )}
    </div>
  )
}
