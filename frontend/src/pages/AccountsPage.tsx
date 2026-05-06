import { Hash, Landmark, PiggyBank, Wallet } from "lucide-react"
import { type ColumnDef, type OnChangeFn, type SortingState } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { MetricStatCard, type MetricTrend } from "@/components/cards/MetricStatCard"
import { DataTableBase, DataTablePagination, DataTableToolbar } from "@/components/data-table"
import { GridItem } from "@/components/layout/GridItem"
import { AccountRowActions, CreateAccountModal, type AccountModalMode } from "@/features/accounts/components"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { APP_HEADER_PRIMARY_ACTION_EVENT, type AppHeaderPrimaryActionDetail } from "@/constants/headerActions"
import { ApiError, api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type {
  AccountListItem,
  AccountsListData,
  AccountSortBy,
  ApiSuccess,
  SortOrder,
} from "@/types/account"
import type { TransactionSummaryData } from "@/types/transaction"

type CurrencyTotals = Map<string, { amountMinor: number; minorUnit: number }>

const currencyFormatterCache = new Map<string, Intl.NumberFormat>()

const getCurrencyFormatter = (currency: string) => {
  const normalizedCurrency = currency.trim().toUpperCase() || "USD"
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

const getSafeMinorUnit = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value)) return 2
  if (value < 0 || value > 6) return 2
  return value
}

const formatMinorAmount = (amountMinor: number, currencyCode: string, minorUnit = 2) => {
  const divisor = 10 ** minorUnit
  return getCurrencyFormatter(currencyCode).format(amountMinor / divisor)
}

const buildCurrencyTotals = (accounts: AccountListItem[], predicate: (account: AccountListItem) => boolean): CurrencyTotals => {
  const totals: CurrencyTotals = new Map()

  accounts.forEach((account) => {
    if (!predicate(account)) return

    const code = account.currency_code?.trim().toUpperCase()
    if (!code) return

    const nextAmount = toMinorNumber(account.balance_minor)
    const minorUnit = getSafeMinorUnit(account.currency?.minor_unit)
    const current = totals.get(code)

    if (!current) {
      totals.set(code, { amountMinor: nextAmount, minorUnit })
      return
    }

    totals.set(code, {
      amountMinor: current.amountMinor + nextAmount,
      minorUnit: current.minorUnit,
    })
  })

  return totals
}

const getSingleCurrencyCode = (totals: CurrencyTotals) => {
  const codes = [...totals.keys()]
  if (codes.length !== 1) return null
  return codes[0]
}

const formatSingleCurrencyTotal = (totals: CurrencyTotals) => {
  const code = getSingleCurrencyCode(totals)
  if (!code) return "—"

  const total = totals.get(code)
  if (!total) return "—"

  return formatMinorAmount(total.amountMinor, code, total.minorUnit)
}

const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (!(error instanceof ApiError)) return fallbackMessage
  if (typeof error.data === "string" && error.data.trim()) return error.data

  if (error.data && typeof error.data === "object") {
    const message = (error.data as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message
  }

  return error.message || fallbackMessage
}

const getCurrentMonthDateRange = () => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  return {
    date_from: monthStart.toISOString(),
    date_to: monthEnd.toISOString(),
  }
}

const AccountsMetricsLoading = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <GridItem key={index} span={12} mdSpan={6} lgSpan={3} fill>
          <MetricStatCard
            title={<Skeleton className="h-4 w-24" />}
            value={<Skeleton className="h-8 w-32" />}
            footer={<Skeleton className="h-3 w-28" />}
          />
        </GridItem>
      ))}
    </>
  )
}

type AccountTableRow = AccountListItem
type AccountCardsListProps = {
  rows: AccountTableRow[]
  isLoading: boolean
  onEdit: (account: AccountListItem) => void
  onToggleActive: (account: AccountListItem) => void
}

const maskAccountNumber = (last4: string | null | undefined) => {
  if (!last4) return "—"
  return `•••• ${last4}`
}

