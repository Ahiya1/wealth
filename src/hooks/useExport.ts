'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { exportFile, decodeExportContent } from '@/lib/exportHelpers'
import type { ExportFormat } from '@/components/exports/FormatSelector'

interface UseExportOptions<TInput> {
  mutation: {
    mutateAsync: (input: TInput) => Promise<{
      content: string
      filename: string
      mimeType: string
      recordCount: number
      fileSize: number
    }>
    isPending: boolean
    error: unknown
  }
  getInput: (format: ExportFormat) => TInput
  dataType: string
  onSuccess?: (recordCount: number) => void
}

export function useExport<TInput>({
  mutation,
  getInput,
  dataType: _dataType,
  onSuccess
}: UseExportOptions<TInput>) {
  // Load format preference from localStorage
  const [format, setFormat] = useState<ExportFormat>(() => {
    if (typeof window === 'undefined') return 'CSV'
    const saved = localStorage.getItem('exportFormat')
    return (saved as ExportFormat) || 'CSV'
  })

  // Persist format preference to localStorage
  useEffect(() => {
    localStorage.setItem('exportFormat', format)
  }, [format])

  // Export handler
  const handleExport = async () => {
    try {
      const input = getInput(format)
      const result = await mutation.mutateAsync(input)

      // Decode base64 content
      const content = decodeExportContent(result.content)

      // Export with share sheet or download
      await exportFile(content, result.filename, result.mimeType)

      // Success toast
      toast.success('Export successful', {
        description: `${result.recordCount.toLocaleString()} records exported`
      })

      // Optional callback
      onSuccess?.(result.recordCount)
    } catch (error) {
      // Error toast
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    format,
    setFormat,
    handleExport,
    isLoading: mutation.isPending,
    error: mutation.error
  }
}
