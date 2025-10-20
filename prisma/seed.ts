// Seed script for default categories - Fixed by Builder-3

import { PrismaClient } from '@prisma/client'
import { DEFAULT_CATEGORIES } from '../src/lib/constants'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding default categories...')

  // First create parent categories
  const parentCategories = DEFAULT_CATEGORIES.filter((c) => !c.parent)
  console.log(`Creating ${parentCategories.length} parent categories...`)

  for (const cat of parentCategories) {
    try {
      // Check if category already exists (by name and userId=null)
      const existing = await prisma.category.findFirst({
        where: {
          name: cat.name,
          userId: null,
        },
      })

      if (existing) {
        // Update existing category
        await prisma.category.update({
          where: { id: existing.id },
          data: {
            icon: cat.icon,
            color: cat.color,
            isDefault: true,
            isActive: true,
          },
        })
        console.log(`  ✓ ${cat.name} (updated)`)
      } else {
        // Create new category
        await prisma.category.create({
          data: {
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            userId: null,
            isDefault: true,
            isActive: true,
          },
        })
        console.log(`  ✓ ${cat.name} (created)`)
      }
    } catch (error) {
      console.error(`  ✗ Failed to create ${cat.name}:`, error)
    }
  }

  // Then create child categories
  const childCategories = DEFAULT_CATEGORIES.filter((c) => c.parent)
  console.log(`Creating ${childCategories.length} child categories...`)

  for (const cat of childCategories) {
    try {
      // Find parent category
      const parent = await prisma.category.findFirst({
        where: { name: cat.parent || '', userId: null },
      })

      if (!parent) {
        console.error(`  ✗ Parent category "${cat.parent}" not found for "${cat.name}"`)
        continue
      }

      // Check if category already exists
      const existing = await prisma.category.findFirst({
        where: {
          name: cat.name,
          userId: null,
        },
      })

      if (existing) {
        // Update existing category
        await prisma.category.update({
          where: { id: existing.id },
          data: {
            icon: cat.icon,
            color: cat.color,
            parentId: parent.id,
            isDefault: true,
            isActive: true,
          },
        })
        console.log(`  ✓ ${cat.name} (child of ${cat.parent}) (updated)`)
      } else {
        // Create new category
        await prisma.category.create({
          data: {
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            parentId: parent.id,
            userId: null,
            isDefault: true,
            isActive: true,
          },
        })
        console.log(`  ✓ ${cat.name} (child of ${cat.parent}) (created)`)
      }
    } catch (error) {
      console.error(`  ✗ Failed to create ${cat.name}:`, error)
    }
  }

  const totalCategories = await prisma.category.count({
    where: { userId: null, isDefault: true },
  })

  console.log(`\n✅ Seeding complete! Total default categories: ${totalCategories}`)
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
