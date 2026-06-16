export type BudgetCategoryType = "income" | "expense" | "savings"

export type BudgetCategoryFilterType = BudgetCategoryType | "all"

export type BudgetCloneRow = {
  category_id: number
  category_name: string
  category_type: BudgetCategoryType
  amount_minor: number
}

export type CloneConflictStrategy = "overwrite" | "skip"

export type BudgetSummaryData = {
  summaries: Array<{
    budget_id: number
    category_id: number
    category: {
      category_id: number
      name: string
      type: string
    } | null
    category_type?: string | null
    amount_minor: number | string
    spent_minor: number | string
    remaining_minor: number | string
  }>
  totals: {
    budget_minor: number | string
    spent_minor: number | string
    savings_minor: number | string
    remaining_minor: number | string
    currency_code: string | null
  }
  yyyy_mm: number
}

export type BudgetVsActualDataPoint = {
  category: string
  budget_minor: number
  actual_minor: number
}

export type BudgetCategoryTableRow = {
  category_id: number
  category_name: string
  category_type: BudgetCategoryType
  budget_minor: number
  spent_minor: number
  remaining_minor: number
  progress_percent: number
  progress_percent_for_bar: number
}

export type BudgetSummaryWithType = BudgetSummaryData["summaries"][number] & {
  normalized_type: BudgetCategoryType
}
