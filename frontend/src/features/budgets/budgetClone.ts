import { api } from "@/lib/api"
import type { ApiEnvelope } from "@/types/api"
import type {
  BudgetCloneRow,
  BudgetCategoryType,
  CloneConflictStrategy,
} from "./types"
import { normalizeCategoryType, toMinorNumber } from "./utils"

type BudgetMonthResponse = {
  budgets: Array<{
    category_id: number
    amount_minor: number | string
    category?: { category_id: number; name: string; type: string } | null
  }>
  currency_code: string | null
  yyyy_mm: number
}

export const CATEGORY_TYPE_LABELS: Record<BudgetCategoryType, string> = {
  expense: "Expense",
  income: "Income",
  savings: "Savings",
}

export async function fetchBudgetMonthCategoryIds(
  yyyyMm: number,
): Promise<number[]> {
  const response = await api.get<ApiEnvelope<BudgetMonthResponse>>(
    `/budgets/month/${yyyyMm}`,
  )
  return (response.data.budgets ?? []).map((budget) => budget.category_id)
}

export async function putCategoryBudgets(
  yyyyMm: number,
  categoryBudgets: Array<{ category_id: number; amount_minor: number }>,
) {
  await api.put<ApiEnvelope<unknown>>(`/budgets/month/${yyyyMm}`, {
    categoryBudgets,
  })
}

export function buildPeriodClonePayload(
  sourceRows: BudgetCloneRow[],
  existingTargetCategoryIds: number[],
  strategy: CloneConflictStrategy,
) {
  const rows =
    strategy === "overwrite"
      ? sourceRows
      : sourceRows.filter(
          (row) => !existingTargetCategoryIds.includes(row.category_id),
        )

  return rows.map((row) => ({
    category_id: row.category_id,
    amount_minor: row.amount_minor,
  }))
}

export function mapSummaryToCloneRows(
  summaries: Array<{
    category_id: number
    amount_minor: number | string
    category_type?: string | null
    category?: { name: string; type: string } | null
  }>,
): BudgetCloneRow[] {
  return summaries
    .map((item) => ({
      category_id: item.category_id,
      category_name: item.category?.name?.trim() || "Uncategorized",
      category_type: normalizeCategoryType(
        item.category_type ?? item.category?.type,
      ),
      amount_minor: Math.max(0, toMinorNumber(item.amount_minor)),
    }))
    .filter((row) => row.amount_minor > 0)
}
