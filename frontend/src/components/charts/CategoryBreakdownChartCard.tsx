import type { CSSProperties, ReactNode } from "react"
import { useMemo, useState } from "react"
import { Label, Pie, PieChart } from "recharts"
import { TrendingDown, TrendingUp } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const DEFAULT_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

export type CategoryBreakdownDatum = {
  key: string
  label: string
  value: number
  colorVar?: string
}

export type CategoryBreakdownPeriod = { value: string; label: string }

export type CategoryBreakdownChartCardProps = {
  title?: ReactNode
  description?: ReactNode
  data: CategoryBreakdownDatum[]
  headerAction?: ReactNode
  palette?: string[]
  centerLabel?: string
  valueFormatter?: (value: number) => string
  percentFormatter?: (fraction: number) => string
  innerRadius?: number
  outerRadius?: number
  periodOptions?: CategoryBreakdownPeriod[]
  defaultPeriod?: string
  onPeriodChange?: (value: string) => void
  trend?: { direction: "up" | "down"; label: string }
  footerNote?: ReactNode
  showTooltip?: boolean
  showCategories?: boolean
  emptyMessage?: ReactNode
  className?: string
}

const defaultValueFormatter = (value: number) => value.toLocaleString()

const defaultPercentFormatter = (fraction: number) => `${Math.round(fraction * 100)}%`

export function CategoryBreakdownChartCard({
  title = "Category breakdown",
  description,
  data,
  headerAction,
  palette,
  centerLabel = "Total",
  valueFormatter = defaultValueFormatter,
  percentFormatter = defaultPercentFormatter,
  innerRadius = 85,
  outerRadius = 115,
  periodOptions,
  defaultPeriod,
  onPeriodChange,
  trend,
  footerNote,
  showTooltip = true,
  showCategories = true,
  emptyMessage = "No chart data to display",
  className,
}: CategoryBreakdownChartCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (defaultPeriod && periodOptions?.some((p) => p.value === defaultPeriod)) {
      return defaultPeriod
    }
    return periodOptions?.[0]?.value ?? ""
  })

  const { total, chartData, chartConfig, keyColors } = useMemo(() => {
    const sum = data.reduce((acc, row) => acc + (Number.isFinite(row.value) ? row.value : 0), 0)

    const colors: Record<string, string> = {}
    const config: ChartConfig = {
      value: { label: "Amount" },
    }

    const rows = data.map((row, index) => {
      const paletteColor = palette?.[index % palette.length]
      const color = row.colorVar ?? paletteColor ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]
      colors[row.key] = color
      config[row.key] = { label: row.label, color }
      return {
        key: row.key,
        label: row.label,
        value: row.value,
        fill: `var(--color-${row.key})`,
      }
    })

    return { total: sum, chartData: rows, chartConfig: config, keyColors: colors }
  }, [data, palette])

  const hasRows = chartData.length > 0 && total > 0
  const shouldShowEmptyState = !hasRows

  const periodList = periodOptions ?? []
  const activePeriod =
    periodList.find((p) => p.value === selectedPeriod)?.value ?? periodList[0]?.value ?? ""

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    onPeriodChange?.(value)
  }

  const centerValueText = valueFormatter(total)
  const titleForAria = typeof title === "string" ? title : "Category breakdown"
  const pieSummary = `${titleForAria}. ${centerLabel} ${centerValueText}`

  const showFooter = trend !== undefined || footerNote !== undefined

  return (
    <Card className={cn("chart-cq h-full min-h-0 rounded-2xl border border-border", className)}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 [.border-b]:pb-3">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {headerAction ? (
          <CardAction>{headerAction}</CardAction>
        ) : periodList.length > 0 ? (
          <CardAction>
            <Select value={activePeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger
                size="default"
                className="h-8 w-fit shrink-0 border-border/80 bg-card/60 text-muted-foreground hover:text-foreground"
                aria-label="Select period"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {periodList.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="pt-4">
        {shouldShowEmptyState ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="chart-cq-body">
            <div className="chart-cq-chart">
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square w-full max-w-[280px]"
                style={{ "--chart-height": "260px" } as CSSProperties}
                aria-label={`${title}. ${pieSummary}`}
              >
                <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  {showTooltip ? (
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) => {
                            const numericValue = typeof value === "number" ? value : Number(value)
                            const safeValue = Number.isFinite(numericValue) ? numericValue : 0
                            return [valueFormatter(safeValue), name]
                          }}
                        />
                      }
                    />
                  ) : null}
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    strokeWidth={1}
                    paddingAngle={1.5}
                    cornerRadius={5}
                    stroke="var(--background)"
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const cx = viewBox.cx as number
                          const cy = viewBox.cy as number
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={cx} y={cy - 6} className="fill-foreground text-xl font-bold md:text-2xl">
                                {centerValueText}
                              </tspan>
                              <tspan x={cx} y={cy + 18} className="fill-muted-foreground text-xs md:text-sm">
                                {centerLabel}
                              </tspan>
                            </text>
                          )
                        }
                        return null
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>

            {showCategories ? (
              <div className="chart-cq-list">
                <ul className="space-y-1" role="list">
                  {data.map((row) => {
                    const fraction = total > 0 ? row.value / total : 0
                    const pct = percentFormatter(fraction)
                    const amount = valueFormatter(row.value)
                    const aria = `${row.label}: ${amount} (${pct})`
                    return (
                      <li
                        key={row.key}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-0.5 border-b border-border/40 py-2 text-sm last:border-b-0"
                        aria-label={aria}
                      >
                        <span
                          className="size-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: keyColors[row.key] }}
                          aria-hidden
                        />
                        <span className="min-w-0 truncate font-medium text-foreground">{row.label}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{pct}</span>
                        <span className="shrink-0 tabular-nums font-medium text-foreground">{amount}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>

      {showFooter ? (
        <CardFooter className="flex flex-col items-start gap-2 border-t border-border/60 bg-muted/30">
          {trend ? (
            <div className="flex items-center gap-2 text-sm font-medium leading-none text-foreground">
              {trend.direction === "up" ? (
                <TrendingUp className="h-4 w-4 shrink-0 text-trend-positive" aria-hidden />
              ) : (
                <TrendingDown className="h-4 w-4 shrink-0 text-trend-negative" aria-hidden />
              )}
              <span>{trend.label}</span>
            </div>
          ) : null}
          {footerNote ? (
            <div className="text-xs leading-relaxed text-muted-foreground md:text-sm">{footerNote}</div>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}
