import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react"
import { ArrowLeftRight, BanknoteArrowDown, BanknoteArrowUp, Filter, Hash, Loader2, Search, Trash2 } from "lucide-react"
import { type ColumnDef, functionalUpdate, type OnChangeFn, type SortingState } from "@tanstack/react-table"
import {
  CreateTransactionModal,
  type TransactionModalMode,
  TransactionRowActions,
  TransactionsFiltersSheet,
} from "@/features/transactions/components"
import { MetricStatCard } from "@/components/cards/MetricStatCard"
import { DataTableBase, DataTablePagination, DataTableToolbar } from "@/components/data-table"
import { GridItem } from "@/components/layout/GridItem"
import { AppModal } from "@/components/modals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api } from "@/lib/api"
import { APP_HEADER_PRIMARY_ACTION_EVENT, type AppHeaderPrimaryActionDetail } from "@/constants/headerActions"
import { getInlineErrorMessage } from "@/lib/errors/normalize"
import { resolveCategoryIcon } from "@/lib/categoryIcons"
import { cn } from "@/lib/utils"
import { DEFAULT_ADVANCED_FILTERS } from "@/types/transaction"
import type {
  AccountFilterOption,
  AdvancedFilterState,
  ApiSuccess,
  CategoryFilterOption,
  TransactionListItem,
  TransactionSummaryData,
  TransactionsListData,
  TransactionsQueryParams,
  TransactionTypeFilter,
  TransactionType,
} from "@/types/transaction"
import { Separator } from "@/components/ui/separator"

type TransactionTableRow = {
  transaction_id: number
  timestamp: string
  description: string
  amount_minor: number
  currency: string
  type: TransactionType
  source: string
  account_name: string
  account_currency_code: string | null
  category_name: string
  category_icon_key: string | null
  category_group_icon_key: string | null
  account_id: number | null
  category_id: number | null
  raw_transaction: TransactionListItem
}

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  savings: "Savings",
}

const TYPE_BADGE_CLASSES: Record<TransactionType, string> = {
  income: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 glass-border glass-highlight rounded-full",
  expense: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 glass-border glass-highlight rounded-full",
  savings: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 glass-border glass-highlight rounded-full",
}

const TYPE_AMOUNT_TEXT_CLASSES: Record<TransactionType, string> = {
  income: "text-emerald-700 dark:text-emerald-300",
  expense: "text-rose-700 dark:text-rose-300",
  savings: "text-blue-700 dark:text-blue-300",
}

const formatSourceLabel = (source: string) => source.charAt(0).toUpperCase() + source.slice(1)

const getSavingsTransferBadgeLabel = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata || metadata.savings_mode !== "transfer") return null
  if (metadata.transfer_leg === "mirror") return "Transfer in"
  if (
    metadata.transfer_destination === "external" ||
    (metadata.transfer_leg === "primary" && metadata.destination_account_id == null)
  ) {
    return "External"
  }
  if (metadata.transfer_leg === "primary") return "Transfer"
  return null
}

const toIntegerOrNull = (value: string) => {
  const normalized = value.trim()
  if (!normalized) return null
  if (!/^-?\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const getActiveFilterCount = (filters: AdvancedFilterState) => {
  let count = 0
  if (filters.type !== "all") count += 1
  if (filters.source !== "all") count += 1
  if (filters.account_id) count += 1
  if (filters.category_id) count += 1
  if (filters.date_from) count += 1
  if (filters.date_to) count += 1
  if (filters.amount_min) count += 1
  if (filters.amount_max) count += 1
  return count
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>()

const getCurrencyFormatter = (currency: string) => {
  const normalizedCurrency = currency?.trim().toUpperCase() || "USD"
  const cached = currencyFormatterCache.get(normalizedCurrency)
  if (cached) return cached

  try {
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    })
    currencyFormatterCache.set(normalizedCurrency, formatter)
    return formatter
  } catch {
    const fallback = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    })
    currencyFormatterCache.set(normalizedCurrency, fallback)
    return fallback
  }
}

