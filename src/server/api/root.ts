import { router } from './trpc'
import { categoriesRouter } from './routers/categories.router'
import { accountsRouter } from './routers/accounts.router'
import { plaidRouter } from './routers/plaid.router'
import { transactionsRouter } from './routers/transactions.router'
import { recurringRouter } from './routers/recurring.router'
import { budgetsRouter } from './routers/budgets.router'
import { analyticsRouter } from './routers/analytics.router'
import { goalsRouter } from './routers/goals.router'
import { usersRouter } from './routers/users.router'
import { adminRouter } from './routers/admin.router'
import { exportsRouter } from './routers/exports.router'
import { bankConnectionsRouter } from './routers/bankConnections.router'

export const appRouter = router({
  categories: categoriesRouter,
  accounts: accountsRouter,
  plaid: plaidRouter,
  transactions: transactionsRouter,
  recurring: recurringRouter,
  budgets: budgetsRouter,
  analytics: analyticsRouter,
  goals: goalsRouter,
  users: usersRouter,
  admin: adminRouter,
  exports: exportsRouter,
  bankConnections: bankConnectionsRouter,
})

export type AppRouter = typeof appRouter
