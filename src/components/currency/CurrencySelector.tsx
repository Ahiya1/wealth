'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'
import { CurrencyConfirmationDialog } from './CurrencyConfirmationDialog'

export function CurrencySelector() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const { data: user } = trpc.users.me.useQuery()

  // Exchange rate preview query - enabled only when currency is selected
  const { data: exchangeRate, isLoading: isLoadingRate } = trpc.currency.getExchangeRate.useQuery(
    {
      fromCurrency: user?.currency || 'USD',
      toCurrency: selectedCurrency,
    },
    {
      enabled: !!selectedCurrency && selectedCurrency !== user?.currency && !!user,
    }
  )

  const handleChangeCurrency = () => {
    setShowConfirmDialog(true)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sage-600" />
      </div>
    )
  }

  const currentCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === user.currency)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>
            Change your display currency. All amounts will be converted using historical exchange rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Currency Display */}
          <div className="rounded-lg bg-sage-50 p-4">
            <p className="text-sm text-warm-gray-600 mb-1">Current Currency</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono">{currentCurrency?.symbol}</span>
              <div>
                <p className="text-xl font-semibold text-warm-gray-900">
                  {currentCurrency?.name}
                </p>
                <Badge variant="outline" className="mt-1">
                  {currentCurrency?.code}
                </Badge>
              </div>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm-gray-900">
              Select New Currency
            </label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose currency..." />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem
                    key={currency.code}
                    value={currency.code}
                    disabled={currency.code === user.currency}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg w-8">{currency.symbol}</span>
                      <span className="font-medium">{currency.name}</span>
                      <span className="text-warm-gray-500 text-sm">({currency.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exchange Rate Preview */}
          {selectedCurrency && selectedCurrency !== user.currency && (
            <div className="rounded-lg bg-warm-gray-50 border border-warm-gray-200 p-4">
              {isLoadingRate ? (
                <div className="flex items-center gap-2 text-sm text-warm-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fetching exchange rate...</span>
                </div>
              ) : exchangeRate ? (
                <>
                  <p className="text-sm text-warm-gray-600 mb-1">Exchange Rate Preview</p>
                  <p className="text-lg font-semibold text-warm-gray-900">
                    1 {user.currency} = {exchangeRate.rate} {selectedCurrency}
                  </p>
                  <p className="text-xs text-warm-gray-500 mt-1">
                    Rate as of {new Date(exchangeRate.date).toLocaleDateString()}
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* Change Button */}
          <Button
            onClick={handleChangeCurrency}
            disabled={!selectedCurrency || selectedCurrency === user.currency || isLoadingRate}
            className="w-full bg-sage-600 hover:bg-sage-700"
            size="lg"
          >
            {isLoadingRate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Rate...
              </>
            ) : (
              <>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Change Currency
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {showConfirmDialog && selectedCurrency && (
        <CurrencyConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          fromCurrency={user.currency}
          toCurrency={selectedCurrency}
          onSuccess={() => {
            setSelectedCurrency('')
            setShowConfirmDialog(false)
          }}
        />
      )}
    </>
  )
}