const toMinorNumber = (value: number | string) => {
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toCurrency = (minor: number | string, currency: string) => {
  const formatter = getCurrencyFormatter(currency)
  return formatter.format(toMinorNumber(minor) / 100)
}

const toDateLabel = (timestamp: string) =>
  new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

const toTimeLabel = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

const mapTransactionRow = (transaction: TransactionListItem): TransactionTableRow => {
  return {
    transaction_id: transaction.transaction_id,
    timestamp: transaction.timestamp,
    description: transaction.description?.trim() || "No description",
    amount_minor: toMinorNumber(transaction.amount_minor),
    currency: transaction.currency,
    type: transaction.type,
    source: transaction.source,
    account_name: transaction.account?.name || "Unassigned account",
    account_currency_code: transaction.account?.currency_code || null,
    category_name: transaction.category?.name || "Uncategorized",
    category_icon_key: transaction.category?.icon_key || null,
    category_group_icon_key: transaction.category?.group?.icon_key || null,
    account_id: transaction.account?.account_id ?? null,
    category_id: transaction.category?.category_id ?? null,
    raw_transaction: transaction,
  }
}

const TransactionCardsLoading = () => {
  return (
    <div className="space-y-3 md:hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

type MobileTransactionCardsProps = {
  rows: TransactionTableRow[]
  selectedTransactionIds: Set<number>
  onToggleSelectTransaction: (transactionId: number) => void
  onEditTransaction: (transaction: TransactionListItem) => void
  onCloneTransaction: (transaction: TransactionListItem) => void
  onDeleteTransaction: (transactionId: number) => void
}

const MobileTransactionCards = ({
  rows,
  selectedTransactionIds,
  onToggleSelectTransaction,
  onEditTransaction,
  onCloneTransaction,
  onDeleteTransaction,
}: MobileTransactionCardsProps) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground md:hidden">
        No transactions found for this filter.
      </div>
    )
  }

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => {
        const Icon = resolveCategoryIcon(row.category_icon_key, row.category_group_icon_key)
        const isSelected = selectedTransactionIds.has(row.transaction_id)
        return (
          <Card key={row.transaction_id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked === "indeterminate") return
                      onToggleSelectTransaction(row.transaction_id)
                    }}
                    aria-label={`Select transaction ${row.transaction_id}`}
                  />
                  Select
                </label>
                <TransactionRowActions
                  onEdit={() => onEditTransaction(row.raw_transaction)}
                  onClone={() => onCloneTransaction(row.raw_transaction)}
                  onDelete={() => onDeleteTransaction(row.transaction_id)}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">
                    {toDateLabel(row.timestamp)} at {toTimeLabel(row.timestamp)}
                  </p>
                  <p className="truncate text-base text-wrap font-medium">{row.description}</p>
                </div>
                <p className={cn("shrink-0 text-sm font-semibold", TYPE_AMOUNT_TEXT_CLASSES[row.type])}>
                  {toCurrency(row.amount_minor, row.currency)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={TYPE_BADGE_CLASSES[row.type]}>
                  {TYPE_LABELS[row.type]}
                </Badge>
                {getSavingsTransferBadgeLabel(row.raw_transaction.metadata) ? (
                  <Badge variant="secondary" className="rounded-full">
                    {getSavingsTransferBadgeLabel(row.raw_transaction.metadata)}
                  </Badge>
                ) : null}
                <Badge variant="ghost">{formatSourceLabel(row.source)}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="size-3.5" aria-hidden />
                  {row.category_name}
                </span>
                <Separator orientation="vertical" className="h-3.5 w-px bg-border" />
                <span>{row.account_name}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export const TransactionsPage = () => {
  const [transactionModalKey, setTransactionModalKey] = useState(0)
  const [transactionModalMode, setTransactionModalMode] = useState<TransactionModalMode>("create")
  const [transactionToEditOrClone, setTransactionToEditOrClone] = useState<TransactionListItem | null>(null)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(new Set())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTransactionIds, setDeleteTransactionIds] = useState<number[]>([])
  const [isDeletingTransactions, setIsDeletingTransactions] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: true }])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilterState>(DEFAULT_ADVANCED_FILTERS)
  const [draftFilters, setDraftFilters] = useState<AdvancedFilterState>(DEFAULT_ADVANCED_FILTERS)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [filterValidationError, setFilterValidationError] = useState("")
  const [filterOptionsError, setFilterOptionsError] = useState("")
  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(true)
  const [accountOptions, setAccountOptions] = useState<AccountFilterOption[]>([])
  const [categoryOptions, setCategoryOptions] = useState<CategoryFilterOption[]>([])
  const [rows, setRows] = useState<TransactionTableRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<TransactionSummaryData | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const sortBy = useMemo<"timestamp" | "amount_minor">(() => {
    const activeSort = sorting[0]
    if (!activeSort) return "timestamp"
    return activeSort.id === "amount_minor" ? "amount_minor" : "timestamp"
  }, [sorting])

  const sortOrder = useMemo<"asc" | "desc">(() => {
    const activeSort = sorting[0]
    if (!activeSort) return "desc"
    return activeSort.desc ? "desc" : "asc"
  }, [sorting])

  useEffect(() => {
    const handleHeaderPrimaryAction = (event: Event) => {
      const customEvent = event as CustomEvent<AppHeaderPrimaryActionDetail>
      if (customEvent.detail?.actionKey !== "create-transaction") {
        return
      }
      setTransactionModalMode("create")
      setTransactionToEditOrClone(null)
      setTransactionModalKey((value) => value + 1)
      setIsTransactionModalOpen(true)
    }

    window.addEventListener(APP_HEADER_PRIMARY_ACTION_EVENT, handleHeaderPrimaryAction)
    return () => {
      window.removeEventListener(APP_HEADER_PRIMARY_ACTION_EVENT, handleHeaderPrimaryAction)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    const fetchFilterOptions = async () => {
      setIsLoadingFilterOptions(true)
      try {
        const [accountsResponse, categoriesResponse] = await Promise.all([
          api.get<ApiSuccess<AccountFilterOption[]>>("/accounts"),
          api.get<ApiSuccess<CategoryFilterOption[]>>("/categories"),
        ])

        if (!isCurrent) return

        const nextAccounts = [...accountsResponse.data]
          .filter((account) => account.is_active ?? true)
          .sort((left, right) => left.name.localeCompare(right.name))

        const nextCategories = [...categoriesResponse.data]
          .filter((category) => category.is_active ?? true)
          .sort((left, right) => left.name.localeCompare(right.name))

        setAccountOptions(nextAccounts)
        setCategoryOptions(nextCategories)
        setFilterOptionsError("")
      } catch (error) {
        if (!isCurrent) return
        setFilterOptionsError(getInlineErrorMessage(error, "Could not load filter options"))
      } finally {
        if (isCurrent) {
          setIsLoadingFilterOptions(false)
        }
      }
    }

    fetchFilterOptions()

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    const fetchTransactionsSummary = async () => {
      const params: TransactionsQueryParams = {}

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
      if (appliedFilters.date_from) {
        params.date_from = appliedFilters.date_from
      }
      if (appliedFilters.date_to) {
        params.date_to = appliedFilters.date_to
      }

      try {
        const response = await api.get<ApiSuccess<TransactionSummaryData>>("/transactions/summary", { params })
        if (!isCurrent) return
        setSummary(response.data)
      } catch {
        if (!isCurrent) return
        setSummary(null)
      }
    }

    fetchTransactionsSummary()

    return () => {
      isCurrent = false
    }
  }, [appliedFilters, refreshKey, searchQuery])

  useEffect(() => {
    let isCurrent = true

    const fetchTransactions = async () => {
      setIsLoading(true)

      const params: TransactionsQueryParams = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      }

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

      if (appliedFilters.date_from) {
        params.date_from = appliedFilters.date_from
      }

      if (appliedFilters.date_to) {
        params.date_to = appliedFilters.date_to
      }

      try {
        const response = await api.get<ApiSuccess<TransactionsListData>>("/transactions", { params })
        if (!isCurrent) return

        const payload = response.data
        const nextRows = payload.items.map(mapTransactionRow)
        setRows(nextRows)
        setSelectedTransactionIds((previous) => {
          const visibleIds = new Set(nextRows.map((row) => row.transaction_id))
          return new Set([...previous].filter((id) => visibleIds.has(id)))
        })
        setTotal(payload.total)
        setTotalPages(Math.max(payload.totalPages, 1))
        setErrorMessage("")

        if (payload.page !== page) {
          setPage(payload.page)
        }
      } catch (error) {
        if (!isCurrent) return
        const message = getInlineErrorMessage(error, "Could not fetch transactions")
        setRows([])
        setTotal(0)
        setTotalPages(1)
        setErrorMessage(message)
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    fetchTransactions()

    return () => {
      isCurrent = false
    }
  }, [appliedFilters, limit, page, refreshKey, searchQuery, sortBy, sortOrder])

  const handleTypeFilterChange = (value: string) => {
    const nextType = (value || "all") as TransactionTypeFilter
    setAppliedFilters((previous) => ({ ...previous, type: nextType }))
    setDraftFilters((previous) => ({ ...previous, type: nextType }))
    setPage(1)
  }

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    setSearchQuery(searchInput.trim())
    setPage(1)
  }

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((previous) => functionalUpdate(updater, previous))
    setPage(1)
  }

  const handleRetry = () => {
    setRefreshKey((value) => value + 1)
  }

  const handleFilterSheetOpen = () => {
    setDraftFilters(appliedFilters)
    setFilterValidationError("")
    setIsFilterSheetOpen(true)
  }

  const handleFilterSheetOpenChange = (isOpen: boolean) => {
    setIsFilterSheetOpen(isOpen)
    if (!isOpen) {
      setFilterValidationError("")
      setDraftFilters(appliedFilters)
    }
  }

  const handleDraftFilterChange = (key: keyof AdvancedFilterState, value: string) => {
    setDraftFilters((previous) => ({ ...previous, [key]: value } as AdvancedFilterState))
    setFilterValidationError("")
  }

  const handleApplyFilters = () => {
    const amountMin = draftFilters.amount_min ? toIntegerOrNull(draftFilters.amount_min) : null
    const amountMax = draftFilters.amount_max ? toIntegerOrNull(draftFilters.amount_max) : null

    if (draftFilters.amount_min && amountMin === null) {
      setFilterValidationError("Amount min must be a valid integer in minor units")
      return
    }

    if (draftFilters.amount_max && amountMax === null) {
      setFilterValidationError("Amount max must be a valid integer in minor units")
      return
    }

    if (amountMin !== null && amountMax !== null && amountMin > amountMax) {
      setFilterValidationError("Amount min must be less than or equal to amount max")
      return
    }

    if (draftFilters.date_from && draftFilters.date_to && draftFilters.date_from > draftFilters.date_to) {
      setFilterValidationError("Date from must be earlier than or equal to date to")
      return
    }

    setAppliedFilters(draftFilters)
    setPage(1)
    setIsFilterSheetOpen(false)
  }

  const handleClearAllFilters = () => {
    setDraftFilters(DEFAULT_ADVANCED_FILTERS)
    setAppliedFilters(DEFAULT_ADVANCED_FILTERS)
    setFilterValidationError("")
    setPage(1)
    setIsFilterSheetOpen(false)
  }

  const openTransactionModal = (
    mode: TransactionModalMode,
    transaction: TransactionListItem | null = null,
  ) => {
    setTransactionModalMode(mode)
    setTransactionToEditOrClone(transaction)
    setTransactionModalKey((value) => value + 1)
    setIsTransactionModalOpen(true)
  }

  const handleToggleSelectTransaction = (transactionId: number) => {
    setSelectedTransactionIds((previous) => {
      const next = new Set(previous)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }

  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedTransactionIds.has(row.transaction_id))

  const handleToggleSelectAllVisible = () => {
    setSelectedTransactionIds((previous) => {
      const next = new Set(previous)
      if (allVisibleSelected) {
        rows.forEach((row) => next.delete(row.transaction_id))
      } else {
        rows.forEach((row) => next.add(row.transaction_id))
      }
      return next
    })
  }

  const openDeleteDialog = (transactionIds: number[]) => {
    if (transactionIds.length === 0) return
    setDeleteTransactionIds(transactionIds)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteTransactions = async () => {
    if (deleteTransactionIds.length === 0) return
    setIsDeletingTransactions(true)
    setErrorMessage("")

    try {
      const results = await Promise.allSettled(
        deleteTransactionIds.map((transactionId) => api.delete(`/transactions/${transactionId}`)),
      )
      const failures = results.filter((result) => result.status === "rejected")
      if (failures.length > 0) {
        setErrorMessage(`Could not delete ${failures.length} transaction(s). Please retry.`)
      }

      setSelectedTransactionIds((previous) => {
        const next = new Set(previous)
        deleteTransactionIds.forEach((transactionId) => next.delete(transactionId))
        return next
      })

      setRefreshKey((value) => value + 1)
    } catch {
      setErrorMessage("Could not delete transactions")
    } finally {
      setIsDeletingTransactions(false)
      setIsDeleteDialogOpen(false)
      setDeleteTransactionIds([])
    }
  }

  const isInitialLoading = isLoading && rows.length === 0
  const activeFilterCount = useMemo(() => getActiveFilterCount(appliedFilters), [appliedFilters])
  const summaryCurrency = summary?.totals.currency_code ?? null
  const hasMixedSummaryCurrency = !summaryCurrency && (summary?.currency_breakdown.length ?? 0) > 1
  const incomeValue = summaryCurrency ? toCurrency(summary?.totals.income_minor ?? 0, summaryCurrency) : "—"
  const expenseValue = summaryCurrency ? toCurrency(summary?.totals.expense_minor ?? 0, summaryCurrency) : "—"
  const netValue = summaryCurrency ? toCurrency(summary?.totals.net_cash_flow_minor ?? 0, summaryCurrency) : "—"
  const metricsFooter = hasMixedSummaryCurrency
    ? "Mixed currencies (open filters to narrow)"
    : summaryCurrency
      ? `From active filters in ${summaryCurrency}`
      : "From active filters"

  const transactionColumns: ColumnDef<TransactionTableRow>[] = [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={(checked) => {
              if (checked === "indeterminate") return
              handleToggleSelectAllVisible()
            }}
            aria-label="Select all visible transactions"
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Checkbox
            checked={selectedTransactionIds.has(row.original.transaction_id)}
            onCheckedChange={(checked) => {
              if (checked === "indeterminate") return
              handleToggleSelectTransaction(row.original.transaction_id)
            }}
            aria-label={`Select transaction ${row.original.transaction_id}`}
          />
        ),
      },
      {
        accessorKey: "timestamp",
        header: "Date",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{toDateLabel(row.original.timestamp)}</div>
            <div className="text-xs text-muted-foreground">{toTimeLabel(row.original.timestamp)}</div>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-[220px]">
            <p className="font-medium text-wrap text-ellipsis">{row.original.description}</p>
            <p className="text-xs text-muted-foreground">{row.original.account_name}</p>
          </div>
        ),
      },
      {
        accessorKey: "category_name",
        header: "Category",
        enableSorting: false,
        cell: ({ row }) => {
          const Icon = resolveCategoryIcon(row.original.category_icon_key, row.original.category_group_icon_key)
          return (
            <div className="inline-flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-wrap text-ellipsis">{row.original.category_name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "type",
        header: "Type / Source",
        enableSorting: false,
        cell: ({ row }) => {
          const transferBadge = getSavingsTransferBadgeLabel(row.original.raw_transaction.metadata)
          return (
            <div className="flex min-w-[6.25rem] flex-wrap items-center gap-2">
              <Badge variant="outline" className={TYPE_BADGE_CLASSES[row.original.type]}>
                {TYPE_LABELS[row.original.type]}
              </Badge>
              {transferBadge ? (
                <Badge variant="secondary" className="rounded-full">
                  {transferBadge}
                </Badge>
              ) : null}
              <Badge variant="ghost" className="text-wrap text-ellipsis">
                {formatSourceLabel(row.original.source)}
              </Badge>
            </div>
          )
        },
      },
      {
        accessorKey: "amount_minor",
        header: "Amount",
        enableSorting: true,
        cell: ({ row }) => (
          <span className={cn(TYPE_AMOUNT_TEXT_CLASSES[row.original.type])}>
            {toCurrency(row.original.amount_minor, row.original.currency)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <TransactionRowActions
            onEdit={() => openTransactionModal("edit", row.original.raw_transaction)}
            onClone={() => openTransactionModal("clone", row.original.raw_transaction)}
            onDelete={() => openDeleteDialog([row.original.transaction_id])}
          />
        ),
      },
    ]

  return (
    <>
      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="This period income"
          value={incomeValue}
          footer={metricsFooter}
          icon={<BanknoteArrowUp className="text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="This period expenses"
          value={expenseValue}
          footer={metricsFooter}
          icon={<BanknoteArrowDown className="text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Net cash flow"
          value={netValue}
          footer="Income minus expenses (active filters)"
          icon={<ArrowLeftRight className="text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Transactions"
          value={String(summary?.totals.transaction_count ?? total)}
          footer="In selected range"
          badge={
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Server data
            </span>
          }
          icon={<Hash className="text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} fill>
        <Card>
          <CardContent className="space-y-4">
            <DataTableToolbar
              leftSlot={
                <ToggleGroup
                  className="gap-2 rounded-lg"
                  type="single"
                  value={appliedFilters.type}
                  onValueChange={handleTypeFilterChange}
                >
                  <ToggleGroupItem
                    value="all"
                    aria-label="All transactions"
                    className={cn(
                      "!rounded-sm gap-2",
                      appliedFilters.type === "all" ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground"
                    )}
                  >
                    All
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="income"
                    aria-label="Income transactions"
                    className={cn(
                      "!rounded-sm gap-2",
                      appliedFilters.type === "income" ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground"
                    )}
                  >
                    Income
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="expense"
                    aria-label="Expense transactions"
                    className={cn(
                      "!rounded-sm gap-2",
                      appliedFilters.type === "expense" ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground"
                    )}
                  >
                    Expense
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="savings"
                    aria-label="Savings transactions"
                    className={cn(
                      "!rounded-sm gap-2",
                      appliedFilters.type === "savings" ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground"
                    )}
                  >
                    Savings
                  </ToggleGroupItem>
                </ToggleGroup>
              }
              rightSlot={
                <div className="flex items-center gap-2">
                  <label htmlFor="transactions-search" className="sr-only">
                    Search transactions
                  </label>
                  <div className="relative w-full sm:w-[280px] lg:w-[340px]">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      id="transactions-search"
                      type="search"
                      placeholder="Search description, category, account..."
                      value={searchInput}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full rounded-lg pl-9"
                      aria-label="Search transactions by description, category, or account"
                    />
                  </div>
                  <Button
                    className="rounded-lg gap-2"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFilterSheetOpen}
                    aria-label="Open advanced filters"
                  >
                    <Filter className="size-4 shrink-0" aria-hidden />
                    Filter
                    {activeFilterCount > 0 ? (
                      <Badge variant="secondary" className="h-5 rounded-full px-1.5">
                        {activeFilterCount}
                      </Badge>
                    ) : null}
                  </Button>
                </div>
              }
            />

            <TransactionsFiltersSheet
              open={isFilterSheetOpen}
              onOpenChange={handleFilterSheetOpenChange}
              draftFilters={draftFilters}
              onDraftFilterChange={handleDraftFilterChange}
              onApplyFilters={handleApplyFilters}
              onClearAllFilters={handleClearAllFilters}
              filterValidationError={filterValidationError}
              filterOptionsError={filterOptionsError}
              isLoadingFilterOptions={isLoadingFilterOptions}
              accountOptions={accountOptions}
              categoryOptions={categoryOptions}
            />

            {selectedTransactionIds.size > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  {selectedTransactionIds.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    className="glass glass-outline glass-border glass-highlight rounded-lg"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTransactionIds(new Set())}
                  >
                    Clear selection
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteDialog(Array.from(selectedTransactionIds))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete selected
                  </Button>
                </div>
              </div>
            ) : null}

            <CreateTransactionModal
              key={transactionModalKey}
              open={isTransactionModalOpen}
              onOpenChange={setIsTransactionModalOpen}
              mode={transactionModalMode}
              initialTransaction={transactionToEditOrClone}
              accountOptions={accountOptions}
              categoryOptions={categoryOptions}
              isLoadingOptions={isLoadingFilterOptions}
              onCompleted={() => {
                setPage(1)
                setRefreshKey((value) => value + 1)
              }}
            />

            {errorMessage ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <span>{errorMessage}</span>
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            ) : null}

            {isInitialLoading ? <TransactionCardsLoading /> : null}

            {!isInitialLoading ? (
              <MobileTransactionCards
                rows={rows}
                selectedTransactionIds={selectedTransactionIds}
                onToggleSelectTransaction={handleToggleSelectTransaction}
                onEditTransaction={(transaction) => openTransactionModal("edit", transaction)}
                onCloneTransaction={(transaction) => openTransactionModal("clone", transaction)}
                onDeleteTransaction={(transactionId) => openDeleteDialog([transactionId])}
              />
            ) : null}

            <div className="hidden md:block">
              <DataTableBase
                columns={transactionColumns}
                data={rows}
                sorting={sorting}
                onSortingChange={handleSortingChange}
                isLoading={isInitialLoading}
                emptyMessage="No transactions found for this filter."
              />
            </div>

            <DataTablePagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => {
                setLimit(nextLimit)
                setPage(1)
              }}
            />

            {isLoading && !isInitialLoading ? (
              <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Refreshing transactions...
              </p>
            ) : null}

            <AppModal
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              title={`Delete ${deleteTransactionIds.length > 1 ? "transactions" : "transaction"}?`}
              description="This action cannot be undone."
              size="sm"
              footer={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isDeletingTransactions}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteTransactions}
                    disabled={isDeletingTransactions}
                  >
                    {isDeletingTransactions ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </>
              }
            />
          </CardContent>
        </Card>
      </GridItem>
    </>
  )
}
