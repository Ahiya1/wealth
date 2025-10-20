import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/ui/page-transition'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, TrendingUp, Target, Sparkles, Shield, Lock, Github } from 'lucide-react'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100 py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-warm-gray-900 leading-tight">
                  Mindful Money
                  <span className="block text-sage-700 mt-2">Management</span>
                </h1>
                <p className="text-xl md:text-2xl text-warm-gray-700 max-w-2xl mx-auto leading-relaxed">
                  Track accounts, budgets, and goals with intention. Build wealth that aligns with your values.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button asChild size="lg" className="bg-sage-600 hover:bg-sage-700 text-white px-8 py-6 text-lg">
                  <Link href="/signup">
                    Get Started
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-sage-600 text-sage-700 hover:bg-sage-50 px-8 py-6 text-lg">
                  <Link href="#features">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 left-10 opacity-20">
            <Sparkles className="h-12 w-12 text-sage-600" />
          </div>
          <div className="absolute bottom-20 right-10 opacity-20">
            <Heart className="h-16 w-16 text-sage-600" />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-warm-gray-900 mb-4">
                Everything You Need to Manage Money Mindfully
              </h2>
              <p className="text-lg text-warm-gray-600 max-w-2xl mx-auto">
                Unified dashboard for all your accounts, transactions, budgets, and financial goals.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {/* Feature 1: Accounts */}
              <Card className="border-sage-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-sage-600" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-warm-gray-900">
                    Accounts
                  </h3>
                  <p className="text-warm-gray-600 leading-relaxed">
                    Track checking, savings, credit cards, and investments in one place.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2: Transactions */}
              <Card className="border-sage-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-sage-600" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-warm-gray-900">
                    Transactions
                  </h3>
                  <p className="text-warm-gray-600 leading-relaxed">
                    Log every transaction, categorize spending, and see where your money goes.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3: Budgets */}
              <Card className="border-sage-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center">
                    <Target className="h-6 w-6 text-sage-600" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-warm-gray-900">
                    Budgets
                  </h3>
                  <p className="text-warm-gray-600 leading-relaxed">
                    Set monthly category budgets, track progress, and stay aligned with your goals.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4: Goals & Analytics */}
              <Card className="border-sage-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-sage-600" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-warm-gray-900">
                    Goals & Analytics
                  </h3>
                  <p className="text-warm-gray-600 leading-relaxed">
                    Create savings goals and visualize spending patterns with charts and insights.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-12 bg-warm-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 text-center md:text-left">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-sage-600" />
                <span className="text-warm-gray-700 font-medium">Bank-level Security</span>
              </div>
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-sage-600" />
                <span className="text-warm-gray-700 font-medium">Your Data is Private</span>
              </div>
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-sage-600" />
                <span className="text-warm-gray-700 font-medium">Open Source</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-16 md:py-20 bg-sage-600">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">
              Start managing money with intention
            </h2>
            <p className="text-sage-100 text-lg mb-8 max-w-2xl mx-auto">
              Track your accounts, set budgets, and reach your financial goals.
            </p>
            <Button asChild size="lg" className="bg-white text-sage-700 hover:bg-warm-gray-50 px-8 py-6 text-lg">
              <Link href="/signup">
                Get Started Free
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
