'use client'

import { useState, useCallback } from 'react'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadZoneProps {
  onFileUpload: (file: File, base64: string) => void
  accept?: string
  maxSize?: number
}

export function FileUploadZone({
  onFileUpload,
  accept = '.pdf,.csv,.xlsx',
  maxSize = 10 * 1024 * 1024,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsProcessing(true)

      try {
        // Validate file type
        const extension = file.name.split('.').pop()?.toLowerCase()
        const allowedExtensions = accept.split(',').map((ext) => ext.replace('.', ''))

        if (!extension || !allowedExtensions.includes(extension)) {
          setError(`Invalid file type. Allowed: ${accept}`)
          return
        }

        // Validate file size
        if (file.size > maxSize) {
          const maxMB = Math.round(maxSize / 1024 / 1024)
          setError(`File too large. Maximum size: ${maxMB}MB`)
          return
        }

        // Convert to base64
        try {
          const base64 = await fileToBase64(file)
          setSelectedFile(file)
          onFileUpload(file, base64)
        } catch (_err) {
          setError('Failed to read file')
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [accept, maxSize, onFileUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null)
    setError(null)
  }, [])

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isProcessing
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer',
          isDragging && !isProcessing
            ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/20'
            : 'border-warm-gray-300 dark:border-warm-gray-600 hover:border-sage-400'
        )}
        onClick={() => !isProcessing && document.getElementById('file-input')?.click()}
      >
        {isProcessing ? (
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-sage-500 animate-spin" />
        ) : (
          <Upload className="w-12 h-12 mx-auto mb-4 text-warm-gray-400" />
        )}
        <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mb-2">
          {isProcessing
            ? 'Processing file...'
            : 'Drag and drop a bank statement, or click to browse'
          }
        </p>
        <p className="text-xs text-warm-gray-500">
          Supported: PDF, CSV, Excel (max {Math.round(maxSize / 1024 / 1024)}MB)
        </p>
      </div>

      <input
        id="file-input"
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />

      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-sage-50 dark:bg-sage-900/20 rounded-lg">
          <File className="w-5 h-5 text-sage-600" />
          <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
          <button
            onClick={handleRemoveFile}
            className="p-1 hover:bg-sage-100 dark:hover:bg-sage-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const parts = base64.split(',')
      const base64Data = parts[1] // Remove data URL prefix
      if (!base64Data) {
        reject(new Error('Failed to extract base64 data'))
        return
      }
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
