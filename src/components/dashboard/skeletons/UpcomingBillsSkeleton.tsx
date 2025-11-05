import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function UpcomingBillsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-warm-gray-900">Upcoming Bills</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
              <div className="h-5 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
