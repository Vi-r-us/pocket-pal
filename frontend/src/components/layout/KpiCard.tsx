import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Panel } from "@/components/layout/Panel"

type DeltaTone = "positive" | "negative" | "neutral"

export type KpiCardProps = {
  label: string
  value: ReactNode
  delta?: { value: string; tone: DeltaTone }
  icon?: LucideIcon
  loading?: boolean
  className?: string
}

const deltaToneClass: Record<DeltaTone, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
}

export const KpiCard = ({ label, value, delta, icon: Icon, loading, className }: KpiCardProps) => {
  return (
    <Panel padding="md" className={cn("h-full", className)}>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon ? (
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-live="polite">
            <Skeleton className="h-8 w-28" />
            {delta ? <Skeleton className="h-4 w-20" /> : null}
          </div>
        ) : (
          <>
            <div className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {value}
            </div>
            {delta ? (
              <p className={cn("text-xs font-medium md:text-sm", deltaToneClass[delta.tone])}>
                {delta.value}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Panel>
  )
}
