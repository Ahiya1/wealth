'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormatSelector } from './FormatSelector'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'

interface ExportCardProps {
  title: string
  description: string
  icon: React.ReactNode
  recordCount: number
  dataType: 'transactions' | 'budgets' | 'goals' | 'accounts' | 'recurring' | 'categories'
}

export function ExportCard({ title, description, icon, recordCount, dataType }: ExportCardProps) {
  const [format, setFormat] = useState<'CSV' | 'JSON' | 'EXCEL'>('CSV')

  // Map dataType to correct tRPC endpoint
  const endpointMap = {
    transactions: trpc.exports.exportTransactions,
    budgets: trpc.exports.exportBudgets,
    goals: trpc.exports.exportGoals,
    accounts: trpc.exports.exportAccounts,
    recurring: trpc.exports.exportRecurringTransactions,
    categories: trpc.exports.exportCategories,
  }

  const exportMutation = endpointMap[dataType].useMutation({
    onSuccess: (data) => {
      // Decode base64 content
      const binaryString = atob(data.content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: data.mimeType })

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Export successful', {
        description: `Downloaded ${data.recordCount} records`,
      })
    },
    onError: (error) => {
      toast.error('Export failed', {
        description: error.message || 'Please try again',
      })
    },
  })

  const handleExport = () => {
    // Pass format and optional date range (for transactions)
    exportMutation.mutate({ format })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-sage-50 p-2">
            {icon}
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {recordCount > 0 ? `${recordCount} records available` : 'Export available'}
        </div>

        <div className="flex items-center gap-2">
          <FormatSelector value={format} onChange={setFormat} />
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
