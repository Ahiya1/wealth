'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

const affirmations = [
  'You are building a secure financial future',
  'Every transaction is a conscious choice',
  'Your worth is not your net worth',
  'Financial wellness is a journey, not a destination',
  "You're making progress, even when it's slow",
  'Small steps today create big changes tomorrow',
  'You have the power to shape your financial story',
  'Mindful spending is an act of self-care',
  'Your financial goals are worth the effort',
  'Celebrate every win, no matter how small',
  'Financial peace comes from awareness, not perfection',
  'You are capable of making wise money decisions',
  'Your financial journey is uniquely yours',
  'Progress, not perfection, is the goal',
  'You deserve financial stability and peace',
  'Every dollar has a purpose when you decide it',
  'You are learning and growing with each choice',
  'Financial freedom starts with small, consistent actions',
  'You control your money; it does not control you',
  'Patience and persistence build lasting wealth',
  'Your financial habits are improving every day',
  'You are worthy of abundance and security',
  'Mistakes are opportunities to learn and adjust',
  'You are creating a life you love, one choice at a time',
  'Financial wellness supports your overall wellbeing',
  'You have everything you need to succeed',
  'Your financial story is still being written',
  'You are making meaningful progress toward your goals',
  'Every budget is a plan for your dreams',
  'You are enough, and you have enough',
  'Financial clarity brings peace of mind',
  'You are building something beautiful with your resources',
  'Your financial future is bright and full of possibility',
  'You are taking control of your financial destiny',
  'Every step forward is a victory worth celebrating',
]

export function AffirmationCard() {
  const dailyAffirmation = useMemo(() => {
    // Rotate based on day of month (consistent per day)
    const index = new Date().getDate() % affirmations.length
    return affirmations[index]
  }, [])

  return (
    <Card className="bg-gradient-to-br from-sage-50 via-warm-gray-50 to-sage-100 dark:from-warm-gray-900 dark:via-warm-gray-800 dark:to-warm-gray-900 border-sage-200 dark:border-warm-gray-600 shadow-soft-lg hover:shadow-soft-xl dark:shadow-none dark:border transition-all duration-300 rounded-warmth">
      <CardContent className="p-8 md:p-10 lg:p-12 text-center">
        {/* Icon enlarged for prominence */}
        <Sparkles className="h-6 w-6 md:h-8 md:w-8 mx-auto text-gold-500 dark:text-gold-400 mb-4 md:mb-6" />

        {/* Text enlarged 1.5x with responsive breakpoints */}
        <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-warm-gray-800 dark:text-warm-gray-200 italic leading-loose max-w-4xl mx-auto">
          &ldquo;{dailyAffirmation}&rdquo;
        </p>
      </CardContent>
    </Card>
  )
}
