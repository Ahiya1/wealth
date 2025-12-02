'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { trpc } from '@/lib/trpc'
import { Crown, Check } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'

export default function MembershipPage() {
  const { data: userData } = trpc.users.me.useQuery()

  const isPremium = userData?.subscriptionTier === 'PREMIUM'

  return (
    <PageTransition>
      <div className="space-y-6 pb-16">
        <Breadcrumb pathname="/account/membership" />

        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Membership</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Manage your subscription and billing information
          </p>
        </div>

      {/* Current Tier Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPremium && <Crown className="h-5 w-5 text-gold" />}
            Current Plan: {userData?.subscriptionTier || 'FREE'}
          </CardTitle>
          <CardDescription>
            {isPremium
              ? 'You have access to all premium features'
              : 'Upgrade to Premium for advanced features'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPremium ? (
            <div className="rounded-lg bg-gold/10 border border-gold/30 p-4">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-gold mt-0.5" />
                <div>
                  <h4 className="font-serif font-semibold text-foreground">Premium Member</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Thank you for supporting Wealth!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-warm-gray-300 p-6 text-center">
              <Crown className="h-12 w-12 text-warm-gray-400 mx-auto mb-3" />
              <h4 className="font-serif font-semibold text-foreground mb-2">Upgrade to Premium</h4>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Unlock advanced features and priority support
              </p>
              <Button disabled variant="default">
                Coming Soon
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>Premium Features</CardTitle>
          <CardDescription>
            What you get with a Premium subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              'Advanced analytics and insights',
              'Unlimited budget categories',
              'Priority customer support',
              'Export data in multiple formats',
              'Custom reports and charts',
              'Early access to new features',
            ].map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-sage-600 mt-0.5" />
                <span className="text-sm text-warm-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Billing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Billing & Invoices</CardTitle>
          <CardDescription>
            Manage your payment methods and view billing history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-warm-gray-300 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Billing management coming soon
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </PageTransition>
  )
}
