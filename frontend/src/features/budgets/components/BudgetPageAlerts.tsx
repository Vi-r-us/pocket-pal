import { GridItem } from "@/components/layout/GridItem"
import { Card, CardContent } from "@/components/ui/card"

type BudgetPageAlertsProps = {
  monthLabel: string
  metricsError: string
  isEmptyMetrics: boolean
}

export const BudgetPageAlerts = ({
  monthLabel,
  metricsError,
  isEmptyMetrics,
}: BudgetPageAlertsProps) => (
  <>
    {metricsError ? (
      <GridItem span={12} fill>
        <Card className="border-destructive/40">
          <CardContent className="space-y-2 p-6">
            <p className="text-sm font-medium text-destructive">
              Could not load budget metrics
            </p>
            <p className="text-sm text-muted-foreground">{metricsError}</p>
          </CardContent>
        </Card>
      </GridItem>
    ) : null}

    {isEmptyMetrics ? (
      <GridItem span={12} fill>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium">
              No budgets set for {monthLabel}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add category budgets to see tracked totals for budget, spent, and
              remaining amounts.
            </p>
          </CardContent>
        </Card>
      </GridItem>
    ) : null}
  </>
)
