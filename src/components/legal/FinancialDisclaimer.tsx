'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

const DISCLAIMER_KEY = 'wealth_disclaimer_acknowledged'

export function FinancialDisclaimer() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Check if disclaimer has been acknowledged
    const acknowledged = localStorage.getItem(DISCLAIMER_KEY)
    if (!acknowledged) {
      setOpen(true)
    }
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Financial Disclaimer
          </DialogTitle>
          <DialogDescription className="sr-only">
            Important legal information about using Wealth
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Wealth is a personal finance tracking tool and is provided for informational purposes
            only. The information and features provided by Wealth should not be construed as
            financial, investment, tax, or legal advice.
          </p>

          <div className="space-y-2">
            <p className="font-medium text-foreground">Important Limitations:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>This app does NOT provide financial advice or recommendations</li>
              <li>Transaction categorization is automated and may contain errors</li>
              <li>Budget calculations are estimates based on your data</li>
              <li>Wealth is not a licensed financial advisor or institution</li>
              <li>Always consult with qualified professionals for financial decisions</li>
            </ul>
          </div>

          <p className="font-medium text-foreground">
            By using Wealth, you acknowledge that you understand these limitations and agree to use
            the app at your own risk.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleAcknowledge} className="w-full sm:w-auto">
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
