// scripts/create-admin-prod.ts
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function main() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗')
    console.error('\n💡 Tip: Ensure production environment variables are loaded')
    process.exit(1)
  }

  console.log('🔑 Syncing production admin user...\n')

  // Create Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('Step 1: Fetching admin user from Supabase Auth...')

  // Fetch admin user from Supabase Auth
  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError || !data || !data.users) {
    console.error('❌ Failed to list users:', listError?.message || 'Unknown error')
    process.exit(1)
  }

  const users = data.users
  const adminUser = users.find((u: any) => u.email === 'ahiya.butman@gmail.com')

  if (!adminUser) {
    console.error('❌ Admin user not found in Supabase Auth')
    console.error('   Please create admin user via Supabase Dashboard first:')
    console.error('   https://supabase.com/dashboard/project/npylfibbutxioxjtcbvy/auth/users')
    console.error('\n   Steps:')
    console.error('   1. Click "Add user"')
    console.error('   2. Email: ahiya.butman@gmail.com')
    console.error('   3. Password: wealth_generator')
    console.error('   4. ✓ Check "Auto Confirm User"')
    console.error('   5. Click "Create user"')
    process.exit(1)
  }

  console.log(`  ✓ Found admin user: ${adminUser.id}`)
  console.log(`  Email: ${adminUser.email}`)
  console.log(`  Email confirmed: ${adminUser.email_confirmed_at ? '✓' : '✗'}`)

  if (!adminUser.email_confirmed_at) {
    console.warn('\n⚠️  WARNING: Admin email is not confirmed!')
    console.warn('   This may prevent login. Please verify email via dashboard or check "Auto Confirm User" was selected.')
  }

  console.log('\nStep 2: Syncing admin user to Prisma database...')

  // Upsert to Prisma User table
  const prismaUser = await prisma.user.upsert({
    where: { email: 'ahiya.butman@gmail.com' },
    update: {
      supabaseAuthId: adminUser.id,
      role: 'ADMIN', // Ensure admin role assigned
      name: 'Ahiya',
    },
    create: {
      email: 'ahiya.butman@gmail.com',
      name: 'Ahiya',
      supabaseAuthId: adminUser.id,
      role: 'ADMIN', // Critical: Grant admin access
      currency: 'NIS', // Default currency from Iteration 1
      onboardingCompletedAt: new Date(), // Skip onboarding for admin
    },
  })

  console.log(`  ✓ Prisma user synced: ${prismaUser.id}`)
  console.log(`  Role: ${prismaUser.role}`)
  console.log(`  Currency: ${prismaUser.currency}`)
  console.log(`  Onboarding: ${prismaUser.onboardingCompletedAt ? 'Completed' : 'Pending'}`)

  console.log('\n✅ Admin user ready!\n')
  console.log('═══════════════════════════════════════')
  console.log('📧 Email:    ahiya.butman@gmail.com')
  console.log('🔑 Password: wealth_generator')
  console.log(`🆔 User ID:  ${prismaUser.id}`)
  console.log('👑 Role:     ADMIN')
  console.log(`✉️  Verified: ${adminUser.email_confirmed_at ? 'Yes (pre-confirmed)' : 'No (needs verification)'}`)
  console.log('═══════════════════════════════════════\n')
  console.log('Next steps:')
  console.log('1. Login at production URL')
  console.log('2. Verify /dashboard access works')
  console.log('3. Test transaction creation (NIS format)')
  console.log('4. Consider changing password via /settings\n')
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:', error.stack)
    }
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
