'use client'

import { useState } from 'react'
import { CalendarIcon, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface TransactionFilterValues {
  search?: string
  accountIds?: string[]
  categoryIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  minAmount?: number
  maxAmount?: number
  sortBy?: 'date' | 'amount' | 'payee'
  sortOrder?: 'asc' | 'desc'
}

interface TransactionFiltersProps {
  filters: TransactionFilterValues
  onFiltersChange: (filters: TransactionFilterValues) => void
  accounts?: Array<{ id: string; name: string; institution: string }>
  categories?: Array<{ id: string; name: string; color?: string }>
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  accounts = [],
  categories = [],
}: TransactionFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClearFilters = () => {
    onFiltersChange({
      search: undefined,
      accountIds: undefined,
      categoryIds: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      sortBy: 'date',
      sortOrder: 'desc',
    })
  }

  const activeFiltersCount = [
    filters.search,
    filters.accountIds?.length,
    filters.categoryIds?.length,
    filters.dateFrom,
    filters.dateTo,
    filters.minAmount,
    filters.maxAmount,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search by payee..."
            value={filters.search || ''}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value || undefined })
            }
            className="max-w-sm"
          />
        </div>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Advanced Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear all
                  </Button>
                )}
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 justify-start text-left font-normal',
                          !filters.dateFrom && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? (
                          format(filters.dateFrom, 'MMM d, yyyy')
                        ) : (
                          <span>From date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) =>
                          onFiltersChange({ ...filters, dateFrom: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 justify-start text-left font-normal',
                          !filters.dateTo && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? (
                          format(filters.dateTo, 'MMM d, yyyy')
                        ) : (
                          <span>To date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) =>
                          onFiltersChange({ ...filters, dateTo: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Account Filter */}
              {accounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select
                    value={filters.accountIds?.[0] || 'all'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        accountIds: value === 'all' ? undefined : [value],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All accounts</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.institution})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={filters.categoryIds?.[0] || 'all'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        categoryIds: value === 'all' ? undefined : [value],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            {category.color && (
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amount Range */}
              <div className="space-y-2">
                <Label>Amount Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minAmount || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        minAmount: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxAmount || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        maxAmount: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy || 'date'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        sortBy: value as 'date' | 'amount' | 'payee',
                      })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="payee">Payee</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.sortOrder || 'desc'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        sortOrder: value as 'asc' | 'desc',
                      })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest first</SelectItem>
                      <SelectItem value="asc">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
