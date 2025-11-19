import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1, // 10% sample rate for performance monitoring

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // PII Sanitization
  beforeSend(event) {
    // Remove sensitive financial data
    if (event.request?.data && typeof event.request.data === 'object') {
      const sensitiveFields = [
        'amount',
        'payee',
        'accountNumber',
        'balance',
        'credentials',
        'password',
        'userId',
        'userPassword',
      ]

      for (const field of sensitiveFields) {
        delete (event.request.data as Record<string, unknown>)[field]
      }
    }

    // Sanitize user ID (only first 3 chars)
    if (event.user?.id && typeof event.user.id === 'string') {
      event.user.id = event.user.id.substring(0, 3) + '***'
    }

    // Sanitize breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data && typeof breadcrumb.data === 'object') {
          const sanitized = { ...breadcrumb.data }
          delete (sanitized as Record<string, unknown>).amount
          delete (sanitized as Record<string, unknown>).payee
          delete (sanitized as Record<string, unknown>).accountNumber
          breadcrumb.data = sanitized
        }
        return breadcrumb
      })
    }

    return event
  },

  // Environment tracking
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',

  // Release tracking (set by Vercel deployment)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
})
