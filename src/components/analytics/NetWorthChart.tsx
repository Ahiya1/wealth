'use client'

import { memo, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, CHART_CONFIG } from '@/lib/chartColors'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useChartDimensions } from '@/hooks/useChartDimensions'

interface NetWorthChartProps {
  data: { date: string; value: number }[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: { date: string; value: number }
  }>
}

export const NetWorthChart = memo(function NetWorthChart({ data }: NetWorthChartProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { height, margin } = useChartDimensions()

  // Reduce data points on mobile (show last 30 data points vs all on desktop)
  const chartData = useMemo(() => {
    if (!isMobile || data.length <= 30) return data
    // Take last 30 data points for mobile
    return data.slice(-30)
  }, [data, isMobile])

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-warm-gray-500">
        No net worth data available
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
          dataKey="value"
          stroke={CHART_COLORS.primary}
          strokeWidth={3}
          dot={{
            fill: CHART_COLORS.primary,
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

NetWorthChart.displayName = 'NetWorthChart'
