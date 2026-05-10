import type { ApiEnvelope } from '@/types/api'

export type TransactionType = "income" | "expense" | "savings"

export type TransactionSource = "manual" | "recurring" | "transfer" | "external"
export type TransactionTypeFilter = "all" | TransactionType
export type TransactionSourceFilter = "all" | TransactionSource

export type AdvancedFilterState = {
  type: TransactionTypeFilter
  source: TransactionSourceFilter
  account_id: string
  category_id: string
  date_from: string
  date_to: string
  amount_min: string
  amount_max: string
}

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilterState = {
  type: "all",
  source: "all",
  account_id: "",
  category_id: "",
  date_from: "",
  date_to: "",
  amount_min: "",
  amount_max: "",
}

export type TransactionAccount = {
  account_id: number
  name: string
  currency_code: string
}

export type TransactionCategoryGroup = {
  group_id: number
  name: string
  type: TransactionType
  icon_key: string | null
}

export type TransactionCategory = {
  category_id: number
  group_id: number
  name: string
  type: TransactionType
  icon_key: string | null
  group: TransactionCategoryGroup | null
}

export type TransactionListItem = {
  transaction_id: number
  amount_minor: number | string
  currency: string
  type: TransactionType
  source: TransactionSource
  description: string | null
  metadata: Record<string, unknown> | null
  timestamp: string
  account: TransactionAccount | null
  category: TransactionCategory | null
}

export type TransactionsListData = {
  items: TransactionListItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type TransactionSummaryBucket = {
  currency_code: string
  income_minor: number
  expense_minor: number
  savings_minor: number
  net_cash_flow_minor: number
  transaction_count: number
}

export type TransactionSummaryData = {
  totals: {
    income_minor: number
    expense_minor: number
    savings_minor: number
    net_cash_flow_minor: number
    transaction_count: number
    currency_code: string | null
  }
  currency_breakdown: TransactionSummaryBucket[]
}

export type TransactionsQueryParams = {
  q?: string
  type?: TransactionType
  source?: TransactionSource
  account_id?: number
  category_id?: number
  amount_min?: number
  amount_max?: number
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
  sort_by?: "timestamp" | "amount_minor"
  sort_order?: "asc" | "desc"
}

export type AccountFilterOption = {
  account_id: number
  name: string
  currency_code?: string
  is_active?: boolean
}

export type CategoryFilterOption = {
  category_id: number
  group_id: number | null
  name: string
  type: TransactionType
  icon_key?: string | null
  group?: {
    group_id: number
    name: string
    type: TransactionType
    icon_key?: string | null
  } | null
  is_active?: boolean
}

export type ApiSuccess<T> = ApiEnvelope<T>
