import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type DataTableToolbarProps = {
  leftSlot?: ReactNode
  rightSlot?: ReactNode
  className?: string
}

export const DataTableToolbar = ({
  leftSlot,
  rightSlot,
  className,
}: DataTableToolbarProps) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1">{leftSlot}</div>
      <div className="flex shrink-0 items-center justify-end gap-2">{rightSlot}</div>
    </div>
  )
}
