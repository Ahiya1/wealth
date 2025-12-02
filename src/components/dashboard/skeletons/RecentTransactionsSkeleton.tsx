import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RecentTransactionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
              <div className="h-5 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
