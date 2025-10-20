// Recharts color palette (sage + warm-gray theme)
export const CHART_COLORS = {
  primary: 'hsl(140, 14%, 33%)',      // sage-600
  secondary: 'hsl(140, 13%, 42%)',    // sage-500
  tertiary: 'hsl(140, 12%, 69%)',     // sage-300
  muted: 'hsl(24, 5%, 46%)',          // warm-gray-500
  accent: 'hsl(45, 74%, 52%)',        // gold
  grid: 'hsl(24, 6%, 91%)',           // warm-gray-200
  text: 'hsl(24, 7%, 27%)',           // warm-gray-700
}

// Category colors (for pie charts)
export const CATEGORY_COLORS = [
  'hsl(140, 14%, 33%)',  // sage-600
  'hsl(140, 13%, 42%)',  // sage-500
  'hsl(140, 12%, 69%)',  // sage-300
  'hsl(24, 6%, 34%)',    // warm-gray-600
  'hsl(45, 74%, 52%)',   // gold
  'hsl(204, 52%, 67%)',  // sky
  'hsl(255, 85%, 85%)',  // lavender
  'hsl(140, 13%, 56%)',  // sage-400
]

// Recharts config object
export const CHART_CONFIG = {
  cartesianGrid: {
    strokeDasharray: '3 3',
    stroke: CHART_COLORS.grid,
    opacity: 0.3,
  },
  xAxis: {
    stroke: CHART_COLORS.muted,
    fontSize: 12,
    tickLine: false,
  },
  yAxis: {
    stroke: CHART_COLORS.muted,
    fontSize: 12,
    tickLine: false,
  },
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    labelStyle: {
      color: 'hsl(var(--foreground))',
      fontWeight: 600,
    },
  },
}
