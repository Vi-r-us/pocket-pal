import type { CSSProperties, ReactNode } from "react"
import { useEffect, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

type ChartDataPoint = Record<string, string | number | null | undefined>

export type CashFlowSeriesConfig = {
  key: string
  label: string
  colorClass?: string
  colorVar?: string
  strokeWidth?: number
  showDots?: boolean
}

type FormatterValue = string | number
type TooltipValueFormatter = (
  value: FormatterValue,
  name: string,
) => [FormatterValue, string] | FormatterValue

export type CashFlowChartCardProps = {
  title?: ReactNode
  data: ChartDataPoint[]
  xDataKey: string
  series: CashFlowSeriesConfig[]
  height?: number
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  xTickFormatter?: (value: string | number) => string
  yTickFormatter?: (value: string | number) => string
  tooltipValueFormatter?: TooltipValueFormatter
  monthOptions?: number[]
  className?: string
}

function defaultTooltipValueFormatter(value: FormatterValue, name: string): [FormatterValue, string] {
  return [value, name]
}

/**
 * Cash Flow Chart Card
 * @param title - The title of the chart
 * @param data - The data for the chart
 * @param xDataKey - The key of the x-axis data
 * @param series - The series data for the chart
 * @param height - The height of the chart
 * @param showLegend - Whether to show the legend
 * @param showTooltip - Whether to show the tooltip
 * @param showGrid - Whether to show the grid
 * @param showXAxis - Whether to show the x-axis
 * @param showYAxis - Whether to show the y-axis
 * @param xTickFormatter - The formatter for the x-axis
 * @param yTickFormatter - The formatter for the y-axis
 * @param tooltipValueFormatter - The formatter for the tooltip
 * @param periodLabel - The label for the period
 */
export function CashFlowChartCard({
  title = "Cash Flow Overview",
  data,
  xDataKey,
  series,
  height = 280,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  xTickFormatter,
  yTickFormatter,
  tooltipValueFormatter = defaultTooltipValueFormatter,
  monthOptions = [4, 6, 12],
  className,
}: CashFlowChartCardProps) {
  const getResponsiveDefaultMonths = () => {
    if (typeof window === "undefined") {
      return 12
    }
    if (window.innerWidth < 768) {
      return 4
    }
    if (window.innerWidth < 1024) {
      return 6
    }
    return 12
  }

  const [selectedMonths, setSelectedMonths] = useState<number>(getResponsiveDefaultMonths)

  useEffect(() => {
    const handleResize = () => {
      setSelectedMonths(getResponsiveDefaultMonths())
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const sortedMonthOptions = [...new Set(monthOptions)]
    .filter((option) => Number.isFinite(option) && option > 0)
    .sort((a, b) => a - b)

  const activeMonths = sortedMonthOptions.includes(selectedMonths)
    ? selectedMonths
    : (sortedMonthOptions.at(-1) ?? 12)

  const visibleData = data.slice(Math.max(0, data.length - activeMonths))

  const safeSeries = series.filter((item) =>
    visibleData.some((point) => typeof point[item.key] === "number")
  )
  const chartConfig = safeSeries.reduce<ChartConfig>((acc, item) => {
    acc[item.key] = {
      label: item.label,
      color: item.colorVar ?? "hsl(var(--primary))",
    }
    return acc
  }, {})

  const hasRows = visibleData.length > 0
  const hasRenderableSeries = safeSeries.length > 0
  const shouldShowEmptyState = !hasRows || !hasRenderableSeries

  return (
    <Card className={cn("rounded-2xl border border-border", className)}>
      <CardHeader className="border-b border-border/60 flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {sortedMonthOptions.length > 0 ? (
          <CardAction>
            <Select value={String(activeMonths)} onValueChange={(value) => setSelectedMonths(Number(value))}>
              <SelectTrigger
                size="default"
                className="h-8 shrink-0 w-fit border-border/80 bg-card/60 text-muted-foreground hover:text-foreground "
                aria-label="Select visible month range"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {sortedMonthOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    Last {option} months
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="pt-4">
        {shouldShowEmptyState ? (
          <div
            className="flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground"
            style={{ height }}
          >
            No chart data to display
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            style={
              {
                "--chart-height": `${height}px`,
              } as CSSProperties
            }
          >
            <LineChart data={visibleData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {showGrid ? <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" /> : null}
              {showXAxis ? (
                <XAxis
                  dataKey={xDataKey}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={xTickFormatter}
                />
              ) : null}
              {showYAxis ? (
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={yTickFormatter}
                />
              ) : null}
              {showTooltip ? (
                <ChartTooltip
                  cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }}
                  content={<ChartTooltipContent formatter={tooltipValueFormatter} />}
                />
              ) : null}
              {showLegend ? (
                <ChartLegend
                  verticalAlign="top"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={
                    {
                      paddingBottom: 14,
                      color: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    } as CSSProperties
                  }
                  content={<ChartLegendContent />}
                />
              ) : null}
              {safeSeries.map((item) => (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.label}
                  stroke={`var(--color-${item.key})`}
                  strokeWidth={item.strokeWidth ?? 2.25}
                  dot={item.showDots ? { r: 3 } : false}
                  activeDot={{ r: 4 }}
                  className={item.colorClass}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
