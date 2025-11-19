import { PrismaClient } from '@prisma/client'
import { startOfMonth, endOfMonth } from 'date-fns'
import { ALERT_THRESHOLDS, type BudgetAlertResult } from '@/types/budget-alerts'

/**
 * Check budget thresholds and trigger alerts for exceeded budgets
 *
 * @param userId - User ID to check budgets for
 * @param affectedCategories - Category IDs from imported transactions
 * @param month - Month in format "YYYY-MM"
 * @param prisma - Prisma client instance
 * @returns Array of triggered alerts
 */
export async function checkBudgetAlerts(
  userId: string,
  affectedCategories: string[],
  month: string,
  prisma: PrismaClient
): Promise<BudgetAlertResult[]> {
  // 1. Fetch budgets for affected categories
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      categoryId: { in: affectedCategories },
      month,
    },
    include: {
      category: true,
      alerts: true,
    },
  })

  if (budgets.length === 0) {
    return []
  }

  // 2. Calculate date range for the month
  const [year, monthNum] = month.split('-').map(Number)
  if (!year || !monthNum) {
    throw new Error(`Invalid month format: ${month}`)
  }
  const startDate = startOfMonth(new Date(year, monthNum - 1))
  const endDate = endOfMonth(new Date(year, monthNum - 1))

  const triggeredAlerts: BudgetAlertResult[] = []

  // 3. Process each budget
  for (const budget of budgets) {
    // 3a. Calculate spent amount using aggregate query
    const spent = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        date: { gte: startDate, lte: endDate },
        amount: { lt: 0 }, // Only expenses
      },
      _sum: { amount: true },
    })

    const spentAmount = Math.abs(Number(spent._sum.amount || 0))
    const budgetAmount = Number(budget.amount)
    const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0

    // 3b. Check which thresholds were crossed
    const crossedThresholds = ALERT_THRESHOLDS.filter((threshold) => {
      // Find if alert already sent for this threshold
      const existingAlert = budget.alerts.find(
        (alert) => alert.threshold === threshold
      )

      // Trigger if percentage >= threshold AND alert not sent yet
      return percentage >= threshold && existingAlert && !existingAlert.sent
    })

    // 3c. Mark alerts as sent
    if (crossedThresholds.length > 0) {
      await prisma.budgetAlert.updateMany({
        where: {
          budgetId: budget.id,
          threshold: { in: crossedThresholds },
          sent: false,
        },
        data: {
          sent: true,
          sentAt: new Date(),
        },
      })

      // 3d. Add to triggered alerts result
      for (const threshold of crossedThresholds) {
        triggeredAlerts.push({
          budgetId: budget.id,
          categoryName: budget.category.name,
          threshold,
          percentage: Math.round(percentage),
          spentAmount,
          budgetAmount,
        })
      }
    }
  }

  return triggeredAlerts
}

/**
 * Reset all alerts for a budget (when month changes or budget is updated)
 */
export async function resetBudgetAlerts(
  budgetId: string,
  prisma: PrismaClient
): Promise<void> {
  await prisma.budgetAlert.updateMany({
    where: { budgetId },
    data: { sent: false, sentAt: null },
  })
}
