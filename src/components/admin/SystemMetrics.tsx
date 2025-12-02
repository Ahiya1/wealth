'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Receipt, Wallet, TrendingUp, Shield, Star, DollarSign, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SystemMetrics() {
  const { data: metrics, isLoading, error, refetch } = trpc.admin.systemMetrics.useQuery()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Loading...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-warm-gray-100 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <p className="text-red-700 font-medium">Failed to load system metrics</p>
            <p className="text-sm text-red-600">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-red-700 border-red-300 hover:bg-red-100"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) return null

  const metricCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      icon: Users,
      description: `${metrics.adminCount} admin${metrics.adminCount !== 1 ? 's' : ''}`,
      iconColor: 'text-sage-600',
    },
    {
      title: 'Total Transactions',
      value: metrics.totalTransactions.toLocaleString(),
      icon: Receipt,
      description: 'All time',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Accounts',
      value: metrics.totalAccounts.toLocaleString(),
      icon: Wallet,
      description: 'Connected accounts',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Active Users (30d)',
      value: metrics.activeUsers30d.toLocaleString(),
      icon: TrendingUp,
      description: `${metrics.activeUsers90d} in 90d`,
      iconColor: 'text-green-600',
    },
    {
      title: 'Admin Users',
      value: metrics.adminCount.toLocaleString(),
      icon: Shield,
      description: `${((metrics.adminCount / metrics.totalUsers) * 100).toFixed(1)}% of users`,
      iconColor: 'text-red-600',
    },
    {
      title: 'Premium Users',
      value: metrics.premiumCount.toLocaleString(),
      icon: Star,
      description: `${((metrics.premiumCount / metrics.totalUsers) * 100).toFixed(1)}% of users`,
      iconColor: 'text-gold-600',
    },
    {
      title: 'Free Users',
      value: metrics.freeCount.toLocaleString(),
      icon: DollarSign,
      description: `${((metrics.freeCount / metrics.totalUsers) * 100).toFixed(1)}% of users`,
      iconColor: 'text-muted-foreground',
    },
    {
      title: 'Activity Rate',
      value: `${((metrics.activeUsers30d / metrics.totalUsers) * 100).toFixed(1)}%`,
      icon: Activity,
      description: '30-day active users',
      iconColor: 'text-teal-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-warm-gray-700">
                {metric.title}
              </CardTitle>
              <Icon className={`h-5 w-5 ${metric.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
