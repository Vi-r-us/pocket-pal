import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DataTableBaseProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  isLoading?: boolean
  emptyMessage?: string
  className?: string
}

const SortingIcon = ({ direction }: { direction: false | "asc" | "desc" }) => {
  if (direction === "asc") return <ArrowUp className="size-4" aria-hidden />
  if (direction === "desc") return <ArrowDown className="size-4" aria-hidden />
  return <ArrowUpDown className="size-4" aria-hidden />
}

export const DataTableBase = <TData, TValue>({
  columns,
  data,
  sorting = [],
  onSortingChange,
  isLoading = false,
  emptyMessage = "No records found.",
  className,
}: DataTableBaseProps<TData, TValue>) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting },
    onSortingChange,
  })

  const colSpan = columns.length > 0 ? columns.length : 1
  const rows = table.getRowModel().rows

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sortDirection = header.column.getIsSorted()

                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : canSort ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortingIcon direction={sortDirection} />
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="h-24 text-center">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading...
                </span>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
