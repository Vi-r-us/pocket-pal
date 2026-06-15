import type { BudgetCategoryType } from "./types"

export const BUDGET_CATEGORY_TYPES: BudgetCategoryType[] = [
  "expense",
  "income",
  "savings",
]

export const BUDGET_TYPE_PALETTES: Record<BudgetCategoryType, string[]> = {
  expense: [
    "#7F1D1D",
    "#991B1B",
    "#B91C1C",
    "#DC2626",
    "#EF4444",
    "#FCA5A5",
  ],
  income: [
    "#14532D",
    "#166534",
    "#15803D",
    "#16A34A",
    "#22C55E",
    "#86EFAC",
  ],
  savings: [
    "#312E81",
    "#3730A3",
    "#4338CA",
    "#4F46E5",
    "#6366F1",
    "#A5B4FC",
  ],
}

export const BUDGET_BAR_SERIES_COLORS: Record<
  BudgetCategoryType,
  { budget: string; actual: string }
> = {
  expense: {
    budget: "#7F1D1D",
    actual: "#F87171",
  },
  income: {
    budget: "#14532D",
    actual: "#4ADE80",
  },
  savings: {
    budget: "#312E81",
    actual: "#818CF8",
  },
}
