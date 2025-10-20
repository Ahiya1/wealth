import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'ahiya.butman@gmail.com'

  console.log(`Setting admin role for user: ${adminEmail}`)

  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, role: true },
  })

  if (!user) {
    console.error(`❌ User with email ${adminEmail} not found.`)
    console.log('Please ensure the user has signed up before running this script.')
    process.exit(1)
  }

  if (user.role === 'ADMIN') {
    console.log(`✅ User ${adminEmail} is already an ADMIN.`)
    return
  }

  const updatedUser = await prisma.user.update({
    where: { email: adminEmail },
    data: { role: 'ADMIN' },
    select: { id: true, email: true, role: true, subscriptionTier: true },
  })

  console.log(`✅ Successfully set ${adminEmail} as ADMIN`)
  console.log('User details:', {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    subscriptionTier: updatedUser.subscriptionTier,
  })
}

main()
  .catch((e) => {
    console.error('Error setting admin user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
