'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

interface BankScraperConsentProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function BankScraperConsent({ checked, onCheckedChange }: BankScraperConsentProps) {
  return (
    <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
        <div className="space-y-3 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            By connecting your bank account, you authorize Wealth to:
          </p>

          <ul className="space-y-1.5 text-amber-800 dark:text-amber-300">
            <li className="flex items-start gap-2">
              <span className="text-sage-600 dark:text-sage-400">✓</span>
              <span>Access your bank account data via screen scraping technology</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sage-600 dark:text-sage-400">✓</span>
              <span>
                Store your encrypted bank credentials on our servers (AES-256-GCM encryption)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sage-600 dark:text-sage-400">✓</span>
              <span>Import your transaction history (last 30-90 days)</span>
            </li>
          </ul>

          <div className="pt-2">
            <p className="mb-2 font-medium text-amber-900 dark:text-amber-200">
              ⚠️ Important Disclaimers:
            </p>
            <ul className="space-y-1.5 text-amber-800 dark:text-amber-300">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Screen scraping may violate your bank&apos;s Terms of Service</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>We are NOT affiliated with or endorsed by your bank</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Bank account access can be revoked at any time in Settings</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Your credentials are encrypted but stored on our servers</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>We will NEVER share your credentials with third parties</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 border-t border-amber-300 pt-4 dark:border-amber-800">
        <Checkbox
          id="bank-consent"
          checked={checked}
          onCheckedChange={(checked) => onCheckedChange(checked === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="bank-consent"
          className="cursor-pointer text-sm font-medium text-amber-900 dark:text-amber-200"
        >
          I understand and authorize Wealth to access my bank account
        </Label>
      </div>
    </div>
  )
}
