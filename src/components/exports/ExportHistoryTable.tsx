'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'

export function ExportHistoryTable() {
  const { data: history, isLoading } = trpc.exports.getExportHistory.useQuery()

  const redownloadMutation = trpc.exports.redownloadExport.useMutation({
    onSuccess: (data: { downloadUrl: string; filename: string }) => {
      // Open blob URL in new tab (triggers download)
      window.open(data.downloadUrl, '_blank')
      toast.success('Download started', {
        description: 'Opening cached export...',
      })
    },
    onError: (error: { message: string }) => {
      toast.error('Re-download failed', {
        description: error.message,
      })
    },
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Export History
          </CardTitle>
          <CardDescription>
            Your past exports will appear here (30-day retention)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-warm-gray-600 text-center py-8">
            No exports yet. Generate your first export above!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Export History
        </CardTitle>
        <CardDescription>
          Last 10 exports (cached for 30 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-gray-200">
                <th className="text-left py-3 px-4 font-serif font-medium text-warm-gray-900">Type</th>
                <th className="text-left py-3 px-4 font-serif font-medium text-warm-gray-900">Format</th>
                <th className="text-right py-3 px-4 font-serif font-medium text-warm-gray-900">Records</th>
                <th className="text-right py-3 px-4 font-serif font-medium text-warm-gray-900">Size</th>
                <th className="text-left py-3 px-4 font-serif font-medium text-warm-gray-900">Date</th>
                <th className="text-right py-3 px-4 font-serif font-medium text-warm-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((exp: { id: string; type: string; dataType: string | null; format: string; recordCount: number; fileSize: number; createdAt: Date; isExpired: boolean; blobKey: string | null }) => (
                <tr key={exp.id} className="border-b border-warm-gray-100">
                  <td className="py-3 px-4 text-warm-gray-700">
                    {exp.type}
                    {exp.dataType && ` - ${exp.dataType}`}
                  </td>
                  <td className="py-3 px-4 text-warm-gray-700">
                    {exp.format}
                  </td>
                  <td className="py-3 px-4 text-right text-warm-gray-700">
                    {exp.recordCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-warm-gray-700">
                    {formatFileSize(exp.fileSize)}
                  </td>
                  <td className="py-3 px-4 text-warm-gray-700">
                    {format(new Date(exp.createdAt), 'MMM d, yyyy')}
                    {exp.isExpired && (
                      <span className="ml-2 text-xs text-red-600">(Expired)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {exp.isExpired || !exp.blobKey ? (
                      <Button variant="outline" size="sm" disabled>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Expired
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => redownloadMutation.mutate({ id: exp.id })}
                        disabled={redownloadMutation.isPending}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
