'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Archive, Download } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'

export function CompleteExportSection() {
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  const exportMutation = trpc.exports.exportComplete.useMutation({
    onSuccess: (data) => {
      setProgress(100)
      setProgressLabel('Complete!')

      // Decode and download ZIP
      const binaryString = atob(data.content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: data.mimeType })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Complete export ready', {
        description: `Downloaded ${data.recordCount} total records (${(data.fileSize / 1024 / 1024).toFixed(2)} MB)`,
      })

      // Reset progress after a brief delay
      setTimeout(() => {
        setProgress(0)
        setProgressLabel('')
      }, 1000)
    },
    onError: (error) => {
      toast.error('Export failed', {
        description: error.message || 'Please try again',
      })
      setProgress(0)
      setProgressLabel('')
    },
  })

  useEffect(() => {
    if (exportMutation.isPending) {
      // Simulate progress with step labels
      let currentProgress = 0
      const interval = setInterval(() => {
        currentProgress += 10
        if (currentProgress <= 30) {
          setProgressLabel('Fetching data...')
        } else if (currentProgress <= 60) {
          setProgressLabel('Generating files...')
        } else if (currentProgress <= 90) {
          setProgressLabel('Creating archive...')
        } else {
          setProgressLabel('Finalizing...')
          clearInterval(interval)
        }
        setProgress(Math.min(currentProgress, 90))
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [exportMutation.isPending])

  const handleExport = () => {
    setProgress(10)
    setProgressLabel('Starting...')
    exportMutation.mutate({})
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Complete Export Package
        </CardTitle>
        <CardDescription>
          Download all your data in an organized ZIP file with AI-ready formatting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-warm-gray-200 bg-warm-gray-50 p-4">
          <h4 className="font-serif font-medium text-foreground mb-2">Package Includes:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• All transactions, budgets, goals, accounts, and recurring transactions</li>
            <li>• README with AI analysis instructions</li>
            <li>• AI context with field descriptions and prompts</li>
            <li>• Summary with export metadata</li>
          </ul>
        </div>

        {exportMutation.isPending && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              {progressLabel}
            </p>
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="w-full"
          size="lg"
        >
          <Download className="h-4 w-4 mr-2" />
          {exportMutation.isPending ? `Exporting... ${progress}%` : 'Export Everything'}
        </Button>
      </CardContent>
    </Card>
  )
}
