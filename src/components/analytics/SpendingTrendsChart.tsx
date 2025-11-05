'use client'

import { memo, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, CHART_CONFIG } from '@/lib/chartColors'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useChartDimensions } from '@/hooks/useChartDimensions'

interface SpendingTrendsChartProps {
  data: { date: string; amount: number }[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: { date: string; amount: number }
  }>
}

export const SpendingTrendsChart = memo(function SpendingTrendsChart({ data }: SpendingTrendsChartProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { height, margin } = useChartDimensions()

  // Sample data on mobile (show every 3rd point to reduce complexity)
  const chartData = useMemo(() => {
    if (!isMobile) return data
    // Sample every 3rd data point on mobile to reduce visual clutter
    return data.filter((_, index) => index % 3 === 0)
  }, [data, isMobile])

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-warm-gray-500">
        No spending trends available
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
          {entry.payload.date}
        </p>
        <p className="text-lg font-bold text-sage-600 tabular-nums">
          {formatted} ₪
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={margin}>
        <CartesianGrid {...CHART_CONFIG.cartesianGrid} />

        <XAxis
          dataKey="date"
          {...CHART_CONFIG.xAxis}
        />

        <YAxis
          {...CHART_CONFIG.yAxis}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K ₪`}
        />

        <Tooltip content={<CustomTooltip />} allowEscapeViewBox={{ x: true, y: true }} />

        <Line
          type="monotone"
          dataKey="amount"
          stroke={CHART_COLORS.secondary}
          strokeWidth={3}
          dot={{
            fill: CHART_COLORS.secondary,
            r: 4,
            strokeWidth: 2,
            stroke: 'hsl(var(--background))',
          }}
          activeDot={{
            r: 6,
            strokeWidth: 2,
            stroke: 'hsl(var(--background))',
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
})

SpendingTrendsChart.displayName = 'SpendingTrendsChart'
