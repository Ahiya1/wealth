import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:\n')
    console.error('Required:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY\n')
    console.error('💡 Get service role key from:')
    console.error('  npx supabase status | grep "service_role key"\n')
    console.error('Then add to .env.local:')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=<your-key>')
    process.exit(1)
  }

  console.log('🔑 Creating demo user...\n')

  // Create Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('Step 1: Creating user in Supabase Auth...')

  let supabaseAuthId: string | null = null

  // Try to create auth user
  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: 'test@wealth.com',
      password: 'demo1234',
      email_confirm: true, // Skip email verification
      user_metadata: { name: 'Demo User' },
    })

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('  ⚠️  User already exists in Supabase Auth')
      console.log('  🔍 Fetching existing user...')

      // Fetch existing user
      const { data, error: listError } =
        await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        console.error('  ❌ Failed to list users:', listError.message)
        process.exit(1)
      }

      const existingUser = data.users.find((u) => u.email === 'test@wealth.com')

      if (!existingUser) {
        console.error('  ❌ Could not find existing user')
        process.exit(1)
      }

      supabaseAuthId = existingUser.id
      console.log(`  ✓ Using existing auth user: ${supabaseAuthId}`)
    } else {
      console.error('  ❌ Supabase Auth error:', authError.message)
      process.exit(1)
    }
  } else {
    supabaseAuthId = authUser.user.id
    console.log(`  ✓ Auth user created: ${supabaseAuthId}`)
  }

  console.log('\nStep 2: Creating user in Prisma database...')

  // Create or update Prisma user
  const prismaUser = await prisma.user.upsert({
    where: { email: 'test@wealth.com' },
    update: {
      supabaseAuthId,
      isDemoUser: true,
      onboardingCompletedAt: new Date(), // Pre-complete onboarding
      onboardingSkipped: false,
      name: 'Demo User',
    },
    create: {
      email: 'test@wealth.com',
      name: 'Demo User',
      supabaseAuthId,
      isDemoUser: true,
      onboardingCompletedAt: new Date(), // Pre-complete onboarding
      onboardingSkipped: false,
    },
  })

  console.log(`  ✓ Prisma user ready: ${prismaUser.id}`)

  console.log('\n✅ Demo user created successfully!\n')
  console.log('═══════════════════════════════════════')
  console.log('📧 Email:    test@wealth.com')
  console.log('🔑 Password: demo1234')
  console.log(`🆔 User ID:  ${prismaUser.id}`)
  console.log('═══════════════════════════════════════\n')
  console.log('💡 Next step: Seed demo data\n')
  console.log(`   npm run seed:demo ${prismaUser.id}\n`)
  console.log('Or copy this command:')
  console.log(`   npm run seed:demo ${prismaUser.id}`)
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
