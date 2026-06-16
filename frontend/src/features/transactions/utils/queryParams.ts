import { yyyyMmToDateRange } from "@/lib/month"
import type {
  AdvancedFilterState,
  TransactionsQueryParams,
} from "@/types/transaction"

const toIntegerOrNull = (value: string) => {
  const normalized = value.trim()
  if (!normalized) return null
  if (!/^-?\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

type BuildTransactionQueryParamsArgs = {
  appliedFilters: AdvancedFilterState
  searchQuery: string
  selectedYyyyMm: number | null
  pagination?: Pick<
    TransactionsQueryParams,
    "page" | "limit" | "sort_by" | "sort_order"
  >
}

export const buildTransactionQueryParams = ({
  appliedFilters,
  searchQuery,
  selectedYyyyMm,
  pagination,
}: BuildTransactionQueryParamsArgs): TransactionsQueryParams => {
  const params: TransactionsQueryParams = { ...pagination }

  if (appliedFilters.type !== "all") {
    params.type = appliedFilters.type
  }

  if (searchQuery) {
    params.q = searchQuery
  }

  if (appliedFilters.source !== "all") {
    params.source = appliedFilters.source
  }

  if (appliedFilters.account_id) {
    const accountId = toIntegerOrNull(appliedFilters.account_id)
    if (accountId !== null) {
      params.account_id = accountId
    }
  }

  if (appliedFilters.category_id) {
    const categoryId = toIntegerOrNull(appliedFilters.category_id)
    if (categoryId !== null) {
      params.category_id = categoryId
    }
  }

  if (appliedFilters.amount_min) {
    const amountMin = toIntegerOrNull(appliedFilters.amount_min)
    if (amountMin !== null) {
      params.amount_min = amountMin
    }
  }

  if (appliedFilters.amount_max) {
    const amountMax = toIntegerOrNull(appliedFilters.amount_max)
    if (amountMax !== null) {
      params.amount_max = amountMax
    }
  }

  if (selectedYyyyMm !== null) {
    const { date_from, date_to } = yyyyMmToDateRange(selectedYyyyMm)
    params.date_from = date_from
    params.date_to = date_to
  } else {
    if (appliedFilters.date_from) {
      params.date_from = appliedFilters.date_from
    }
    if (appliedFilters.date_to) {
      params.date_to = appliedFilters.date_to
    }
  }

  return params
}
