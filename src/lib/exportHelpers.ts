import { toast } from 'sonner'

/**
 * Platform Detection Utility
 *
 * Detects user's platform (iOS/Android/Desktop) and Web Share API support
 *
 * @returns Platform information object
 */
export function getPlatformInfo() {
  const ua = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)
  const isMobile = isIOS || isAndroid || window.matchMedia('(max-width: 768px)').matches
  const hasShareAPI = typeof navigator.share === 'function'

  return {
    isIOS,
    isAndroid,
    isMobile,
    hasShareAPI,
    canShare: hasShareAPI && typeof navigator.canShare === 'function',
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
  } as const
}

export type PlatformInfo = ReturnType<typeof getPlatformInfo>

/**
 * Export File with Web Share API or Download Fallback
 *
 * Mobile: Triggers native share sheet (iOS/Android)
 * Desktop: Standard browser download
 *
 * @param content - File content (string or ArrayBuffer)
 * @param filename - Download filename
 * @param mimeType - File MIME type
 * @returns Promise that resolves when share/download completes
 */
export async function exportFile(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<void> {
  const blob = new Blob([content], { type: mimeType })
  const platform = getPlatformInfo()

  // Check file size (warn if >50MB on mobile)
  const FILE_SIZE_LIMIT = 50 * 1024 * 1024 // 50MB
  if (blob.size > FILE_SIZE_LIMIT && platform.isMobile) {
    toast.info('Large export', {
      description: 'File is too large to share, downloading instead'
    })
    downloadFile(blob, filename)
    return
  }

  // Try Web Share API on mobile
  if (platform.hasShareAPI && platform.isMobile) {
    try {
      const file = new File([blob], filename, { type: mimeType })

      // Check if file sharing is supported
      if (platform.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Wealth Export',
          text: `Financial data export: ${filename}`
        })
        return // Success - share sheet handled file
      }
    } catch (error) {
      // User cancelled share sheet (AbortError) - don't show error
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      // Other errors - fall through to download fallback
      console.log('Share failed, using download fallback:', error)
    }
  }

  // Fallback: Standard download (desktop or unsupported browsers)
  downloadFile(blob, filename)
}

/**
 * Force File Download
 *
 * Creates temporary object URL and triggers download via hidden link
 * Works on all browsers (fallback when Web Share API not available)
 *
 * @param blob - Blob to download
 * @param filename - Download filename
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Cleanup object URL after brief delay (ensure download started)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Decode Base64 Export Content
 *
 * tRPC export endpoints return base64-encoded content
 * Decode to ArrayBuffer before creating Blob
 *
 * @param base64 - Base64-encoded string
 * @returns Decoded ArrayBuffer
 */
export function decodeExportContent(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}

/**
 * Get Export Share Title
 *
 * Generates platform-appropriate share title based on data type
 *
 * @param dataType - Type of data being exported
 * @returns Share title string
 */
export function getExportShareTitle(dataType: string): string {
  const titles: Record<string, string> = {
    transactions: 'Wealth Export - Transactions',
    budgets: 'Wealth Export - Budgets',
    goals: 'Wealth Export - Goals',
    accounts: 'Wealth Export - Accounts',
    recurring: 'Wealth Export - Recurring Transactions',
    complete: 'Wealth Export - Complete Data Package'
  }

  return titles[dataType] || 'Wealth Export'
}
