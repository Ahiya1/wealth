'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BankProvider, AccountType } from '@prisma/client'
import { trpc } from '@/lib/trpc'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { getErrorMessage } from '@/lib/bankErrorMessages'

interface ConnectionTestStepProps {
  bank: BankProvider
  accountType: AccountType
  userId: string
  password: string
  accountIdentifier: string
  otp?: string
  onSuccess: (connectionId: string, accountNumber?: string) => void
  onOtpRequired: () => void
  onBack: () => void
}

export function ConnectionTestStep({
  bank,
  accountType,
  userId,
  password,
  accountIdentifier,
  otp,
  onSuccess,
  onOtpRequired,
  onBack,
}: ConnectionTestStepProps) {
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [accountNumber, setAccountNumber] = useState<string | undefined>(undefined)

  const utils = trpc.useUtils()

  // Create connection mutation
  const addMutation = trpc.bankConnections.add.useMutation({
    onSuccess: (data) => {
      setConnectionId(data.id)
      // Automatically test after creation
      setTestStatus('testing')
    },
    onError: (error) => {
      setTestStatus('error')
      setErrorMessage(error.message)
    },
  })

  // Test connection mutation
  const testMutation = trpc.bankConnections.test.useMutation({
    onSuccess: (data) => {
      setTestStatus('success')
      setAccountNumber(data.accountNumber)
      if (connectionId) {
        // Invalidate connection list to refresh status
        utils.bankConnections.list.invalidate()
        // Wait a bit before proceeding to show success state
        setTimeout(() => {
          onSuccess(connectionId, data.accountNumber)
        }, 1500)
      }
    },
    onError: (error) => {
      // Check if OTP required
      if (error.message === 'OTP_REQUIRED') {
        onOtpRequired()
        return
      }

      setTestStatus('error')
      setErrorMessage(error.message)
    },
  })

  // Auto-start connection creation when component mounts
  useEffect(() => {
    if (!connectionId && testStatus === 'idle') {
      setTestStatus('testing')
      const credentials = {
        userId,
        password,
        otp,
      }

      addMutation.mutate({
        bank,
        accountType,
        credentials,
        accountIdentifier,
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-test when connection is created
  useEffect(() => {
    if (connectionId && addMutation.isSuccess && !testMutation.isPending && testStatus === 'testing') {
      testMutation.mutate({ id: connectionId, otp })
    }
  }, [connectionId, addMutation.isSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  // Retry with OTP (if provided)
  useEffect(() => {
    if (otp && connectionId && testStatus !== 'success') {
      setTestStatus('testing')
      setErrorMessage(null)
      testMutation.mutate({ id: connectionId, otp })
    }
  }, [otp]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    if (connectionId) {
      setTestStatus('testing')
      setErrorMessage(null)
      testMutation.mutate({ id: connectionId })
    }
  }

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'testing':
        return <Loader2 className="h-8 w-8 animate-spin text-sage-600" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (testStatus) {
      case 'testing':
        return 'Testing connection...'
      case 'success':
        return 'Connection successful!'
      case 'error':
        return errorMessage || 'Connection failed'
      default:
        return 'Preparing to test connection...'
    }
  }

  const errorConfig = errorMessage ? getErrorMessage(errorMessage) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        {getStatusIcon()}
        <div className="text-center">
          <h3 className="text-lg font-semibold">{getStatusMessage()}</h3>
          {testStatus === 'testing' && (
            <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mt-2">
              This may take up to 60 seconds. Please wait...
            </p>
          )}
          {testStatus === 'success' && accountNumber && (
            <p className="text-sm text-warm-gray-600 dark:text-warm-gray-400 mt-2">
              Account ending in {accountNumber.slice(-4)}
            </p>
          )}
        </div>
      </div>

      {testStatus === 'error' && errorConfig && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-red-800 dark:text-red-200">{errorConfig.title}</h4>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errorConfig.description}</p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onBack} disabled={testStatus === 'testing'}>
          Back
        </Button>
        {testStatus === 'error' && errorConfig?.retryable && (
          <Button onClick={handleRetry} disabled={testMutation.isPending}>
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
