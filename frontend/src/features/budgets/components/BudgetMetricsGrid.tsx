import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  PiggyBank,
  Wallet,
} from "lucide-react"
import { MetricStatCard } from "@/components/cards/MetricStatCard"
import { GridItem } from "@/components/layout/GridItem"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toCurrency } from "../utils"

type BudgetMetricsGridProps = {
  monthLabel: string
  currencyCode: string | null
  totals: {
    budget: number
    spent: number
    savings: number
    remaining: number
  }
}

export const BudgetMetricsLoading = () => (
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

export const BudgetMetricsGrid = ({
  monthLabel,
  currencyCode,
  totals,
}: BudgetMetricsGridProps) => {
  const noCurrencyBadge = !currencyCode ? (
    <Badge variant="outline" className="rounded-full text-xs">
      N/A
    </Badge>
  ) : undefined

  const totalBudgetValue = currencyCode
    ? toCurrency(totals.budget, currencyCode)
    : "—"
  const totalSpentValue = currencyCode
    ? toCurrency(totals.spent, currencyCode)
    : "—"
  const savingsValue = currencyCode
    ? toCurrency(totals.savings, currencyCode)
    : "—"
  const remainingValue = currencyCode
    ? toCurrency(totals.remaining, currencyCode)
    : "—"

  return (
    <>
      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Budget"
          value={totalBudgetValue}
          footer={monthLabel}
          badge={noCurrencyBadge}
          icon={
            <Wallet
              className="text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          }
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Spent"
          value={totalSpentValue}
          footer={`Tracked expenses for ${monthLabel}`}
          badge={noCurrencyBadge}
          icon={
            <BanknoteArrowDown
              className="text-rose-600 dark:text-rose-400"
              aria-hidden
            />
          }
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Remaining"
          value={remainingValue}
          footer={`Available after spend for ${monthLabel}`}
          badge={noCurrencyBadge}
          icon={
            <PiggyBank
              className="text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          }
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Savings"
          value={savingsValue}
          footer={`Saved in ${monthLabel}`}
          badge={noCurrencyBadge}
          icon={
            <BanknoteArrowUp
              className="text-blue-600 dark:text-blue-400"
              aria-hidden
            />
          }
        />
      </GridItem>
    </>
  )
}
