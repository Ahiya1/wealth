'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, CHART_CONFIG } from '@/lib/chartColors'

interface MonthOverMonthChartProps {
  data: { month: string; income: number; expenses: number }[]
}

export function MonthOverMonthChart({ data }: MonthOverMonthChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-warm-gray-500">
        No month-over-month data available
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-warm-gray-700 mb-2">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="text-sm text-warm-gray-600">{entry.name}:</span>
            <span className="text-sm font-bold text-sage-600 tabular-nums">
              ${Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid {...CHART_CONFIG.cartesianGrid} />

        <XAxis
          dataKey="month"
          {...CHART_CONFIG.xAxis}
        />

        <YAxis
          {...CHART_CONFIG.yAxis}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />

        <Tooltip content={<CustomTooltip />} />
        <Legend />

        <Bar dataKey="income" fill={CHART_COLORS.primary} name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill={CHART_COLORS.muted} name="Expenses" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
