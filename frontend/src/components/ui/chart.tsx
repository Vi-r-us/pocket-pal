import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
    color?: string
  }
>

type ChartContextValue = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("Chart components must be used within a ChartContainer")
  }
  return context
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, value]) => value.color)

  if (!entries.length) {
    return null
  }

  const css = entries
    .map(([key, value]) => `--color-${key}: ${value.color};`)
    .join("\n")

  return <style>{`[data-chart="${id}"] { ${css} }`}</style>
}

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactElement
}

function ChartContainer({ id, className, children, config, ...props }: ChartContainerProps) {
  const chartId = React.useId()
  const resolvedId = id ?? chartId.replace(/:/g, "")

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={resolvedId}
        className={cn(
          "h-[var(--chart-height,300px)] w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-legend-item-text]:text-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60",
          className
        )}
        {...props}
      >
        <ChartStyle id={resolvedId} config={config} />
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = RechartsTooltip

type TooltipFormatterValue = string | number
type TooltipFormatter = (
  value: TooltipFormatterValue,
  name: string,
) => [TooltipFormatterValue, string] | TooltipFormatterValue

type ChartTooltipContentProps = React.ComponentProps<"div"> &
  {
    active?: boolean
    payload?: Array<{
      color?: string
      dataKey?: string | number
      name?: string
      value?: unknown
      payload?: Record<string, unknown>
    }>
    label?: React.ReactNode
    hideLabel?: boolean
    formatter?: TooltipFormatter
  }

function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  formatter,
  className,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "min-w-44 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md",
        className
      )}
    >
      {!hideLabel ? <p className="mb-1 text-muted-foreground">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "")
          const itemConfig = config[key]
          const labelText = itemConfig?.label ?? item.name ?? key
          const rawValue = typeof item.value === "number" || typeof item.value === "string" ? item.value : 0
          const formatted = formatter ? formatter(rawValue, String(labelText)) : [rawValue, String(labelText)]
          const [valueText, nameText] = Array.isArray(formatted)
            ? formatted
            : [formatted, String(labelText)]

          return (
            <div key={`${key}-${item.payload?.[key] ?? ""}`} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: item.color ?? `var(--color-${key})` }}
                />
                {nameText}
              </span>
              <span className="font-medium text-foreground">{valueText}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsLegend

type ChartLegendContentProps = React.ComponentProps<"div"> &
  {
    payload?: Array<{
      color?: string
      dataKey?: string | number
      value?: React.ReactNode
    }>
    hideIcon?: boolean
  }

function ChartLegendContent({ payload, hideIcon = false, className }: ChartLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 text-xs", className)}>
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value ?? "")
        const itemConfig = config[key]
        const labelText = itemConfig?.label ?? item.value ?? key
        const Icon = itemConfig?.icon

        return (
          <div key={key} className="inline-flex items-center gap-1.5 text-muted-foreground">
            {hideIcon ? null : Icon ? (
              <Icon className="size-3" />
            ) : (
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color ?? `var(--color-${key})` }}
              />
            )}
            <span>{labelText}</span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
}
