import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { format } from 'date-fns'
import { put } from '@vercel/blob'

// Import CSV generators
import {
  generateTransactionCSV,
  generateBudgetCSV,
  generateGoalCSV,
  generateAccountCSV,
  generateRecurringTransactionCSV,
  generateCategoryCSV,
} from '@/lib/csvExport'

// Import Excel generators
import {
  generateTransactionExcel,
  generateBudgetExcel,
  generateGoalExcel,
  generateAccountExcel,
  generateRecurringTransactionExcel,
  generateCategoryExcel,
} from '@/lib/xlsxExport'

// Import metadata generators
import { generateAIContext } from '@/lib/aiContextGenerator'
import { generateReadme } from '@/lib/readmeGenerator'
import { generateSummary } from '@/lib/summaryGenerator'
import { createExportZIP } from '@/lib/archiveExport'

const ExportFormatEnum = z.enum(['CSV', 'JSON', 'EXCEL'])

export const exportsRouter = router({
  exportTransactions: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch transactions with filters
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.startDate && input.endDate && {
            date: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          date: 'desc',
        },
        take: 10000, // Limit to prevent memory overflow
      })

      // Generate export based on format
      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateTransactionCSV(transactions)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break

        case 'JSON':
          content = JSON.stringify(transactions, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break

        case 'EXCEL':
          content = generateTransactionExcel(transactions)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      // Generate filename
      const dateStr = input.startDate && input.endDate
        ? `${format(input.startDate, 'yyyy-MM-dd')}-to-${format(input.endDate, 'yyyy-MM-dd')}`
        : format(new Date(), 'yyyy-MM-dd')
      const filename = `wealth-transactions-${dateStr}.${extension}`

      // Base64 encode for transport (handles both string and Buffer)
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: transactions.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportBudgets: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const budgets = await ctx.prisma.budget.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          category: true,
        },
        orderBy: {
          month: 'desc',
        },
      })

      // Calculate spent and remaining for each budget
      const budgetsWithCalcs = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await ctx.prisma.transaction.aggregate({
            where: {
              userId: ctx.user.id,
              categoryId: budget.categoryId,
              date: {
                gte: new Date(budget.month + '-01'),
                lt: new Date(
                  new Date(budget.month + '-01').setMonth(
                    new Date(budget.month + '-01').getMonth() + 1
                  )
                ),
              },
            },
            _sum: {
              amount: true,
            },
          })

          const spentAmount = spent._sum.amount ? Math.abs(Number(spent._sum.amount)) : 0
          const budgetAmount = Number(budget.amount)
          const remainingAmount = budgetAmount - spentAmount

          let status: 'UNDER_BUDGET' | 'AT_LIMIT' | 'OVER_BUDGET'
          if (remainingAmount > 0) status = 'UNDER_BUDGET'
          else if (remainingAmount === 0) status = 'AT_LIMIT'
          else status = 'OVER_BUDGET'

          return {
            month: budget.month,
            category: budget.category,
            budgetAmount,
            spentAmount,
            remainingAmount,
            status,
          }
        })
      )

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateBudgetCSV(budgetsWithCalcs)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(budgetsWithCalcs, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateBudgetExcel(budgetsWithCalcs)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-budgets-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: budgetsWithCalcs.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportGoals: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const goals = await ctx.prisma.goal.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          linkedAccount: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Calculate status for each goal
      const goalsWithStatus = goals.map((goal) => {
        const current = Number(goal.currentAmount)

        let status: string
        if (goal.isCompleted) {
          status = 'COMPLETED'
        } else if (current === 0) {
          status = 'NOT_STARTED'
        } else {
          status = 'IN_PROGRESS'
        }

        return {
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate,
          linkedAccount: goal.linkedAccount,
          status,
        }
      })

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateGoalCSV(goalsWithStatus)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(goalsWithStatus, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateGoalExcel(goalsWithStatus)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-goals-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: goalsWithStatus.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportAccounts: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: {
          userId: ctx.user.id,
        },
        orderBy: {
          name: 'asc',
        },
      })

      // Redact plaidAccessToken for security
      const sanitizedAccounts = accounts.map(({ plaidAccessToken: _plaidAccessToken, ...account }) => account)

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateAccountCSV(sanitizedAccounts)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(sanitizedAccounts, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateAccountExcel(sanitizedAccounts)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-accounts-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: sanitizedAccounts.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportRecurringTransactions: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const recurringTransactions = await ctx.prisma.recurringTransaction.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          category: true,
          account: true,
        },
        orderBy: {
          nextScheduledDate: 'asc',
        },
      })

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateRecurringTransactionCSV(recurringTransactions)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(recurringTransactions, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateRecurringTransactionExcel(recurringTransactions)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-recurring-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: recurringTransactions.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportCategories: protectedProcedure
    .input(z.object({
      format: ExportFormatEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const categories = await ctx.prisma.category.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          parent: true,
        },
        orderBy: {
          name: 'asc',
        },
      })

      let content: string | Buffer
      let mimeType: string
      let extension: string

      switch (input.format) {
        case 'CSV':
          content = generateCategoryCSV(categories)
          mimeType = 'text/csv;charset=utf-8'
          extension = 'csv'
          break
        case 'JSON':
          content = JSON.stringify(categories, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break
        case 'EXCEL':
          content = generateCategoryExcel(categories)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
      }

      const filename = `wealth-categories-${format(new Date(), 'yyyy-MM-dd')}.${extension}`
      const base64Content = Buffer.from(content).toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType,
        recordCount: categories.length,
        fileSize: Buffer.byteLength(content),
      }
    }),

  exportComplete: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx }) => {
      const startTime = Date.now()

      // Step 1: Fetch all data in parallel
      const [transactions, budgets, goals, accounts, recurringTransactions, categories] =
        await Promise.all([
          ctx.prisma.transaction.findMany({
            where: { userId: ctx.user.id },
            include: { category: true, account: true },
            orderBy: { date: 'desc' },
            take: 10000,
          }),
          ctx.prisma.budget.findMany({
            where: { userId: ctx.user.id },
            include: { category: true },
            orderBy: { month: 'desc' },
          }),
          ctx.prisma.goal.findMany({
            where: { userId: ctx.user.id },
            include: { linkedAccount: true },
            orderBy: { createdAt: 'desc' },
          }),
          ctx.prisma.account.findMany({
            where: { userId: ctx.user.id },
            orderBy: { name: 'asc' },
          }),
          ctx.prisma.recurringTransaction.findMany({
            where: { userId: ctx.user.id },
            include: { category: true, account: true },
            orderBy: { nextScheduledDate: 'asc' },
          }),
          ctx.prisma.category.findMany({
            where: { userId: ctx.user.id },
            include: { parent: true },
            orderBy: { name: 'asc' },
          }),
        ])

      // Step 2: Calculate budget details (spent, remaining, status)
      const budgetsWithCalcs = await Promise.all(
        budgets.map(async (budget) => {
          const spent = await ctx.prisma.transaction.aggregate({
            where: {
              userId: ctx.user.id,
              categoryId: budget.categoryId,
              date: {
                gte: new Date(budget.month + '-01'),
                lt: new Date(
                  new Date(budget.month + '-01').setMonth(
                    new Date(budget.month + '-01').getMonth() + 1
                  )
                ),
              },
            },
            _sum: { amount: true },
          })

          const spentAmount = spent._sum.amount ? Math.abs(Number(spent._sum.amount)) : 0
          const budgetAmount = Number(budget.amount)
          const remainingAmount = budgetAmount - spentAmount

          let status: 'UNDER_BUDGET' | 'AT_LIMIT' | 'OVER_BUDGET'
          if (remainingAmount > 0) status = 'UNDER_BUDGET'
          else if (remainingAmount === 0) status = 'AT_LIMIT'
          else status = 'OVER_BUDGET'

          return {
            month: budget.month,
            category: budget.category,
            budgetAmount,
            spentAmount,
            remainingAmount,
            status,
          }
        })
      )

      // Step 3: Calculate goal status
      const goalsWithStatus = goals.map((goal) => ({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        linkedAccount: goal.linkedAccount,
        status: goal.isCompleted ? 'COMPLETED' :
                Number(goal.currentAmount) === 0 ? 'NOT_STARTED' : 'IN_PROGRESS',
      }))

      // Step 4: Sanitize accounts (remove sensitive tokens)
      const sanitizedAccounts = accounts.map(({ plaidAccessToken: _, ...account }) => account)

      // Step 5: Generate all file contents
      const transactionsCSV = generateTransactionCSV(transactions)
      const budgetsCSV = generateBudgetCSV(budgetsWithCalcs)
      const goalsCSV = generateGoalCSV(goalsWithStatus)
      const accountsCSV = generateAccountCSV(sanitizedAccounts)
      const recurringCSV = generateRecurringTransactionCSV(recurringTransactions)
      const categoriesCSV = generateCategoryCSV(categories)

      // Step 6: Calculate date range from transactions
      const dateRange = transactions.length > 0 ? {
        earliest: new Date(Math.min(...transactions.map(t => t.date.getTime()))),
        latest: new Date(Math.max(...transactions.map(t => t.date.getTime()))),
      } : null

      // Step 7: Generate metadata files
      const recordCounts = {
        transactions: transactions.length,
        budgets: budgets.length,
        goals: goals.length,
        accounts: accounts.length,
        recurringTransactions: recurringTransactions.length,
        categories: categories.length,
      }

      const aiContextJSON = generateAIContext({
        user: { currency: ctx.user.currency || 'NIS', timezone: 'America/New_York' },
        categories,
        statistics: recordCounts,
        dateRange,
      })

      const readmeMD = generateReadme({
        user: {
          email: ctx.user.email || 'user@example.com',
          currency: ctx.user.currency || 'NIS',
          timezone: 'America/New_York',
        },
        statistics: recordCounts,
        dateRange,
        exportedAt: new Date(),
      })

      // Step 8: Create ZIP package (with placeholder summary - will update fileSize later)
      const zipBuffer = await createExportZIP({
        'README.md': readmeMD,
        'ai-context.json': aiContextJSON,
        'summary.json': generateSummary({
          user: {
            email: ctx.user.email || 'user@example.com',
            currency: ctx.user.currency || 'NIS',
            timezone: 'America/New_York',
          },
          recordCounts,
          dateRange,
          fileSize: 0, // Will be updated after ZIP creation
        }),
        'transactions.csv': transactionsCSV,
        'budgets.csv': budgetsCSV,
        'goals.csv': goalsCSV,
        'accounts.csv': accountsCSV,
        'recurring-transactions.csv': recurringCSV,
        'categories.csv': categoriesCSV,
      })

      const fileSize = zipBuffer.byteLength
      const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + count, 0)

      // Step 9: Upload to Vercel Blob Storage
      let blobKey: string | null = null
      try {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss')
          const path = `exports/${ctx.user.id}/complete-${timestamp}.zip`

          const blob = await put(path, zipBuffer, {
            access: 'public',
            contentType: 'application/zip',
          })

          blobKey = blob.url
          console.log(`Export uploaded to Blob Storage: ${blobKey}`)
        } else {
          console.warn('BLOB_READ_WRITE_TOKEN not set, export will not be cached')
        }
      } catch (error) {
        console.error('Blob upload failed, export will not be cached:', error)
        // Continue without caching (graceful degradation)
      }

      // Step 10: Record to ExportHistory
      await ctx.prisma.exportHistory.create({
        data: {
          userId: ctx.user.id,
          exportType: 'COMPLETE',
          format: 'ZIP',
          dataType: null,
          recordCount: totalRecords,
          fileSize,
          blobKey,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })

      const duration = Date.now() - startTime
      console.log(`Complete export generated: ${duration}ms, ${totalRecords} records, ${fileSize} bytes`)

      // Step 11: Return ZIP as base64 for client download
      const filename = `wealth-complete-export-${format(new Date(), 'yyyy-MM-dd')}.zip`
      const base64Content = zipBuffer.toString('base64')

      return {
        content: base64Content,
        filename,
        mimeType: 'application/zip',
        recordCount: totalRecords,
        fileSize,
      }
    }),

  getExportHistory: protectedProcedure
    .query(async ({ ctx }) => {
      const history = await ctx.prisma.exportHistory.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10, // Last 10 exports
      })

      return history.map((exp) => ({
        id: exp.id,
        type: exp.exportType === 'COMPLETE' ? 'Complete' : 'Quick',
        format: exp.format,
        dataType: exp.dataType, // null for COMPLETE exports
        recordCount: exp.recordCount,
        fileSize: exp.fileSize,
        createdAt: exp.createdAt,
        expiresAt: exp.expiresAt,
        isExpired: exp.expiresAt < new Date(),
        blobKey: exp.blobKey,
      }))
    }),

  redownloadExport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch export record
      const exportRecord = await ctx.prisma.exportHistory.findUnique({
        where: { id: input.id },
      })

      if (!exportRecord) {
        throw new Error('Export not found')
      }

      // Verify ownership
      if (exportRecord.userId !== ctx.user.id) {
        throw new Error('Unauthorized')
      }

      // Check if expired
      if (exportRecord.expiresAt < new Date()) {
        throw new Error('Export has expired. Please generate a fresh export.')
      }

      // Check if blob exists
      if (!exportRecord.blobKey) {
        throw new Error('Export not cached. Please generate a fresh export.')
      }

      // Return blob URL for direct download
      return {
        downloadUrl: exportRecord.blobKey,
        filename: `wealth-export-${format(exportRecord.createdAt, 'yyyy-MM-dd')}.${exportRecord.format.toLowerCase()}`,
      }
    }),
})
