import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { TransactionsDatePicker } from "@/features/transactions/components/TransactionsDatePicker"
import type {
  AccountFilterOption,
  AdvancedFilterState,
  CategoryFilterOption,
  TransactionSource,
  TransactionSourceFilter,
  TransactionTypeFilter,
} from "@/types/transaction"

type TransactionsFiltersSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  draftFilters: AdvancedFilterState
  onDraftFilterChange: (key: keyof AdvancedFilterState, value: string) => void
  onApplyFilters: () => void
  onClearAllFilters: () => void
  filterValidationError: string
  filterOptionsError: string
  isLoadingFilterOptions: boolean
  accountOptions: AccountFilterOption[]
  categoryOptions: CategoryFilterOption[]
}

const SOURCE_LABELS: Record<TransactionSource, string> = {
  manual: "Manual",
  recurring: "Recurring",
  transfer: "Transfer",
  external: "External",
}

export const TransactionsFiltersSheet = ({
  open,
  onOpenChange,
  draftFilters,
  onDraftFilterChange,
  onApplyFilters,
  onClearAllFilters,
  filterValidationError,
  filterOptionsError,
  isLoadingFilterOptions,
  accountOptions,
  categoryOptions,
}: TransactionsFiltersSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Advanced filters</SheetTitle>
          <SheetDescription>Apply additional filters to refine transaction records</SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 px-4 pb-4">
          {filterOptionsError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {filterOptionsError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="filter-type">Type</Label>
            <Select
              value={draftFilters.type}
              onValueChange={(value) => onDraftFilterChange("type", value as TransactionTypeFilter)}
            >
              <SelectTrigger id="filter-type" className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filter-source">Source</Label>
            <Select
              value={draftFilters.source}
              onValueChange={(value) => onDraftFilterChange("source", value as TransactionSourceFilter)}
            >
              <SelectTrigger id="filter-source" className="w-full">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="manual">{SOURCE_LABELS.manual}</SelectItem>
                <SelectItem value="recurring">{SOURCE_LABELS.recurring}</SelectItem>
                <SelectItem value="transfer">{SOURCE_LABELS.transfer}</SelectItem>
                <SelectItem value="external">{SOURCE_LABELS.external}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filter-account">Account</Label>
            <Select
              value={draftFilters.account_id || "all"}
              onValueChange={(value) => onDraftFilterChange("account_id", value === "all" ? "" : value)}
            >
              <SelectTrigger id="filter-account" className="w-full">
                <SelectValue placeholder={isLoadingFilterOptions ? "Loading accounts..." : "All accounts"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accountOptions.map((account) => (
                  <SelectItem key={account.account_id} value={String(account.account_id)}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filter-category">Category</Label>
            <Select
              value={draftFilters.category_id || "all"}
              onValueChange={(value) => onDraftFilterChange("category_id", value === "all" ? "" : value)}
            >
              <SelectTrigger id="filter-category" className="w-full">
                <SelectValue placeholder={isLoadingFilterOptions ? "Loading categories..." : "All categories"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.category_id} value={String(category.category_id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="filter-date-from">Date from</Label>
              <TransactionsDatePicker
                id="filter-date-from"
                value={draftFilters.date_from}
                placeholder="Pick start date"
                onChange={(value) => onDraftFilterChange("date_from", value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter-date-to">Date to</Label>
              <TransactionsDatePicker
                id="filter-date-to"
                value={draftFilters.date_to}
                placeholder="Pick end date"
                onChange={(value) => onDraftFilterChange("date_to", value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="filter-amount-min">Amount min (minor)</Label>
              <Input
                id="filter-amount-min"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 1000"
                value={draftFilters.amount_min}
                onChange={(event) => onDraftFilterChange("amount_min", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter-amount-max">Amount max (minor)</Label>
              <Input
                id="filter-amount-max"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 50000"
                value={draftFilters.amount_max}
                onChange={(event) => onDraftFilterChange("amount_max", event.target.value)}
              />
            </div>
          </div>

          {filterValidationError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {filterValidationError}
            </p>
          ) : null}
        </div>

        <SheetFooter className="sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClearAllFilters}>
            Clear all
          </Button>
          {/* <SheetClose asChild>
            <Button type="button" variant="destructive">
              Cancel
            </Button>
          </SheetClose> */}
          <Button type="button" onClick={onApplyFilters}>
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
