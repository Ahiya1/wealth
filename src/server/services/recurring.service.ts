// src/server/services/recurring.service.ts
import { prisma } from '@/lib/prisma'
import { RecurrenceFrequency, RecurringTransactionStatus } from '@prisma/client'
import { addDays, addWeeks, addMonths, addYears, isAfter, startOfDay } from 'date-fns'

/**
 * Generate pending transactions from all active recurring transaction templates
 * This should be run daily via a cron job or background task
 */
export async function generatePendingRecurringTransactions() {
  const today = startOfDay(new Date())

  // Find all active recurring transactions that are due
  const dueRecurringTransactions = await prisma.recurringTransaction.findMany({
    where: {
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: {
        lte: today,
      },
    },
  })

  const results = {
    processed: 0,
    created: 0,
    errors: 0,
  }

  for (const recurring of dueRecurringTransactions) {
    try {
      results.processed++

      // Generate transaction
      await prisma.transaction.create({
        data: {
          userId: recurring.userId,
          accountId: recurring.accountId,
          date: recurring.nextScheduledDate,
          amount: recurring.amount,
          payee: recurring.payee,
          categoryId: recurring.categoryId,
          notes: recurring.notes,
          tags: recurring.tags,
          recurringTransactionId: recurring.id,
          isManual: false, // Auto-generated from recurring template
        },
      })

      results.created++

      // Calculate next scheduled date
      const nextDate = calculateNextScheduledDate(recurring)

      // Check if we've reached the end date
      if (recurring.endDate && isAfter(nextDate, recurring.endDate)) {
        // Mark as completed
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            status: RecurringTransactionStatus.COMPLETED,
            lastGeneratedDate: recurring.nextScheduledDate,
          },
        })
      } else {
        // Update with next scheduled date
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            lastGeneratedDate: recurring.nextScheduledDate,
            nextScheduledDate: nextDate,
          },
        })
      }
    } catch (error) {
      console.error(`Error generating transaction for recurring ${recurring.id}:`, error)
      results.errors++
    }
  }

  return results
}

/**
 * Calculate the next scheduled date for a recurring transaction
 */
function calculateNextScheduledDate(recurring: {
  nextScheduledDate: Date
  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number | null
  dayOfWeek?: number | null
}): Date {
  const currentDate = recurring.nextScheduledDate
  let nextDate: Date

  switch (recurring.frequency) {
    case RecurrenceFrequency.DAILY:
      nextDate = addDays(currentDate, recurring.interval)
      break

    case RecurrenceFrequency.WEEKLY:
      if (recurring.dayOfWeek !== null && recurring.dayOfWeek !== undefined) {
        // Find next occurrence of the specified day of week
        nextDate = addWeeks(currentDate, recurring.interval)
        // Adjust to correct day of week if needed
        const targetDay = recurring.dayOfWeek
        const currentDay = nextDate.getDay()
        if (currentDay !== targetDay) {
          const daysToAdd = (targetDay - currentDay + 7) % 7
          nextDate = addDays(nextDate, daysToAdd)
        }
      } else {
        nextDate = addWeeks(currentDate, recurring.interval)
      }
      break

    case RecurrenceFrequency.BIWEEKLY:
      if (recurring.dayOfWeek !== null && recurring.dayOfWeek !== undefined) {
        nextDate = addWeeks(currentDate, recurring.interval * 2)
        const targetDay = recurring.dayOfWeek
        const currentDay = nextDate.getDay()
        if (currentDay !== targetDay) {
          const daysToAdd = (targetDay - currentDay + 7) % 7
          nextDate = addDays(nextDate, daysToAdd)
        }
      } else {
        nextDate = addWeeks(currentDate, recurring.interval * 2)
      }
      break

    case RecurrenceFrequency.MONTHLY:
      nextDate = addMonths(currentDate, recurring.interval)
      if (recurring.dayOfMonth !== null && recurring.dayOfMonth !== undefined) {
        if (recurring.dayOfMonth === -1) {
          // Last day of month
          const year = nextDate.getFullYear()
          const month = nextDate.getMonth()
          nextDate = new Date(year, month + 1, 0) // Last day of the month
        } else {
          // Specific day of month
          nextDate.setDate(Math.min(recurring.dayOfMonth, getDaysInMonth(nextDate)))
        }
      }
      break

    case RecurrenceFrequency.YEARLY:
      nextDate = addYears(currentDate, recurring.interval)
      break

    default:
      throw new Error(`Unknown frequency: ${recurring.frequency}`)
  }

  return startOfDay(nextDate)
}

/**
 * Get number of days in a month for a given date
 */
function getDaysInMonth(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Generate transactions for a specific user (useful for testing)
 */
export async function generateRecurringTransactionsForUser(userId: string) {
  const today = startOfDay(new Date())

  const dueRecurringTransactions = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      status: RecurringTransactionStatus.ACTIVE,
      nextScheduledDate: {
        lte: today,
      },
    },
  })

  const results = {
    processed: 0,
    created: 0,
    errors: 0,
  }

  for (const recurring of dueRecurringTransactions) {
    try {
      results.processed++

      await prisma.transaction.create({
        data: {
          userId: recurring.userId,
          accountId: recurring.accountId,
          date: recurring.nextScheduledDate,
          amount: recurring.amount,
          payee: recurring.payee,
          categoryId: recurring.categoryId,
          notes: recurring.notes,
          tags: recurring.tags,
          recurringTransactionId: recurring.id,
          isManual: false,
        },
      })

      results.created++

      const nextDate = calculateNextScheduledDate(recurring)

      if (recurring.endDate && isAfter(nextDate, recurring.endDate)) {
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            status: RecurringTransactionStatus.COMPLETED,
            lastGeneratedDate: recurring.nextScheduledDate,
          },
        })
      } else {
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            lastGeneratedDate: recurring.nextScheduledDate,
            nextScheduledDate: nextDate,
          },
        })
      }
    } catch (error) {
      console.error(`Error generating transaction for recurring ${recurring.id}:`, error)
      results.errors++
    }
  }

  return results
}
