// src/components/goals/GoalProgressChart.tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface GoalProgressChartProps {
  currentAmount: number
  targetAmount: number
  projectedDate: Date | null
  targetDate: Date
}

export function GoalProgressChart({
  currentAmount,
  targetAmount,
  projectedDate,
  targetDate: _targetDate,
}: GoalProgressChartProps) {
  // Create data points for the chart
  const data = [
    {
      date: 'Today',
      amount: currentAmount,
    },
    {
      date: projectedDate ? 'Projected' : 'Target',
      amount: targetAmount,
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
          contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
        />
        <ReferenceLine
          y={targetAmount}
          stroke="hsl(142, 76%, 36%)"
          strokeDasharray="5 5"
          label="Target"
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth={3}
          dot={{ fill: 'hsl(217, 91%, 60%)', r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
