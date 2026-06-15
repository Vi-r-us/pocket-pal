import { Copy } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { MonthPickerField } from "@/components/MonthPickerField"
import {
  BudgetCategoryTable,
  BudgetChartsSection,
  BudgetMetricsGrid,
  BudgetMetricsLoading,
  BudgetPageAlerts,
  CloneBudgetCategoryModal,
  CloneBudgetPeriodModal,
  CreateBudgetModal,
} from "@/features/budgets/components"
import {
  buildPeriodClonePayload,
  fetchBudgetMonthCategoryIds,
  mapSummaryToCloneRows,
  putCategoryBudgets,
} from "@/features/budgets/budgetClone"
import { useBudgetDerivedData } from "@/features/budgets/hooks/useBudgetDerivedData"
import { useBudgetSummary } from "@/features/budgets/hooks/useBudgetSummary"
import { useResponsiveTableView } from "@/features/budgets/hooks/useResponsiveTableView"
import type {
  BudgetCategoryFilterType,
  BudgetCategoryTableRow,
  BudgetCategoryType,
  BudgetCloneRow,
  CloneConflictStrategy,
} from "@/features/budgets/types"
import { toCurrency } from "@/features/budgets/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePageHeaderControls } from "@/contexts/PageHeaderControlsContext"
import {
  APP_HEADER_PRIMARY_ACTION_EVENT,
  type AppHeaderPrimaryActionDetail,
} from "@/constants/headerActions"
import { api } from "@/lib/api"
import { getInlineErrorMessage } from "@/lib/errors/normalize"
import {
  formatYyyyMmLabel,
  getCurrentYyyyMm,
  inputValueToYyyyMm,
  yyyyMmToInputValue,
} from "@/lib/month"
import type { ApiEnvelope } from "@/types/api"

