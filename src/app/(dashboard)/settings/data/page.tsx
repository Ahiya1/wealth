'use client'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PageTransition } from '@/components/ui/page-transition'
import { Receipt, PiggyBank, Target, Wallet, RefreshCw, FolderTree } from 'lucide-react'
import { ExportCard } from '@/components/exports/ExportCard'
import { CompleteExportSection } from '@/components/exports/CompleteExportSection'
import { ExportHistoryTable } from '@/components/exports/ExportHistoryTable'

export default function DataSettingsPage() {
  // Export types configuration
  // Note: Record counts will be shown after first export is generated
  const exportTypes = [
    {
      title: 'Transactions',
      dataType: 'transactions' as const,
      icon: <Receipt className="h-5 w-5 text-sage-600" />,
      description: 'All transaction records',
      recordCount: 0, // Will show actual count during export
    },
    {
      title: 'Budgets',
      dataType: 'budgets' as const,
      icon: <PiggyBank className="h-5 w-5 text-sage-600" />,
      description: 'Monthly budget allocations',
      recordCount: 0,
    },
    {
      title: 'Goals',
      dataType: 'goals' as const,
      icon: <Target className="h-5 w-5 text-sage-600" />,
      description: 'Financial goals and progress',
      recordCount: 0,
    },
    {
      title: 'Accounts',
      dataType: 'accounts' as const,
      icon: <Wallet className="h-5 w-5 text-sage-600" />,
      description: 'Bank accounts and balances',
      recordCount: 0,
    },
    {
      title: 'Recurring',
      dataType: 'recurring' as const,
      icon: <RefreshCw className="h-5 w-5 text-sage-600" />,
      description: 'Recurring transactions',
      recordCount: 0,
    },
    {
      title: 'Categories',
      dataType: 'categories' as const,
      icon: <FolderTree className="h-5 w-5 text-sage-600" />,
      description: 'Transaction categories',
      recordCount: 0,
    },
  ]

  return (
    <PageTransition>
      <div className="space-y-6">
        <Breadcrumb pathname="/settings/data" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Data & Export</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Export your financial data in multiple formats
          </p>
        </div>

        {/* Quick Exports Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-serif font-semibold text-foreground">Quick Exports</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Export individual data types in your preferred format
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exportTypes.map((exportType) => (
              <ExportCard
                key={exportType.dataType}
                title={exportType.title}
                description={exportType.description}
                icon={exportType.icon}
                recordCount={exportType.recordCount}
                dataType={exportType.dataType}
              />
            ))}
          </div>
        </div>

        {/* Complete Export Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-serif font-semibold text-foreground">Complete Export</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Download all your data in one organized package
            </p>
          </div>

          <CompleteExportSection />
        </div>

        {/* Export History Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-serif font-semibold text-foreground">Export History</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Access your recent exports (30-day retention)
            </p>
          </div>

          <ExportHistoryTable />
        </div>
      </div>
    </PageTransition>
  )
}
