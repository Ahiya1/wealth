'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ExportFilters {
  search?: string
  accountIds?: string[]
  categoryIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  minAmount?: number
  maxAmount?: number
}

interface ExportButtonProps {
  filters?: ExportFilters
  onExport: (filters: ExportFilters) => Promise<{ csv: string; filename: string }>
}

export function ExportButton({ filters = {}, onExport }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (format !== 'csv') {
      // PDF export not implemented in MVP
      return
    }

    setIsExporting(true)
    try {
      const { csv, filename } = await onExport(filters)

      // Create a blob and download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting} className="gap-2">
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Export as PDF (Coming Soon)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
