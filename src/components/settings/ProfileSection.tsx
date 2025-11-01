'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/lib/trpc'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  // Currency removed - always NIS, not user-configurable
  timezone: z.string(),
})

type ProfileFormData = z.infer<typeof profileSchema>

// Currency is hardcoded to NIS - no user selection needed

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

export function ProfileSection() {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const { data: user } = trpc.users.me.useQuery()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      // Currency removed - always NIS
      timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      })
      utils.users.me.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif font-semibold">Profile</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Update your personal information and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email is managed by your authentication provider
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="John Doe"
          />
          {errors.name && (
            <p className="text-sm text-terracotta-700">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            value="NIS (₪)"
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Currency is set to NIS (Israeli Shekel) and cannot be changed.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            onValueChange={(value) => setValue('timezone', value, { shouldDirty: true })}
            defaultValue={user?.timezone}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timezone && (
            <p className="text-sm text-terracotta-700">{errors.timezone.message}</p>
          )}
        </div>

        <Button
          type="submit"
          loading={updateProfile.isPending}
          disabled={!isDirty}
        >
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
