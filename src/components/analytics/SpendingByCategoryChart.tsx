'use client'

import { memo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { CATEGORY_COLORS } from '@/lib/chartColors'
import { useChartDimensions } from '@/hooks/useChartDimensions'

interface SpendingByCategoryChartProps {
  data: { category: string; amount: number; color?: string }[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
  }>
}

export const SpendingByCategoryChart = memo(function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
  const { height, hidePieLabels } = useChartDimensions()

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-warm-gray-500">
        No spending data available
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload?.length) return null

    const entry = payload[0]!
    const formatted = Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-warm-gray-700">
          {entry.name}
        </p>
        <p className="text-lg font-bold text-sage-600 tabular-nums">
          {formatted} ₪
        </p>
        <p className="text-xs text-warm-gray-500">
          {((entry.value / data.reduce((sum, item) => sum + item.amount, 0)) * 100).toFixed(1)}%
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={!hidePieLabels}
          label={!hidePieLabels ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : false}
          outerRadius={hidePieLabels ? 80 : 120}
          fill="#8884d8"
          dataKey="amount"
          nameKey="category"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
        {hidePieLabels && <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={10} />}
        {!hidePieLabels && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  )
})

SpendingByCategoryChart.displayName = 'SpendingByCategoryChart'
