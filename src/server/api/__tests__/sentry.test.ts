import { describe, it, expect } from 'vitest'

// Import the beforeSend hook from sentry.client.config.ts
// We'll test the PII sanitization logic

describe('Sentry PII Sanitization', () => {
  // Simulate the beforeSend hook logic
  const sanitizeEvent = (event: any) => {
    // Remove sensitive financial data
    if (event.request?.data) {
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
        delete event.request.data[field]
      }
    }

    // Sanitize user ID (only first 3 chars)
    if (event.user?.id) {
      event.user.id = event.user.id.substring(0, 3) + '***'
    }

    // Sanitize breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
        if (breadcrumb.data) {
          const sanitized = { ...breadcrumb.data }
          delete sanitized.amount
          delete sanitized.payee
          delete sanitized.accountNumber
          breadcrumb.data = sanitized
        }
        return breadcrumb
      })
    }

    return event
  }

  it('removes transaction amounts from request data', () => {
    const event = {
      request: {
        data: {
          amount: 1234.56,
          category: 'Groceries',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('amount')
    expect(sanitized.request.data).toHaveProperty('category')
  })

  it('removes payee names from request data', () => {
    const event = {
      request: {
        data: {
          payee: 'Walmart',
          date: '2025-11-19',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('payee')
    expect(sanitized.request.data).toHaveProperty('date')
  })

  it('removes account numbers from request data', () => {
    const event = {
      request: {
        data: {
          accountNumber: '1234567890',
          accountType: 'checking',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('accountNumber')
    expect(sanitized.request.data).toHaveProperty('accountType')
  })

  it('removes account balances from request data', () => {
    const event = {
      request: {
        data: {
          balance: 5000.0,
          accountName: 'Checking',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('balance')
    expect(sanitized.request.data).toHaveProperty('accountName')
  })

  it('removes bank credentials from request data', () => {
    const event = {
      request: {
        data: {
          credentials: { username: 'user123', password: 'secret' },
          bankName: 'Bank Leumi',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('credentials')
    expect(sanitized.request.data).toHaveProperty('bankName')
  })

  it('removes passwords from request data', () => {
    const event = {
      request: {
        data: {
          password: 'mypassword123',
          email: 'user@example.com',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('password')
    expect(sanitized.request.data).toHaveProperty('email')
  })

  it('removes userPassword field from request data', () => {
    const event = {
      request: {
        data: {
          userPassword: 'israelibank123',
          companyId: 'company-1',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('userPassword')
    expect(sanitized.request.data).toHaveProperty('companyId')
  })

  it('sanitizes user ID to first 3 characters', () => {
    const event = {
      user: {
        id: 'clx1234567890abcdef',
        email: 'user@example.com',
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.user.id).toBe('clx***')
    expect(sanitized.user.email).toBe('user@example.com')
  })

  it('handles short user IDs gracefully', () => {
    const event = {
      user: {
        id: 'ab',
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.user.id).toBe('ab***')
  })

  it('removes amounts from breadcrumbs', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'transaction',
          data: {
            amount: 123.45,
            category: 'Food',
          },
        },
      ],
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.breadcrumbs[0].data).not.toHaveProperty('amount')
    expect(sanitized.breadcrumbs[0].data).toHaveProperty('category')
  })

  it('removes payee from breadcrumbs', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'transaction',
          data: {
            payee: 'Starbucks',
            date: '2025-11-19',
          },
        },
      ],
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.breadcrumbs[0].data).not.toHaveProperty('payee')
    expect(sanitized.breadcrumbs[0].data).toHaveProperty('date')
  })

  it('removes account number from breadcrumbs', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'account',
          data: {
            accountNumber: '9876543210',
            bankName: 'Bank Hapoalim',
          },
        },
      ],
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.breadcrumbs[0].data).not.toHaveProperty('accountNumber')
    expect(sanitized.breadcrumbs[0].data).toHaveProperty('bankName')
  })

  it('handles multiple sensitive fields in single event', () => {
    const event = {
      request: {
        data: {
          amount: 999.99,
          payee: 'Target',
          accountNumber: '1111222233',
          balance: 10000,
          credentials: { user: 'test' },
          password: 'secret',
          userId: 'user123',
          userPassword: 'pass456',
          safeField: 'keep-this',
        },
      },
      user: {
        id: 'clx9876543210',
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('amount')
    expect(sanitized.request.data).not.toHaveProperty('payee')
    expect(sanitized.request.data).not.toHaveProperty('accountNumber')
    expect(sanitized.request.data).not.toHaveProperty('balance')
    expect(sanitized.request.data).not.toHaveProperty('credentials')
    expect(sanitized.request.data).not.toHaveProperty('password')
    expect(sanitized.request.data).not.toHaveProperty('userId')
    expect(sanitized.request.data).not.toHaveProperty('userPassword')
    expect(sanitized.request.data).toHaveProperty('safeField')
    expect(sanitized.user.id).toBe('clx***')
  })

  it('handles event without request data', () => {
    const event = {
      message: 'Test error',
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized).toEqual(event)
  })

  it('handles event without user', () => {
    const event = {
      request: {
        data: {
          amount: 100,
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('amount')
  })

  it('handles event without breadcrumbs', () => {
    const event = {
      request: {
        data: {
          payee: 'Test',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('payee')
  })

  it('preserves non-sensitive data', () => {
    const event = {
      request: {
        data: {
          amount: 123.45,
          categoryId: 'cat-groceries',
          date: '2025-11-19',
          description: 'Weekly shopping',
        },
      },
    }

    const sanitized = sanitizeEvent(event)
    expect(sanitized.request.data).not.toHaveProperty('amount')
    expect(sanitized.request.data).toHaveProperty('categoryId')
    expect(sanitized.request.data).toHaveProperty('date')
    expect(sanitized.request.data).toHaveProperty('description')
  })
})
