'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Shield, Star, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

type RoleFilter = 'ALL' | 'USER' | 'ADMIN'
type TierFilter = 'ALL' | 'FREE' | 'PREMIUM'

export function UserListTable() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL')

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.admin.userList.useInfiniteQuery(
    {
      search: debouncedSearch || undefined,
      role: roleFilter !== 'ALL' ? roleFilter : undefined,
      tier: tierFilter !== 'ALL' ? tierFilter : undefined,
      limit: 50,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <p className="text-red-700 font-medium">Failed to load user list</p>
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const allUsers = data?.pages.flatMap((page) => page.users) ?? []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-gray-400" />
              <Input
                type="text"
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as RoleFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>

            {/* Tier Filter */}
            <Select
              value={tierFilter}
              onValueChange={(value) => setTierFilter(value as TierFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tiers</SelectItem>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(debouncedSearch || roleFilter !== 'ALL' || tierFilter !== 'ALL') && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-warm-gray-600">Active filters:</span>
              {debouncedSearch && (
                <Badge variant="outline">Search: {debouncedSearch}</Badge>
              )}
              {roleFilter !== 'ALL' && (
                <Badge variant="outline">Role: {roleFilter}</Badge>
              )}
              {tierFilter !== 'ALL' && (
                <Badge variant="outline">Tier: {tierFilter}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User List Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Users ({allUsers.length}{hasNextPage ? '+' : ''})
            </CardTitle>
            {isLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-warm-gray-400" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && allUsers.length === 0 ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-warm-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-12 text-warm-gray-500">
              <p className="font-medium">No users found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-gray-200 text-left">
                      <th className="pb-3 text-sm font-medium text-warm-gray-700">
                        Email
                      </th>
                      <th className="pb-3 text-sm font-medium text-warm-gray-700">
                        Name
                      </th>
                      <th className="pb-3 text-sm font-medium text-warm-gray-700">
                        Role
                      </th>
                      <th className="pb-3 text-sm font-medium text-warm-gray-700">
                        Tier
                      </th>
                      <th className="pb-3 text-sm font-medium text-warm-gray-700">
                        Transactions
                      </th>
                      <th className="pb-3 text-sm font-medium text-warm-gray-700">
                        Created
                      </th>
                      <th className="pb-3 text-sm font-medium text-warm-gray-700">
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-warm-gray-100 hover:bg-warm-gray-50 transition-colors"
                      >
                        <td className="py-3 text-sm text-warm-gray-900">
                          {user.email}
                        </td>
                        <td className="py-3 text-sm text-warm-gray-900">
                          {user.name || (
                            <span className="text-warm-gray-400 italic">No name</span>
                          )}
                        </td>
                        <td className="py-3">
                          {user.role === 'ADMIN' ? (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1 w-fit"
                            >
                              <Shield className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="w-fit">
                              User
                            </Badge>
                          )}
                        </td>
                        <td className="py-3">
                          {user.subscriptionTier === 'PREMIUM' ? (
                            <Badge
                              className="flex items-center gap-1 w-fit bg-gold-100 text-gold-700 border-gold-300"
                              variant="outline"
                            >
                              <Star className="h-3 w-3" />
                              Premium
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="w-fit">
                              Free
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-sm text-warm-gray-900">
                          {user.transactionCount.toLocaleString()}
                        </td>
                        <td className="py-3 text-sm text-warm-gray-700">
                          {format(new Date(user.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 text-sm text-warm-gray-700">
                          {user.lastActivityAt ? (
                            format(new Date(user.lastActivityAt), 'MMM d, yyyy')
                          ) : (
                            <span className="text-warm-gray-400 italic">Never</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load More Button */}
              {hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
