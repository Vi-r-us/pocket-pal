import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type MetricTrend = {
  direction: "up" | "down"
  label: string
}

/** Semantic intent for the icon tile — drives its color so not every metric is green */
export type MetricTone = "neutral" | "income" | "expense" | "savings"

export type MetricStatCardProps = {
  title: ReactNode
  value: ReactNode
  footer?: ReactNode
  /** Renders built-in pill with chevron; takes precedence over `badge` when both are passed */
  trend?: MetricTrend
  /** Custom trailing pill next to the value — used only when `trend` is omitted */
  badge?: ReactNode
  /** Optional icon rendered inside the accent tile — omitted means no tile */
  icon?: ReactNode
  /** Color intent of the icon tile (default neutral) */
  tone?: MetricTone
  className?: string
}

const TONE_TILE_CLASSES: Record<MetricTone, string> = {
  neutral: "bg-muted/40 text-primary",
  income: "bg-type-income/10 text-type-income",
  expense: "bg-type-expense/10 text-type-expense",
  savings: "bg-type-savings/10 text-type-savings",
}

function TrendPill({ trend }: { trend: MetricTrend }) {
  const isUp = trend.direction === "up"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        isUp
          ? "bg-trend-positive/15 text-trend-positive"
          : "bg-trend-negative/15 text-trend-negative"
      )}
    >
      {isUp ? (
        <ChevronUpIcon className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <ChevronDownIcon className="h-3 w-3 shrink-0" aria-hidden />
      )}
      {trend.label}
    </span>
  )
}

function IconTile({
  children,
  className,
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-primary [&>svg]:h-5 [&>svg]:w-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function MetricStatCard({
  title,
  value,
  footer,
  trend,
  badge,
  icon,
  tone = "neutral",
  className,
}: MetricStatCardProps) {
  const trailing = trend ? <TrendPill trend={trend} /> : badge

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground",
        icon && "lg:pb-6",
        className
      )}
    >
      <div className="flex flex-row items-end justify-between gap-4">
        <div className={cn("min-w-0 space-y-1", icon && "lg:pr-2")}>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums lg:text-3xl">
              {value}
            </span>
            {trailing}
          </div>
          {footer ? <p className="pt-1 text-xs text-muted-foreground">{footer}</p> : null}
        </div>

        {icon ? (
          <IconTile
            className={cn(
              TONE_TILE_CLASSES[tone],
              "glass shadow-glass backdrop-blur-glass backdrop-saturate-150"
            )}
            aria-hidden
          >
            {icon}
          </IconTile>
        ) : null}
      </div>
    </div>
  )
}
