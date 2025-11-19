// Budget Alert Type Definitions

export const ALERT_THRESHOLDS = [75, 90, 100] as const
export type AlertThreshold = typeof ALERT_THRESHOLDS[number]

export interface BudgetAlertResult {
  budgetId: string
  categoryName: string
  threshold: AlertThreshold
  percentage: number
  spentAmount: number
  budgetAmount: number
}
