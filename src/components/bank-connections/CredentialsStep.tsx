'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ============================================================================
// Validation Schema
// ============================================================================

const credentialsSchema = z.object({
  userId: z.string().min(1, 'User ID is required').max(50, 'User ID too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(4, 'Password must be at least 4 characters'),
  accountIdentifier: z
    .string()
    .length(4, 'Must be exactly 4 digits (last 4 digits of account)')
    .regex(/^\d+$/, 'Must contain only digits'),
})

type CredentialsFormData = z.infer<typeof credentialsSchema>

// ============================================================================
// Component
// ============================================================================

interface CredentialsStepProps {
  initialData: { userId: string; password: string; accountIdentifier: string }
  onNext: (userId: string, password: string, accountIdentifier: string) => void
  onBack: () => void
}

export function CredentialsStep({ initialData, onNext, onBack }: CredentialsStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: initialData,
  })

  const onSubmit = (data: CredentialsFormData) => {
    onNext(data.userId, data.password, data.accountIdentifier)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userId">Bank User ID</Label>
          <Input
            id="userId"
            type="text"
            placeholder="Enter your bank user ID"
            {...register('userId')}
          />
          {errors.userId && <p className="text-sm text-red-600">{errors.userId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your bank password"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountIdentifier">Last 4 Digits of Account</Label>
          <Input
            id="accountIdentifier"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="1234"
            {...register('accountIdentifier')}
          />
          <p className="text-xs text-warm-gray-600 dark:text-warm-gray-400">
            This helps identify your account in the app
          </p>
          {errors.accountIdentifier && (
            <p className="text-sm text-red-600">{errors.accountIdentifier.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-md bg-sage-50 dark:bg-sage-900/20 p-4 border border-sage-200 dark:border-sage-800">
        <p className="text-sm text-sage-800 dark:text-sage-200">
          <strong>Security:</strong> Your credentials are encrypted with AES-256-GCM before storage.
          We never log or expose your password. Credentials are only decrypted in-memory during sync
          operations.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next</Button>
      </div>
    </form>
  )
}
