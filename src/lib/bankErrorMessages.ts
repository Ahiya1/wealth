export interface ErrorMessageConfig {
  title: string
  description: string
  action?: {
    label: string
    href?: string
  }
  retryable: boolean
}

export const bankErrorMessages: Record<string, ErrorMessageConfig> = {
  INVALID_CREDENTIALS: {
    title: 'Invalid credentials',
    description: 'Please check your username and password and try again.',
    action: {
      label: 'Update credentials',
    },
    retryable: true,
  },

  PASSWORD_EXPIRED: {
    title: 'Password expired',
    description:
      "Your bank requires a password change. Please update your password via your bank's website, then update your credentials here.",
    action: {
      label: 'Open bank website',
      href: 'https://fibi.bank.co.il', // Update based on bank
    },
    retryable: false,
  },

  OTP_REQUIRED: {
    title: 'SMS code required',
    description: 'Your bank requires a verification code. Please enter the code sent to your phone.',
    retryable: true,
  },

  OTP_TIMEOUT: {
    title: 'SMS code expired',
    description: 'The SMS code has expired. Please retry the connection to receive a new code.',
    action: {
      label: 'Retry',
    },
    retryable: true,
  },

  NETWORK_ERROR: {
    title: 'Connection failed',
    description: 'Unable to connect to bank. Please check your internet connection and try again.',
    action: {
      label: 'Retry',
    },
    retryable: true,
  },

  SCRAPER_BROKEN: {
    title: 'Sync temporarily unavailable',
    description:
      'The bank may have changed their website. Our team has been notified and is working on a fix.',
    retryable: false,
  },

  ACCOUNT_BLOCKED: {
    title: 'Account locked',
    description: 'Too many failed login attempts. Please contact your bank to unlock your account.',
    retryable: false,
  },

  BANK_MAINTENANCE: {
    title: 'Bank under maintenance',
    description: "The bank's systems are currently unavailable. Please try again later.",
    action: {
      label: 'Retry in 1 hour',
    },
    retryable: true,
  },
}

/**
 * Get user-friendly error message for BankScraperError type
 */
export function getErrorMessage(errorType: string): ErrorMessageConfig {
  return (
    bankErrorMessages[errorType] || {
      title: 'Sync failed',
      description: 'An unexpected error occurred. Please try again later.',
      retryable: true,
    }
  )
}