export const BudgetsPage = () => {
  const [selectedYyyyMm, setSelectedYyyyMm] = useState(getCurrentYyyyMm)
  const [refreshKey, setRefreshKey] = useState(0)
  const { summary, isLoading, error: metricsError, setError: setMetricsError } =
    useBudgetSummary(selectedYyyyMm, refreshKey)

  const [isCreateBudgetModalOpen, setIsCreateBudgetModalOpen] = useState(false)
  const [budgetModalMode, setBudgetModalMode] = useState<"create" | "edit">(
    "create",
  )
  const [budgetModalKey, setBudgetModalKey] = useState(0)
  const [budgetModalInitialRows, setBudgetModalInitialRows] = useState<
    Array<{ category_id: number; amount_minor: number }>
  >([])
  const [selectedBreakdownType, setSelectedBreakdownType] =
    useState<BudgetCategoryType>("expense")
  const [selectedBarType, setSelectedBarType] =
    useState<BudgetCategoryType>("expense")
  const [categoryTypeFilter, setCategoryTypeFilter] =
    useState<BudgetCategoryFilterType>("all")
  const [tablePage, setTablePage] = useState(1)
  const [tableLimit, setTableLimit] = useState(10)
  const { isMobileTableView, isTabletTableView } = useResponsiveTableView()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [budgetRowPendingDelete, setBudgetRowPendingDelete] =
    useState<BudgetCategoryTableRow | null>(null)
  const [isDeletingBudget, setIsDeletingBudget] = useState(false)
  const [isCategoryCloneModalOpen, setIsCategoryCloneModalOpen] =
    useState(false)
  const [isPeriodCloneModalOpen, setIsPeriodCloneModalOpen] = useState(false)
  const [categoryCloneRow, setCategoryCloneRow] =
    useState<BudgetCloneRow | null>(null)

  const monthLabel = useMemo(
    () => formatYyyyMmLabel(selectedYyyyMm),
    [selectedYyyyMm],
  )

  const sourceMonthValue = useMemo(
    () => yyyyMmToInputValue(selectedYyyyMm),
    [selectedYyyyMm],
  )

  const sourceCloneRows = useMemo(
    () => mapSummaryToCloneRows(summary?.summaries ?? []),
    [summary?.summaries],
  )

  const derived = useBudgetDerivedData({
    summary,
    selectedBreakdownType,
    selectedBarType,
    categoryTypeFilter,
    tablePage,
    tableLimit,
    isMobileTableView,
    isTabletTableView,
  })

  const budgetsHeaderControls = useMemo(
    () => ({
      toolbar: (
        <MonthPickerField
          id="budgets-month-picker"
          className="w-full min-w-0 sm:w-[200px]"
          value={sourceMonthValue}
          onChange={(next) => {
            const parsed = inputValueToYyyyMm(next)
            if (parsed === null) return
            setSelectedYyyyMm(parsed)
            setTablePage(1)
          }}
          aria-label="Select budget month"
        />
      ),
      overflowActions: [
        {
          id: "copy-month",
          label: "Copy month",
          icon: Copy,
          onSelect: () => setIsPeriodCloneModalOpen(true),
        },
      ],
    }),
    [sourceMonthValue],
  )

  usePageHeaderControls(budgetsHeaderControls)

  useEffect(() => {
    const handleHeaderPrimaryAction = (event: Event) => {
      const customEvent = event as CustomEvent<AppHeaderPrimaryActionDetail>
      if (customEvent.detail?.actionKey !== "create-budget") return
      setBudgetModalMode("create")
      setBudgetModalInitialRows([])
      setBudgetModalKey((value) => value + 1)
      setIsCreateBudgetModalOpen(true)
    }

    window.addEventListener(
      APP_HEADER_PRIMARY_ACTION_EVENT,
      handleHeaderPrimaryAction,
    )
    return () => {
      window.removeEventListener(
        APP_HEADER_PRIMARY_ACTION_EVENT,
        handleHeaderPrimaryAction,
      )
    }
  }, [])

  const isEmptyMetrics =
    !isLoading && !metricsError && (summary?.summaries.length ?? 0) === 0

  const formatCloneAmount = (minor: number) =>
    derived.currencyCode ? toCurrency(minor, derived.currencyCode) : "—"

  const handleBudgetModalSuccess = (nextYyyyMm: number) => {
    setSelectedYyyyMm(nextYyyyMm)
    setRefreshKey((value) => value + 1)
  }

  const handleCategoryAction = useCallback(
    (
      action: "edit" | "reset" | "delete" | "clone",
      row: BudgetCategoryTableRow,
    ) => {
      if (action === "edit") {
        setBudgetModalMode("edit")
        setBudgetModalInitialRows([
          { category_id: row.category_id, amount_minor: row.budget_minor },
        ])
        setBudgetModalKey((value) => value + 1)
        setIsCreateBudgetModalOpen(true)
        return
      }
      if (action === "clone") {
        setCategoryCloneRow({
          category_id: row.category_id,
          category_name: row.category_name,
          category_type: row.category_type,
          amount_minor: row.budget_minor,
        })
        setIsCategoryCloneModalOpen(true)
        return
      }
      if (action === "delete") {
        setBudgetRowPendingDelete(row)
        setIsDeleteDialogOpen(true)
      }
    },
    [],
  )

  const handleCloneCategoryBudget = async (targetMonthValue: string) => {
    if (!categoryCloneRow) return
    const targetYyyyMm = inputValueToYyyyMm(targetMonthValue)
    if (targetYyyyMm === null) return

    await putCategoryBudgets(targetYyyyMm, [
      {
        category_id: categoryCloneRow.category_id,
        amount_minor: categoryCloneRow.amount_minor,
      },
    ])
    setCategoryCloneRow(null)
    handleBudgetModalSuccess(targetYyyyMm)
  }

  const handleClonePeriodBudgets = async (
    targetMonthValue: string,
    strategy: CloneConflictStrategy,
  ) => {
    const targetYyyyMm = inputValueToYyyyMm(targetMonthValue)
    if (targetYyyyMm === null) return

    const existingTargetCategoryIds =
      await fetchBudgetMonthCategoryIds(targetYyyyMm)
    const categoryBudgets = buildPeriodClonePayload(
      sourceCloneRows,
      existingTargetCategoryIds,
      strategy,
    )
    if (categoryBudgets.length === 0) return

    await putCategoryBudgets(targetYyyyMm, categoryBudgets)
    handleBudgetModalSuccess(targetYyyyMm)
  }

  const handleDeleteBudget = async () => {
    if (!budgetRowPendingDelete || isDeletingBudget) return

    setIsDeletingBudget(true)
    try {
      await api.delete<ApiEnvelope<unknown>>(
        `/budgets/month/${selectedYyyyMm}/category/${budgetRowPendingDelete.category_id}`,
      )
      setIsDeleteDialogOpen(false)
      setBudgetRowPendingDelete(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setMetricsError(
        getInlineErrorMessage(error, "Could not delete budget category"),
      )
    } finally {
      setIsDeletingBudget(false)
    }
  }

  if (isLoading) {
    return <BudgetMetricsLoading />
  }

  return (
    <>
      <CreateBudgetModal
        key={budgetModalKey}
        open={isCreateBudgetModalOpen}
        onOpenChange={setIsCreateBudgetModalOpen}
        initialYyyyMm={selectedYyyyMm}
        mode={budgetModalMode}
        initialRows={budgetModalInitialRows}
        onSuccess={handleBudgetModalSuccess}
      />
      <CloneBudgetCategoryModal
        open={isCategoryCloneModalOpen}
        onOpenChange={(open) => {
          setIsCategoryCloneModalOpen(open)
          if (!open) setCategoryCloneRow(null)
        }}
        row={categoryCloneRow}
        sourceMonthValue={sourceMonthValue}
        sourceMonthLabel={monthLabel}
        formatAmount={formatCloneAmount}
        onClone={handleCloneCategoryBudget}
      />
      <CloneBudgetPeriodModal
        open={isPeriodCloneModalOpen}
        onOpenChange={setIsPeriodCloneModalOpen}
        sourceMonthValue={sourceMonthValue}
        sourceMonthLabel={monthLabel}
        sourceRows={sourceCloneRows}
        formatAmount={formatCloneAmount}
        onClone={handleClonePeriodBudgets}
      />
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeletingBudget) return
          setIsDeleteDialogOpen(open)
          if (!open) setBudgetRowPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget category?</AlertDialogTitle>
            <AlertDialogDescription>
              {budgetRowPendingDelete
                ? `This will remove ${budgetRowPendingDelete.category_name} from ${monthLabel} budget.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBudget}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteBudget}
              disabled={isDeletingBudget}
            >
              {isDeletingBudget ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BudgetPageAlerts
        monthLabel={monthLabel}
        metricsError={metricsError}
        isEmptyMetrics={isEmptyMetrics}
      />

      <BudgetMetricsGrid
        monthLabel={monthLabel}
        currencyCode={derived.currencyCode}
        totals={derived.totals}
      />

      <BudgetChartsSection
        monthLabel={monthLabel}
        currencyCode={derived.currencyCode}
        effectiveBreakdownType={derived.effectiveBreakdownType}
        effectiveBarType={derived.effectiveBarType}
        breakdownCountsByType={derived.breakdownCountsByType}
        budgetBreakdownData={derived.budgetBreakdownData}
        budgetBreakdownPalette={derived.budgetBreakdownPalette}
        breakdownTypeLabel={derived.breakdownTypeLabel}
        barTypeLabel={derived.barTypeLabel}
        hasBudgetBreakdownRows={derived.hasBudgetBreakdownRows}
        limitedBudgetVsActualData={derived.limitedBudgetVsActualData}
        barSeriesColors={derived.barSeriesColors}
        onBreakdownTypeChange={setSelectedBreakdownType}
        onBarTypeChange={setSelectedBarType}
      />

      <BudgetCategoryTable
        currencyCode={derived.currencyCode}
        categoryTypeFilter={categoryTypeFilter}
        paginatedRows={derived.paginatedCategoryTableRows}
        totalFilteredRows={derived.totalFilteredRows}
        safeTablePage={derived.safeTablePage}
        tableLimit={tableLimit}
        tableTotalPages={derived.tableTotalPages}
        isMobileTableView={isMobileTableView}
        isTabletTableView={isTabletTableView}
        onCategoryTypeFilterChange={(value) => {
          setCategoryTypeFilter(value)
          setTablePage(1)
        }}
        onPageChange={(page) =>
          setTablePage(Math.min(Math.max(page, 1), derived.tableTotalPages))
        }
        onLimitChange={(limit) => {
          setTableLimit(limit)
          setTablePage(1)
        }}
        onCategoryAction={handleCategoryAction}
      />
    </>
  )
}
