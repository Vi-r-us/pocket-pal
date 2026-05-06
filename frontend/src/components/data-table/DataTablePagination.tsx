import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DataTablePaginationProps = {
  page: number
  limit: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  limitOptions?: number[]
  className?: string
}

export const DataTablePagination = ({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  className,
}: DataTablePaginationProps) => {
  const safePage = Math.max(page, 1)
  const safeLimit = Math.max(limit, 1)
  const safeTotalPages = Math.max(totalPages, 1)
  const canGoPrev = safePage > 1
  const canGoNext = safePage < safeTotalPages

  const startItem = total === 0 ? 0 : (safePage - 1) * safeLimit + 1
  const endItem = total === 0 ? 0 : Math.min(safePage * safeLimit, total)

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          Showing {startItem}-{endItem} of {total}
        </span>
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <Select
            value={String(safeLimit)}
            onValueChange={(value) => {
              const nextLimit = Number(value)
              if (Number.isFinite(nextLimit) && nextLimit > 0) {
                onLimitChange(nextLimit)
              }
            }}
          >
            <SelectTrigger size="sm" className="w-[78px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {limitOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <span className="mr-1 text-muted-foreground">
          Page {safePage} of {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canGoPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canGoNext}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={!canGoNext}
          aria-label="Last page"
        >
          <ChevronsRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
