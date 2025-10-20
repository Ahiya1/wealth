'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, CHART_CONFIG } from '@/lib/chartColors'

interface SpendingTrendsChartProps {
  data: { date: string; amount: number }[]
}

export function SpendingTrendsChart({ data }: SpendingTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-warm-gray-500">
        No spending trends available
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-warm-gray-700">
          {payload[0].payload.date}
        </p>
        <p className="text-lg font-bold text-sage-600 tabular-nums">
          ${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid {...CHART_CONFIG.cartesianGrid} />

        <XAxis
          dataKey="date"
          {...CHART_CONFIG.xAxis}
        />

        <YAxis
          {...CHART_CONFIG.yAxis}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />

        <Tooltip content={<CustomTooltip />} />

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
}
