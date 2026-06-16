import { useMemo } from "react"
import type { CategoryBreakdownDatum } from "@/components/charts"
import { BUDGET_BAR_SERIES_COLORS, BUDGET_CATEGORY_TYPES, BUDGET_TYPE_PALETTES } from "../constants"
import type {
  BudgetCategoryFilterType,
  BudgetCategoryTableRow,
  BudgetCategoryType,
  BudgetSummaryData,
  BudgetSummaryWithType,
  BudgetVsActualDataPoint,
} from "../types"
import { capitalizeType, normalizeCategoryType, toMinorNumber } from "../utils"

type UseBudgetDerivedDataArgs = {
  summary: BudgetSummaryData | null
  selectedBreakdownType: BudgetCategoryType
  selectedBarType: BudgetCategoryType
  categoryTypeFilter: BudgetCategoryFilterType
  tablePage: number
  tableLimit: number
  isMobileTableView: boolean
  isTabletTableView: boolean
}

export const useBudgetDerivedData = ({
  summary,
  selectedBreakdownType,
  selectedBarType,
  categoryTypeFilter,
  tablePage,
  tableLimit,
  isMobileTableView,
  isTabletTableView,
}: UseBudgetDerivedDataArgs) => {
  const currencyCode =
    summary?.totals.currency_code?.trim().toUpperCase() || null

  const budgetSummariesWithType = useMemo<BudgetSummaryWithType[]>(
    () =>
      (summary?.summaries ?? []).map((item) => ({
        ...item,
        normalized_type: normalizeCategoryType(
          item.category_type ?? item.category?.type,
        ),
      })),
    [summary?.summaries],
  )

  const breakdownCountsByType = useMemo(
    () =>
      BUDGET_CATEGORY_TYPES.reduce(
        (acc, type) => {
          const count = budgetSummariesWithType.filter(
            (item) =>
              item.normalized_type === type &&
              Math.max(0, toMinorNumber(item.amount_minor)) > 0,
          ).length
          acc[type] = count
          return acc
        },
        { expense: 0, income: 0, savings: 0 } as Record<
          BudgetCategoryType,
          number
        >,
      ),
    [budgetSummariesWithType],
  )

  const availableBreakdownTypes = useMemo(
    () =>
      BUDGET_CATEGORY_TYPES.filter((type) => breakdownCountsByType[type] > 0),
    [breakdownCountsByType],
  )

  const effectiveBreakdownType = availableBreakdownTypes.includes(
    selectedBreakdownType,
  )
    ? selectedBreakdownType
    : (availableBreakdownTypes[0] ?? selectedBreakdownType)

  const effectiveBarType = availableBreakdownTypes.includes(selectedBarType)
    ? selectedBarType
    : (availableBreakdownTypes[0] ?? selectedBarType)

  const activeBudgetTypeSummaries = useMemo(
    () =>
      budgetSummariesWithType
        .filter(
          (item) =>
            item.normalized_type === effectiveBreakdownType &&
            Math.max(0, toMinorNumber(item.amount_minor)) > 0,
        )
        .sort(
          (left, right) =>
            Math.max(0, toMinorNumber(right.amount_minor)) -
            Math.max(0, toMinorNumber(left.amount_minor)),
        ),
    [budgetSummariesWithType, effectiveBreakdownType],
  )

  const budgetBreakdownPalette = BUDGET_TYPE_PALETTES[effectiveBreakdownType]

  const budgetBreakdownData = useMemo(() => {
    const topFive = activeBudgetTypeSummaries.slice(0, 5)
    const othersTotal = activeBudgetTypeSummaries
      .slice(5)
      .reduce(
        (sum, item) => sum + Math.max(0, toMinorNumber(item.amount_minor)),
        0,
      )

    const chartRows: CategoryBreakdownDatum[] = topFive.map((item, index) => ({
      key: `${effectiveBreakdownType}-${item.category_id}`,
      label: item.category?.name?.trim() || "Uncategorized",
      value: Math.max(0, toMinorNumber(item.amount_minor)),
      colorVar: budgetBreakdownPalette[index],
    }))

    if (othersTotal > 0) {
      chartRows.push({
        key: `${effectiveBreakdownType}-others`,
        label: "Others",
        value: othersTotal,
        colorVar: budgetBreakdownPalette[5],
      })
    }

    return chartRows
  }, [
    activeBudgetTypeSummaries,
    budgetBreakdownPalette,
    effectiveBreakdownType,
  ])

  const budgetVsActualData = useMemo<
    Array<BudgetVsActualDataPoint & { ranking_minor: number }>
  >(
    () =>
      budgetSummariesWithType
        .filter(
          (item) =>
            item.normalized_type === effectiveBarType &&
            Math.max(0, toMinorNumber(item.amount_minor)) > 0,
        )
        .map((item) => ({
          category: item.category?.name?.trim() || "Uncategorized",
          budget_minor: Math.max(0, toMinorNumber(item.amount_minor)),
          actual_minor: Math.max(0, toMinorNumber(item.spent_minor)),
          ranking_minor: Math.max(0, toMinorNumber(item.amount_minor)),
        }))
        .filter((item) => item.budget_minor > 0 || item.actual_minor > 0),
    [budgetSummariesWithType, effectiveBarType],
  )

  const chartBarLimit = isMobileTableView ? 5 : isTabletTableView ? 8 : 12

  const limitedBudgetVsActualData = useMemo(() => {
    const sorted = [...budgetVsActualData].sort(
      (left, right) => right.ranking_minor - left.ranking_minor,
    )
    const topRows = sorted.slice(0, chartBarLimit)
    const otherRows = sorted.slice(chartBarLimit)
    const othersBarRow =
      otherRows.length > 0
        ? {
            category: "Others",
            budget_minor: otherRows.reduce(
              (sum, item) => sum + item.budget_minor,
              0,
            ),
            actual_minor: otherRows.reduce(
              (sum, item) => sum + item.actual_minor,
              0,
            ),
          }
        : null

    return {
      data: [
        ...topRows.map(({ category, budget_minor, actual_minor }) => ({
          category,
          budget_minor,
          actual_minor,
        })),
        ...(othersBarRow ? [othersBarRow] : []),
      ] as BudgetVsActualDataPoint[],
      topCount: topRows.length,
      isTruncated: otherRows.length > 0,
    }
  }, [budgetVsActualData, chartBarLimit])

  const categoryTableRows = useMemo<BudgetCategoryTableRow[]>(
    () =>
      (summary?.summaries ?? [])
        .map((item) => {
          const budgetMinor = Math.max(0, toMinorNumber(item.amount_minor))
          const spentMinor = Math.max(0, toMinorNumber(item.spent_minor))
          const remainingMinorValue = toMinorNumber(item.remaining_minor)
          const progressPercent =
            budgetMinor > 0
              ? (spentMinor / budgetMinor) * 100
              : spentMinor > 0
                ? 100
                : 0

          return {
            category_id: item.category_id,
            category_name: item.category?.name?.trim() || "Uncategorized",
            category_type: normalizeCategoryType(
              item.category_type ?? item.category?.type?.toLowerCase(),
            ),
            budget_minor: budgetMinor,
            spent_minor: spentMinor,
            remaining_minor: remainingMinorValue,
            progress_percent: progressPercent,
            progress_percent_for_bar: Math.min(
              100,
              Math.max(0, progressPercent),
            ),
          }
        })
        .filter((item) => item.budget_minor > 0 || item.spent_minor > 0),
    [summary?.summaries],
  )

  const filteredCategoryTableRows = useMemo(
    () =>
      categoryTypeFilter === "all"
        ? categoryTableRows
        : categoryTableRows.filter(
            (row) => row.category_type === categoryTypeFilter,
          ),
    [categoryTableRows, categoryTypeFilter],
  )

  const totalFilteredRows = filteredCategoryTableRows.length
  const tableTotalPages =
    totalFilteredRows === 0 ? 1 : Math.ceil(totalFilteredRows / tableLimit)
  const safeTablePage = Math.min(Math.max(tablePage, 1), tableTotalPages)
  const paginatedCategoryTableRows = filteredCategoryTableRows.slice(
    (safeTablePage - 1) * tableLimit,
    (safeTablePage - 1) * tableLimit + tableLimit,
  )

  const totals = {
    budget: toMinorNumber(summary?.totals.budget_minor ?? 0),
    spent: toMinorNumber(summary?.totals.spent_minor ?? 0),
    savings: toMinorNumber(summary?.totals.savings_minor ?? 0),
    remaining: toMinorNumber(summary?.totals.remaining_minor ?? 0),
  }

  return {
    currencyCode,
    totals,
    breakdownCountsByType,
    effectiveBreakdownType,
    effectiveBarType,
    budgetBreakdownData,
    budgetBreakdownPalette,
    breakdownTypeLabel: capitalizeType(effectiveBreakdownType),
    barTypeLabel: capitalizeType(effectiveBarType),
    barSeriesColors: BUDGET_BAR_SERIES_COLORS[effectiveBarType],
    limitedBudgetVsActualData,
    categoryTableRows,
    filteredCategoryTableRows,
    paginatedCategoryTableRows,
    totalFilteredRows,
    tableTotalPages,
    safeTablePage,
    hasBudgetBreakdownRows: budgetBreakdownData.length > 0,
  }
}
