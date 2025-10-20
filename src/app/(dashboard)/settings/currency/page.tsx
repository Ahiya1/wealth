'use client'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { CurrencySelector } from '@/components/currency/CurrencySelector'
import { PageTransition } from '@/components/ui/page-transition'

export default function CurrencySettingsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumb pathname="/settings/currency" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-warm-gray-900">Currency</h1>
          <p className="text-warm-gray-600 mt-2 leading-relaxed">
            Change your display currency and convert all your financial data
          </p>
        </div>

        <CurrencySelector />
      </div>
    </PageTransition>
  )
}
