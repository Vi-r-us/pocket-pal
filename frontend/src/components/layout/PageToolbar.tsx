import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type PageToolbarProps = {
  left?: ReactNode
  right?: ReactNode
  className?: string
}

export const PageToolbar = ({ left, right, className }: PageToolbarProps) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">{left}</div>
      <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3">
        {right}
      </div>
    </div>
  )
}
