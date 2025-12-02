'use client'

import { FileJson, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export type ExportFormat = 'CSV' | 'JSON' | 'EXCEL'

const EXPORT_FORMATS = [
  {
    value: 'CSV' as const,
    label: 'CSV',
    icon: FileText,
    description: 'Excel compatible'
  },
  {
    value: 'JSON' as const,
    label: 'JSON',
    icon: FileJson,
    description: 'Raw data'
  },
  {
    value: 'EXCEL' as const,
    label: 'Excel',
    icon: FileSpreadsheet,
    description: '.xlsx format'
  },
] as const

interface FormatSelectorProps {
  value: ExportFormat
  onChange: (format: ExportFormat) => void
  disabled?: boolean
}

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  const selectedFormat = EXPORT_FORMATS.find(f => f.value === value) || EXPORT_FORMATS[0]
  const Icon = selectedFormat.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default" // 44px mobile, 40px desktop
          disabled={disabled}
          className="border-sage-200 hover:bg-sage-50 dark:border-sage-700 dark:hover:bg-sage-900"
          aria-label={`Export format: ${selectedFormat.label}`}
        >
          <Icon className="mr-2 h-4 w-4" />
          <span className="mr-2">{selectedFormat.label}</span>
          <ChevronDown className="h-4 w-4 text-warm-gray-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {EXPORT_FORMATS.map((format) => {
          const FormatIcon = format.icon
          return (
            <DropdownMenuItem
              key={format.value}
              onClick={() => onChange(format.value)}
              className="min-h-[44px] cursor-pointer" // Touch-friendly height
            >
              <FormatIcon className="mr-3 h-4 w-4" />
              <div>
                <div className="font-medium">{format.label}</div>
                <div className="text-xs text-muted-foreground">
                  {format.description}
                </div>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
