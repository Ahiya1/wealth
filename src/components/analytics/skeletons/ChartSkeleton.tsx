interface ChartSkeletonProps {
  height?: number
}

export function ChartSkeleton({ height = 350 }: ChartSkeletonProps) {
  return (
    <div
      className="w-full animate-pulse bg-muted/20 rounded-lg"
      style={{ height: `${height}px` }}
    >
      {/* Optional: Add visual elements that match chart structure */}
      <div className="flex items-end justify-between h-full gap-2 px-4 pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted rounded-t flex-1"
            style={{
              height: `${Math.random() * 60 + 20}%`,
              opacity: 0.3
            }}
          />
        ))}
      </div>
    </div>
  )
}