const AccountCardsLoading = () => {
  return (
    <div className="space-y-3 lg:hidden">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const AccountCardsList = ({ rows, isLoading, onEdit, onToggleActive }: AccountCardsListProps) => {
  if (isLoading) {
    return <AccountCardsLoading />
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground lg:hidden">
        No accounts found.
      </div>
    )
  }

  return (
    <div className="space-y-3 lg:hidden">
      {rows.map((account) => {
        const currencyCode = account.currency_code || "USD"
        const minorUnit = getSafeMinorUnit(account.currency?.minor_unit)
        const balanceLabel = formatMinorAmount(toMinorNumber(account.balance_minor), currencyCode, minorUnit)

        return (
          <Card key={account.account_id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.institution_name || "No institution"}</p>
                </div>
                <AccountRowActions
                  isActive={account.is_active}
                  onEdit={() => onEdit(account)}
                  onToggleActive={() => onToggleActive(account)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="capitalize">{account.type.replace("_", " ")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p>{maskAccountNumber(account.account_number_last4)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p>{balanceLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Change</p>
                  <Badge variant="secondary" className="rounded-full">
                    —
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    account.is_active
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-muted-foreground/40 bg-muted text-muted-foreground"
                  )}
                >
                  {account.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

const mapSortBy = (sorting: SortingState): AccountSortBy | undefined => {
  const activeSort = sorting[0]
  if (!activeSort) return undefined

  if (activeSort.id === "name") return "name"
  if (activeSort.id === "type") return "type"
  if (activeSort.id === "balance_minor") return "balance_minor"
  return undefined
}

const mapSortOrder = (sorting: SortingState): SortOrder | undefined => {
  const activeSort = sorting[0]
  if (!activeSort) return undefined
  return activeSort.desc ? "desc" : "asc"
}

export const AccountsPage = () => {
  const [accountsForMetrics, setAccountsForMetrics] = useState<AccountListItem[]>([])
  const [monthSummary, setMonthSummary] = useState<TransactionSummaryData | null>(null)
  const [isMetricsLoading, setIsMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState("")
  const [tableRows, setTableRows] = useState<AccountTableRow[]>([])
  const [isTableLoading, setIsTableLoading] = useState(true)
  const [tableError, setTableError] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [sorting, setSorting] = useState<SortingState>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [accountModalMode, setAccountModalMode] = useState<AccountModalMode>("create")
  const [accountUnderEdit, setAccountUnderEdit] = useState<AccountListItem | null>(null)

  const sortBy = useMemo(() => mapSortBy(sorting), [sorting])
  const sortOrder = useMemo(() => mapSortOrder(sorting), [sorting])

  useEffect(() => {
    let isCurrent = true

    const fetchAccountMetrics = async () => {
      setIsMetricsLoading(true)
      setMetricsError("")

      const dateRange = getCurrentMonthDateRange()
      const [accountsResult, summaryResult] = await Promise.allSettled([
        api.get<ApiSuccess<AccountListItem[]>>("/accounts"),
        api.get<ApiSuccess<TransactionSummaryData>>("/transactions/summary", { params: dateRange }),
      ])

      if (!isCurrent) return

      if (accountsResult.status === "fulfilled") {
        setAccountsForMetrics(accountsResult.value.data)
      } else {
        setAccountsForMetrics([])
        setMetricsError(getApiErrorMessage(accountsResult.reason, "Could not load account metrics"))
      }

      if (summaryResult.status === "fulfilled") {
        setMonthSummary(summaryResult.value.data)
      } else {
        setMonthSummary(null)
      }

      setIsMetricsLoading(false)
    }

    fetchAccountMetrics()

    return () => {
      isCurrent = false
    }
  }, [refreshKey])

  useEffect(() => {
    const handleHeaderPrimaryAction = (event: Event) => {
      const customEvent = event as CustomEvent<AppHeaderPrimaryActionDetail>
      if (customEvent.detail?.actionKey !== "create-account") {
        return
      }
      setAccountModalMode("create")
      setAccountUnderEdit(null)
      setIsAccountModalOpen(true)
    }

    window.addEventListener(APP_HEADER_PRIMARY_ACTION_EVENT, handleHeaderPrimaryAction)
    return () => {
      window.removeEventListener(APP_HEADER_PRIMARY_ACTION_EVENT, handleHeaderPrimaryAction)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    const fetchAccountsTable = async () => {
      setIsTableLoading(true)
      setTableError("")

      try {
        const params: Record<string, unknown> = { page, limit }
        if (sortBy) params.sort_by = sortBy
        if (sortOrder) params.sort_order = sortOrder

        const response = await api.get<ApiSuccess<AccountsListData>>("/accounts", { params })
        if (!isCurrent) return

        setTableRows(response.data.items)
        setTotal(response.data.total)
        setTotalPages(response.data.totalPages)

        if (response.data.page !== page) {
          setPage(response.data.page)
        }
      } catch (error) {
        if (!isCurrent) return
        setTableRows([])
        setTotal(0)
        setTotalPages(0)
        setTableError(getApiErrorMessage(error, "Could not load accounts table"))
      } finally {
        if (isCurrent) setIsTableLoading(false)
      }
    }

    fetchAccountsTable()
    return () => {
      isCurrent = false
    }
  }, [limit, page, refreshKey, sortBy, sortOrder])

  const activeAccounts = useMemo(() => accountsForMetrics.filter((account) => account.is_active !== false), [accountsForMetrics])

  const totalBalanceTotals = useMemo(() => buildCurrencyTotals(activeAccounts, () => true), [activeAccounts])
  const savingsBalanceTotals = useMemo(
    () => buildCurrencyTotals(activeAccounts, (account) => account.type === "savings"),
    [activeAccounts]
  )
  const bankBalanceTotals = useMemo(
    () => buildCurrencyTotals(activeAccounts, (account) => account.type === "bank"),
    [activeAccounts]
  )

  const activeAccountsCount = activeAccounts.length
  const savingsAccountsCount = activeAccounts.filter((account) => account.type === "savings").length
  const bankAccountsCount = activeAccounts.filter((account) => account.type === "bank").length

  const totalBalanceCurrencyCode = getSingleCurrencyCode(totalBalanceTotals)
  const totalBalanceValue = formatSingleCurrencyTotal(totalBalanceTotals)
  const savingsValue = formatSingleCurrencyTotal(savingsBalanceTotals)
  const bankValue = formatSingleCurrencyTotal(bankBalanceTotals)

  const hasMixedAccountCurrencies = totalBalanceTotals.size > 1
  const summaryCurrencyCode = monthSummary?.totals.currency_code ?? null
  const hasMixedSummaryCurrencies = !summaryCurrencyCode && (monthSummary?.currency_breakdown.length ?? 0) > 1
  const canUseSummaryCurrency =
    !!totalBalanceCurrencyCode && !hasMixedSummaryCurrencies && (!summaryCurrencyCode || summaryCurrencyCode === totalBalanceCurrencyCode)

  const totalBalanceMinor = totalBalanceCurrencyCode ? (totalBalanceTotals.get(totalBalanceCurrencyCode)?.amountMinor ?? 0) : 0
  const currentMonthNetMinor = canUseSummaryCurrency ? (monthSummary?.totals.net_cash_flow_minor ?? 0) : null
  const previousMonthBalanceMinor = currentMonthNetMinor === null ? null : totalBalanceMinor - currentMonthNetMinor

  const totalBalanceTrend: MetricTrend | null = useMemo(() => {
    if (previousMonthBalanceMinor === null) return null
    if (previousMonthBalanceMinor === 0) {
      if (totalBalanceMinor === 0) {
        return { direction: "up", label: "0.0%" }
      }
      return null
    }

    const percentage = ((totalBalanceMinor - previousMonthBalanceMinor) / Math.abs(previousMonthBalanceMinor)) * 100
    return {
      direction: percentage >= 0 ? "up" : "down",
      label: `${Math.abs(percentage).toFixed(1)}%`,
    }
  }, [previousMonthBalanceMinor, totalBalanceMinor])

  const totalBalanceFooter = hasMixedAccountCurrencies
    ? "Multiple account currencies, no FX conversion"
    : totalBalanceTrend
      ? "vs last month"
      : "vs last month unavailable"

  const handleTableSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting = typeof updater === "function" ? updater(sorting) : updater
    setSorting(nextSorting)
    setPage(1)
  }

  const handleTablePageChange = (nextPage: number) => {
    const safePage = Math.max(nextPage, 1)
    setPage(safePage)
  }

  const handleTableLimitChange = (nextLimit: number) => {
    const safeLimit = Math.max(nextLimit, 1)
    setLimit(safeLimit)
    setPage(1)
  }

  const handleEditAccount = (account: AccountListItem) => {
    setAccountModalMode("edit")
    setAccountUnderEdit(account)
    setIsAccountModalOpen(true)
  }

  const handleToggleActive = async (account: AccountListItem) => {
    try {
      await api.patch(`/accounts/${account.account_id}`, { is_active: !account.is_active })
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setTableError(getApiErrorMessage(error, "Could not update account status"))
    }
  }

  const accountColumns: ColumnDef<AccountTableRow>[] = [
      {
        accessorKey: "name",
        header: "Account",
        enableSorting: true,
        cell: ({ row }) => {
          return (
            <div className="min-w-[180px]">
              <p className="font-medium">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.institution_name || "No institution"}</p>
            </div>
          )
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        enableSorting: true,
        cell: ({ row }) => <span className="capitalize">{row.original.type.replace("_", " ")}</span>,
      },
      {
        accessorKey: "account_number_last4",
        header: "Account Number",
        enableSorting: false,
        cell: ({ row }) => <span>{maskAccountNumber(row.original.account_number_last4)}</span>,
      },
      {
        accessorKey: "balance_minor",
        header: "Balance",
        enableSorting: true,
        cell: ({ row }) => {
          const currencyCode = row.original.currency_code || "USD"
          const minorUnit = getSafeMinorUnit(row.original.currency?.minor_unit)
          return formatMinorAmount(toMinorNumber(row.original.balance_minor), currencyCode, minorUnit)
        },
      },
      {
        id: "change",
        header: "Change",
        enableSorting: false,
        cell: () => (
          <Badge variant="secondary" className="rounded-full">
            —
          </Badge>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full",
              row.original.is_active
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-muted-foreground/40 bg-muted text-muted-foreground"
            )}
          >
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <AccountRowActions
              isActive={row.original.is_active}
              onEdit={() => handleEditAccount(row.original)}
              onToggleActive={() => handleToggleActive(row.original)}
            />
          )
        },
      },
    ]

  if (isMetricsLoading) {
    return (
      <>
        <AccountsMetricsLoading />
        <GridItem span={12} fill>
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
        </GridItem>
      </>
    )
  }

  return (
    <>
      <CreateAccountModal
        key={`${accountModalMode}-${accountUnderEdit?.account_id ?? "new"}-${isAccountModalOpen ? "open" : "closed"}`}
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
        mode={accountModalMode}
        account={accountUnderEdit}
        onSuccess={() => setRefreshKey((value) => value + 1)}
      />

      {metricsError ? (
        <GridItem span={12} fill>
          <Card className="border-destructive/40">
            <CardContent className="space-y-2 p-6">
              <p className="text-sm font-medium text-destructive">Could not load account metrics</p>
              <p className="text-sm text-muted-foreground">{metricsError}</p>
            </CardContent>
          </Card>
        </GridItem>
      ) : null}

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Balance"
          value={totalBalanceValue}
          footer={totalBalanceFooter}
          trend={totalBalanceTrend ?? undefined}
          badge={
            !totalBalanceTrend ? (
              <Badge variant="outline" className="rounded-full text-xs">
                N/A
              </Badge>
            ) : undefined
          }
          icon={<Wallet className="text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Savings"
          value={savingsValue}
          footer={savingsAccountsCount === 1 ? "1 active savings account" : `${savingsAccountsCount} active savings accounts`}
          icon={<PiggyBank className="text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Bank Accounts"
          value={bankValue}
          footer={bankAccountsCount === 1 ? "1 active bank account" : `${bankAccountsCount} active bank accounts`}
          icon={<Landmark className="text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Active Accounts"
          value={activeAccountsCount.toLocaleString("en-IN")}
          footer="Currently enabled"
          icon={<Hash className="text-emerald-600 dark:text-emerald-400" aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} fill>
        <Card>
          <CardHeader>
            <CardTitle>All Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataTableToolbar
              // leftSlot={
              //   <ToggleGroup className="gap-2 rounded-lg" type="single" value="all">
              //     <ToggleGroupItem value="all" aria-label="All accounts" className="!rounded-sm gap-2 bg-muted text-foreground" disabled>
              //       All Accounts
              //     </ToggleGroupItem>
              //   </ToggleGroup>
              // }
            />

            {tableError ? <p className="text-sm text-destructive">{tableError}</p> : null}

            <AccountCardsList
              rows={tableRows}
              isLoading={isTableLoading}
              onEdit={handleEditAccount}
              onToggleActive={handleToggleActive}
            />

            <div className="hidden lg:block">
              <DataTableBase
                columns={accountColumns}
                data={tableRows}
                sorting={sorting}
                onSortingChange={handleTableSortingChange}
                isLoading={isTableLoading}
                emptyMessage="No accounts found."
              />
            </div>
            <DataTablePagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={handleTablePageChange}
              onLimitChange={handleTableLimitChange}
            />
          </CardContent>
        </Card>
      </GridItem>
    </>
  )
}
