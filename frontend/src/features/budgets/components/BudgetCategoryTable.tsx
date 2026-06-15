import { type ColumnDef } from "@tanstack/react-table"
import {
  Copy,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Receipt,
  RotateCcw,
  TrendingUp,
  Trash2,
} from "lucide-react"
import { useCallback, useMemo } from "react"
import {
  DataTableBase,
  DataTablePagination,
} from "@/components/data-table"
import { GridItem } from "@/components/layout/GridItem"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import type {
  BudgetCategoryFilterType,
  BudgetCategoryTableRow,
  BudgetCategoryType,
} from "../types"
import { formatProgressLabel, toCurrency } from "../utils"

type CategoryAction = "edit" | "reset" | "delete" | "clone"

type BudgetCategoryTableProps = {
  currencyCode: string | null
  categoryTypeFilter: BudgetCategoryFilterType
  paginatedRows: BudgetCategoryTableRow[]
  totalFilteredRows: number
  safeTablePage: number
  tableLimit: number
  tableTotalPages: number
  isMobileTableView: boolean
  isTabletTableView: boolean
  onCategoryTypeFilterChange: (value: BudgetCategoryFilterType) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onCategoryAction: (action: CategoryAction, row: BudgetCategoryTableRow) => void
}

const getCategoryIcon = (type: BudgetCategoryType) => {
  if (type === "income") return TrendingUp
  if (type === "savings") return PiggyBank
  return Receipt
}

export const BudgetCategoryTable = ({
  currencyCode,
  categoryTypeFilter,
  paginatedRows,
  totalFilteredRows,
  safeTablePage,
  tableLimit,
  tableTotalPages,
  isMobileTableView,
  isTabletTableView,
  onCategoryTypeFilterChange,
  onPageChange,
  onLimitChange,
  onCategoryAction,
}: BudgetCategoryTableProps) => {
  const emptyMessage =
    categoryTypeFilter === "all"
      ? "No categories in this month."
      : `No ${categoryTypeFilter} categories in this month.`

  const renderCategoryRowActions = useCallback(
    (row: BudgetCategoryTableRow) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Open actions for ${row.category_name}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => onCategoryAction("edit", row)}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onCategoryAction("clone", row)}>
            <Copy className="size-4" aria-hidden />
            Clone
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onCategoryAction("reset", row)}>
            <RotateCcw className="size-4" aria-hidden />
            Reset
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => onCategoryAction("delete", row)}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete budget
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [onCategoryAction],
  )

  const columns = useMemo<ColumnDef<BudgetCategoryTableRow>[]>(() => {
    const categoryColumn: ColumnDef<BudgetCategoryTableRow> = {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }) => {
        const Icon = getCategoryIcon(row.original.category_type)
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {row.original.category_name}
              </p>
              <p className="text-xs capitalize text-muted-foreground">
                {row.original.category_type}
              </p>
            </div>
          </div>
        )
      },
    }

    const budgetColumn: ColumnDef<BudgetCategoryTableRow> = {
      accessorKey: "budget_minor",
      header: "Budget",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {currencyCode
            ? toCurrency(row.original.budget_minor, currencyCode)
            : "—"}
        </span>
      ),
    }

    const spentColumn: ColumnDef<BudgetCategoryTableRow> = {
      accessorKey: "spent_minor",
      header: "Spent",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {currencyCode
            ? toCurrency(row.original.spent_minor, currencyCode)
            : "—"}
        </span>
      ),
    }

    const remainingColumn: ColumnDef<BudgetCategoryTableRow> = {
      accessorKey: "remaining_minor",
      header: "Remaining",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {currencyCode
            ? toCurrency(row.original.remaining_minor, currencyCode)
            : "—"}
        </span>
      ),
    }

    const progressColumn: ColumnDef<BudgetCategoryTableRow> = {
      accessorKey: "progress_percent",
      header: "Progress",
      cell: ({ row }) => (
        <div className="flex min-w-[140px] items-center gap-2">
          <Progress
            value={row.original.progress_percent_for_bar}
            className="h-2"
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatProgressLabel(row.original.progress_percent)}
          </span>
        </div>
      ),
    }

    const actionColumn: ColumnDef<BudgetCategoryTableRow> = {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          {renderCategoryRowActions(row.original)}
        </div>
      ),
    }

    if (isTabletTableView) {
      return [categoryColumn, spentColumn, progressColumn]
    }

    return [
      categoryColumn,
      budgetColumn,
      spentColumn,
      remainingColumn,
      progressColumn,
      actionColumn,
    ]
  }, [currencyCode, isTabletTableView, renderCategoryRowActions])

  return (
    <GridItem span={12} fill>
      <Card>
        <CardHeader className="flex items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Category Table</CardTitle>
          <ToggleGroup
            className="gap-2 rounded-lg"
            type="single"
            value={categoryTypeFilter}
            onValueChange={(value) => {
              if (
                value === "all" ||
                value === "expense" ||
                value === "income" ||
                value === "savings"
              ) {
                onCategoryTypeFilterChange(value)
              }
            }}
          >
            {(["all", "expense", "income", "savings"] as const).map((type) => (
              <ToggleGroupItem
                key={type}
                value={type}
                aria-label={`${type} categories`}
                className={cn(
                  "!rounded-sm gap-2",
                  categoryTypeFilter === type
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMobileTableView ? (
            paginatedRows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedRows.map((row) => {
                  const Icon = getCategoryIcon(row.category_type)
                  return (
                    <Card key={row.category_id}>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
                              <Icon className="size-4" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {row.category_name}
                              </p>
                              <p className="text-xs capitalize text-muted-foreground">
                                {row.category_type}
                              </p>
                            </div>
                          </div>
                          {renderCategoryRowActions(row)}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Spent</span>
                          <span className="tabular-nums">
                            {currencyCode
                              ? toCurrency(row.spent_minor, currencyCode)
                              : "—"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span className="tabular-nums">
                              {formatProgressLabel(row.progress_percent)}
                            </span>
                          </div>
                          <Progress
                            value={row.progress_percent_for_bar}
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          ) : (
            <DataTableBase
              columns={columns}
              data={paginatedRows}
              isLoading={false}
              emptyMessage={emptyMessage}
            />
          )}

          <DataTablePagination
            page={safeTablePage}
            limit={tableLimit}
            total={totalFilteredRows}
            totalPages={tableTotalPages}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
            limitOptions={[5, 10, 20, 50]}
          />
        </CardContent>
      </Card>
    </GridItem>
  )
}
