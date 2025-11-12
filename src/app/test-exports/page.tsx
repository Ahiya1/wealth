'use client'

import { useState, useEffect } from 'react'
import { ExportButton } from '@/components/exports/ExportButton'
import { FormatSelector, type ExportFormat } from '@/components/exports/FormatSelector'
import { getPlatformInfo, type PlatformInfo } from '@/lib/exportHelpers'

export default function TestExportsPage() {
  const [format, setFormat] = useState<ExportFormat>('CSV')
  const [loading, setLoading] = useState(false)
  const [platform, setPlatform] = useState<PlatformInfo | null>(null)

  // Get platform info on client side only (avoid SSR error)
  useEffect(() => {
    setPlatform(getPlatformInfo())
  }, [])

  const handleExport = async () => {
    setLoading(true)
    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
    alert(`Export completed: ${format}`)
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Export Foundation Test</h1>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Platform Detection</h2>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          {platform ? (
            <pre>{JSON.stringify(platform, null, 2)}</pre>
          ) : (
            <p>Loading platform info...</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Export Components</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <FormatSelector value={format} onChange={setFormat} disabled={loading} />
          <ExportButton onClick={handleExport} loading={loading} recordCount={247}>
            Export Test Data
          </ExportButton>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Component States</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButton onClick={handleExport} recordCount={0}>
            Disabled (0 records)
          </ExportButton>
          <ExportButton onClick={handleExport} loading={true}>
            Loading State
          </ExportButton>
          <ExportButton onClick={handleExport} disabled={true}>
            Disabled Prop
          </ExportButton>
        </div>
      </div>
    </div>
  )
}
