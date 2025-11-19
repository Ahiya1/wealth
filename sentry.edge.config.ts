import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  debug: false,

  beforeSend(event) {
    // Same PII sanitization as client and server
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

    if (event.user?.id && typeof event.user.id === 'string') {
      event.user.id = event.user.id.substring(0, 3) + '***'
    }

    return event
  },

  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
})
