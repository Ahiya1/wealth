'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ============================================================================
// Constants
// ============================================================================

const OTP_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes

// ============================================================================
// Component
// ============================================================================

interface OtpModalProps {
  isOpen: boolean
  onSubmit: (otp: string) => void
  onCancel: () => void
  phoneLastDigits?: string // e.g., "1234" for "***1234"
}

export function OtpModal({ isOpen, onSubmit, onCancel, phoneLastDigits = '****' }: OtpModalProps) {
  const [otp, setOtp] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(OTP_TIMEOUT_MS)
  const [isExpired, setIsExpired] = useState(false)

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp('')
      setTimeRemaining(OTP_TIMEOUT_MS)
      setIsExpired(false)
    }
  }, [isOpen])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1000) {
          setIsExpired(true)
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, timeRemaining])

  // Format time remaining (MM:SS)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 6 && !isExpired) {
      onSubmit(otp)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Enter SMS Code</DialogTitle>
          <DialogDescription>
            SMS code sent to ***{phoneLastDigits}.
            <br />
            Code expires in <span className="font-semibold text-sage-700">{formatTime(timeRemaining)}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only digits
            disabled={isExpired}
            autoFocus
            className="text-center text-2xl tracking-widest"
          />

          {isExpired && (
            <p className="text-sm text-red-600">
              Code expired. Please close this dialog and retry the connection to receive a new code.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={otp.length !== 6 || isExpired}>
              Verify
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
