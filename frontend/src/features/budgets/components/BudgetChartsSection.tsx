import {
  CategoryBreakdownChartCard,
  MultiBarChartCard,
  type CategoryBreakdownDatum,
} from "@/components/charts"
import { GridItem } from "@/components/layout/GridItem"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import type {
  BudgetCategoryType,
  BudgetVsActualDataPoint,
} from "../types"
import { compactAxisFormatter, toCurrency, toMinorNumber } from "../utils"

type BudgetChartsSectionProps = {
  monthLabel: string
  currencyCode: string | null
  effectiveBreakdownType: BudgetCategoryType
  effectiveBarType: BudgetCategoryType
  breakdownCountsByType: Record<BudgetCategoryType, number>
  budgetBreakdownData: CategoryBreakdownDatum[]
  budgetBreakdownPalette: string[]
  breakdownTypeLabel: string
  barTypeLabel: string
  hasBudgetBreakdownRows: boolean
  limitedBudgetVsActualData: {
    data: BudgetVsActualDataPoint[]
    topCount: number
    isTruncated: boolean
  }
  barSeriesColors: { budget: string; actual: string }
  onBreakdownTypeChange: (value: BudgetCategoryType) => void
  onBarTypeChange: (value: BudgetCategoryType) => void
}

const CategoryTypeToggle = ({
  value,
  onChange,
  counts,
}: {
  value: BudgetCategoryType
  onChange: (value: BudgetCategoryType) => void
  counts: Record<BudgetCategoryType, number>
}) => (
  <ToggleGroup
    className="gap-2 rounded-lg"
    type="single"
    value={value}
    onValueChange={(next) => {
      if (next === "expense" || next === "income" || next === "savings") {
        onChange(next)
      }
    }}
  >
    {(["expense", "income", "savings"] as const).map((type) => (
      <ToggleGroupItem
        key={type}
        value={type}
        aria-label={`${type} budgets`}
        disabled={counts[type] === 0}
        className={cn(
          "!rounded-sm gap-2",
          value === type
            ? "bg-muted text-foreground"
            : "bg-transparent text-muted-foreground",
        )}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
)

export const BudgetChartsSection = ({
  monthLabel,
  currencyCode,
  effectiveBreakdownType,
  effectiveBarType,
  breakdownCountsByType,
  budgetBreakdownData,
  budgetBreakdownPalette,
  breakdownTypeLabel,
  barTypeLabel,
  hasBudgetBreakdownRows,
  limitedBudgetVsActualData,
  barSeriesColors,
  onBreakdownTypeChange,
  onBarTypeChange,
}: BudgetChartsSectionProps) => {
  const formatChartAmount = (value: string | number) =>
    currencyCode ? toCurrency(value, currencyCode) : "—"
  const formatCompactAxisAmount = (value: string | number) =>
    compactAxisFormatter.format(toMinorNumber(value) / 100)

  const breakdownFooterNote = hasBudgetBreakdownRows
    ? `Top 5 ${effectiveBreakdownType} budgets by allocation in ${monthLabel}`
    : `No ${effectiveBreakdownType} budgets available for ${monthLabel}`

  return (
    <>
      <GridItem span={12} lgSpan={6} fill>
        <CategoryBreakdownChartCard
          title="Category Budget Allocation"
          description={`Top 5 ${effectiveBreakdownType} budgets for ${monthLabel}`}
          data={budgetBreakdownData}
          centerLabel={`${breakdownTypeLabel} Budget`}
          headerAction={
            <CategoryTypeToggle
              value={effectiveBreakdownType}
              onChange={onBreakdownTypeChange}
              counts={breakdownCountsByType}
            />
          }
          palette={budgetBreakdownPalette}
          valueFormatter={formatChartAmount}
          footerNote={
            currencyCode
              ? breakdownFooterNote
              : "Currency unavailable for this month"
          }
          emptyMessage="No category budget data to display for this month"
        />
      </GridItem>

      <GridItem span={12} lgSpan={6} fill>
        <MultiBarChartCard
          title="Budget vs Actual by Category"
          description={
            limitedBudgetVsActualData.isTruncated
              ? `Top ${limitedBudgetVsActualData.topCount} ${effectiveBarType} budgets with Others for ${monthLabel}`
              : `Planned and spent ${effectiveBarType} budgets for ${monthLabel}`
          }
          headerAction={
            <CategoryTypeToggle
              value={effectiveBarType}
              onChange={onBarTypeChange}
              counts={breakdownCountsByType}
            />
          }
          data={limitedBudgetVsActualData.data}
          xDataKey="category"
          mode="grouped"
          series={[
            {
              key: "budget_minor",
              label: "Budget",
              colorVar: barSeriesColors.budget,
            },
            {
              key: "actual_minor",
              label: "Actual",
              colorVar: barSeriesColors.actual,
            },
          ]}
          yTickFormatter={formatCompactAxisAmount}
          tooltipValueFormatter={formatChartAmount}
          emptyMessage={`No ${effectiveBarType} budget data to compare for this month`}
          ariaLabel={`Budget versus actual spend by ${barTypeLabel} category`}
        />
      </GridItem>
    </>
  )
}
