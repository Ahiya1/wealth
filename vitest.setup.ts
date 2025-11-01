// vitest.setup.ts
// This file runs before any tests, setting up the test environment

import { beforeAll } from 'vitest'
import crypto from 'crypto'

// Set up test environment variables BEFORE any modules load
// This ensures encryption.ts gets the right key when it initializes

// Generate a valid 32-byte encryption key for testing
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')

// Set up other test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54432/postgres'
process.env.DIRECT_URL = process.env.DIRECT_URL || 'postgresql://postgres:postgres@localhost:54432/postgres'

// Supabase test config (these can be dummy values for unit tests)
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54421'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

// Optional API keys for testing (can be dummy values)
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-test'
process.env.CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret'

beforeAll(() => {
  // Any additional global setup can go here
  console.log('✓ Test environment initialized')
})
