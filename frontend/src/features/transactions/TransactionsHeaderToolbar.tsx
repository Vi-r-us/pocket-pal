import { ListFilter, Plus, Search } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const parsePositiveAmount = (raw: string) => {
  const n = Number.parseFloat(raw.replace(/,/g, ""))
  if (!Number.isFinite(n) || n <= 0) {
    return null
  }
  return n
}

export const TransactionsHeaderToolbar = () => {
  const searchInputId = useId()
  const filterDateFromId = useId()
  const filterDateToId = useId()
  const newTxAmountId = useId()
  const newTxNoteId = useId()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const [newTxOpen, setNewTxOpen] = useState(false)
  const [newTxAmount, setNewTxAmount] = useState("")
  const [newTxNote, setNewTxNote] = useState("")
  const [newTxSubmitError, setNewTxSubmitError] = useState<string | null>(null)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleApplyFilters = () => {
    setFilterOpen(false)
  }

  const handleNewTransactionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setNewTxSubmitError(null)
    const amount = parsePositiveAmount(newTxAmount.trim())
    if (amount === null) {
      setNewTxSubmitError("Enter a positive amount")
      return
    }
    setNewTxOpen(false)
    setNewTxAmount("")
    setNewTxNote("")
  }

  const handleOpenNewTxChange = (open: boolean) => {
    setNewTxOpen(open)
    if (!open) {
      setNewTxAmount("")
      setNewTxNote("")
      setNewTxSubmitError(null)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="shrink-0 md:h-9 md:w-auto md:gap-2 md:px-3 rounded-lg"
        aria-label="Filter transactions"
        onClick={() => setFilterOpen(true)}
      >
        <ListFilter className="size-4 shrink-0" aria-hidden />
        <span className="hidden md:inline">Filter</span>
      </Button>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filter transactions</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={filterDateFromId}>From date</Label>
              <Input
                id={filterDateFromId}
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={filterDateToId}>To date</Label>
              <Input
                id={filterDateToId}
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter className="border-t border-border sm:flex-row sm:justify-end">
            <Button type="button" onClick={handleApplyFilters}>
              Apply filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="relative hidden min-w-0 flex-1 md:flex md:justify-end xl:justify-start">
        <label htmlFor={searchInputId} className="sr-only">
          Search transactions
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={searchInputId}
          type="search"
          placeholder="Search transactions"
          className="h-9 w-full max-w-full pl-9 md:max-w-xs xl:max-w-sm"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <Button
        type="button"
        size="sm"
        className="shrink-0 gap-1.5 rounded-lg px-3 md:h-9 md:w-auto md:gap-2 md:px-3"
        aria-label="New transaction"
        onClick={() => setNewTxOpen(true)}
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        <span aria-hidden className="inline sm:hidden">
          New
        </span>
        <span aria-hidden className="hidden sm:inline">
          New transaction
        </span>
      </Button>

      <Dialog open={newTxOpen} onOpenChange={handleOpenNewTxChange}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <form
            className="flex flex-col gap-4"
            onSubmit={handleNewTransactionSubmit}
          >
            <DialogHeader>
              <DialogTitle>New transaction</DialogTitle>
              <DialogDescription>
                Amount is required. The note helps you recognize the entry later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor={newTxAmountId}>Amount</Label>
                <Input
                  id={newTxAmountId}
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={newTxAmount}
                  onChange={(e) => setNewTxAmount(e.target.value)}
                  aria-invalid={newTxSubmitError ? true : undefined}
                  aria-describedby={
                    newTxSubmitError ? "new-tx-amount-error" : undefined
                  }
                />
                {newTxSubmitError ? (
                  <p
                    id="new-tx-amount-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {newTxSubmitError}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor={newTxNoteId}>Note</Label>
                <Input
                  id={newTxNoteId}
                  name="note"
                  type="text"
                  autoComplete="off"
                  placeholder="What was this for?"
                  value={newTxNote}
                  onChange={(e) => setNewTxNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewTxOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save draft</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
