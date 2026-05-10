import type { ApiEnvelope } from '@/types/api'

export type AccountType = "bank" | "cash" | "savings" | "credit_card"

export type AccountSortBy = "name" | "type" | "balance_minor" | "display_order" | "created_at" | "updated_at"
export type SortOrder = "asc" | "desc"

export type AccountCurrency = {
  code: string
  name: string
  symbol: string
  minor_unit: number
}

export type AccountListItem = {
  account_id: number
  name: string
  type: AccountType
  currency_code: string
  balance_minor: number | string
  opening_balance_minor: number | string
  institution_name?: string | null
  account_number_last4?: string | null
  notes?: string | null
  include_in_net_worth?: boolean
  display_order?: number
  icon_key?: string | null
  credit_limit_minor?: number | string | null
  statement_day?: number | null
  payment_due_day?: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  currency?: AccountCurrency | null
}

export type AccountsListData = {
  items: AccountListItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type AccountsQueryParams = {
  q?: string
  type?: AccountType
  is_active?: boolean
  page?: number
  limit?: number
  sort_by?: AccountSortBy
  sort_order?: SortOrder
}

export type UpsertAccountPayload = {
  name: string
  type: AccountType
  currency_code: string
  institution_name?: string | null
  account_number_last4?: string | null
  opening_balance_minor?: number
  notes?: string | null
  include_in_net_worth?: boolean
  display_order?: number
  icon_key?: string | null
  credit_limit_minor?: number | null
  statement_day?: number | null
  payment_due_day?: number | null
  is_active?: boolean
}

export type ApiSuccess<T> = ApiEnvelope<T>
