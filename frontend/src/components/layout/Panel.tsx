import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type PanelTone = "card" | "glass" | "muted"
type PanelPadding = "sm" | "md" | "lg"
type PanelState = "idle" | "loading" | "empty" | "error"

const toneClass: Record<PanelTone, string> = {
  card: "border border-border bg-card shadow-sm",
  glass: "glass rounded-xl border border-glass-border shadow-glass",
  muted: "border border-border bg-muted/40",
}

const paddingClass: Record<PanelPadding, string> = {
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5 md:p-6",
  lg: "p-5 sm:p-6 md:p-8 xl:p-10",
}

export type PanelProps = {
  tone?: PanelTone
  padding?: PanelPadding
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  state?: PanelState
  emptyMessage?: ReactNode
  errorMessage?: ReactNode
  className?: string
  children?: ReactNode
}

export const Panel = ({
  tone = "card",
  padding = "md",
  title,
  description,
  actions,
  footer,
  state = "idle",
  emptyMessage,
  errorMessage,
  className,
  children,
}: PanelProps) => {
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined

  const renderBody = () => {
    if (state === "loading") {
      return (
        <div className="min-h-0 flex-1 space-y-3 pt-1" aria-busy="true" aria-live="polite">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-28 w-full max-w-lg" />
        </div>
      )
    }

    if (state === "empty") {
      return (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p className="app-page-copy max-w-md">
            {emptyMessage ?? "Nothing to show yet."}
          </p>
        </div>
      )
    }

    if (state === "error") {
      return (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center" role="alert">
          <p className="text-sm text-destructive md:text-base">
            {errorMessage ?? "Something went wrong. Try again."}
          </p>
        </div>
      )
    }

    return children
  }

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl",
        tone !== "glass" && toneClass[tone],
        tone === "glass" && toneClass.glass,
        paddingClass[padding],
        className,
      )}
    >
      {hasHeader ? (
        <header className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            {title !== undefined ? (
              <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                {title}
              </h2>
            ) : null}
            {description !== undefined ? (
              <p className="app-page-copy">{description}</p>
            ) : null}
          </div>
          {actions !== undefined ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
          ) : null}
        </header>
      ) : null}

      <div className={cn("min-h-0 flex-1", hasHeader ? "" : "flex flex-col")}>{renderBody()}</div>

      {footer !== undefined ? (
        <footer className="mt-4 shrink-0 border-t border-border pt-4">{footer}</footer>
      ) : null}
    </section>
  )
}
