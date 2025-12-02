'use client'

import { memo, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, CHART_CONFIG } from '@/lib/chartColors'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useChartDimensions } from '@/hooks/useChartDimensions'

interface MonthOverMonthChartProps {
  data: { month: string; income: number; expenses: number }[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    dataKey: string
  }>
  label?: string
}

export const MonthOverMonthChart = memo(function MonthOverMonthChart({ data }: MonthOverMonthChartProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { height, margin } = useChartDimensions()

  // Limit to 6 months on mobile (vs 12 on desktop)
  const chartData = useMemo(() => {
    if (!isMobile || data.length <= 6) return data
    // Take last 6 months on mobile
    return data.slice(-6)
  }, [data, isMobile])

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-warm-gray-500">
        No month-over-month data available
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-warm-gray-700 mb-2">
          {label}
        </p>
        {payload.map((entry, index) => {
          const formatted = Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-bold text-sage-600 tabular-nums">
                {formatted} ₪
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={margin}>
        <CartesianGrid {...CHART_CONFIG.cartesianGrid} />

        <XAxis
          dataKey="month"
          {...CHART_CONFIG.xAxis}
        />

        <YAxis
          {...CHART_CONFIG.yAxis}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K ₪`}
        />

        <Tooltip content={<CustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />
        <Legend />

        <Bar dataKey="income" fill={CHART_COLORS.primary} name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill={CHART_COLORS.muted} name="Expenses" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
})

MonthOverMonthChart.displayName = 'MonthOverMonthChart'
