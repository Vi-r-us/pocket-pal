export type BudgetCategoryType = "income" | "expense" | "savings"

export type BudgetCloneRow = {
  category_id: number
  category_name: string
  category_type: BudgetCategoryType
  amount_minor: number
}

export type CloneConflictStrategy = "overwrite" | "skip"
