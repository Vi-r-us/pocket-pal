import { useEffect, useState } from "react"
import { format, parse } from "date-fns"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { MonthPickerField } from "@/components/MonthPickerField"
import { AppModal } from "@/components/modals"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  CATEGORY_TYPE_LABELS,
  fetchBudgetMonthCategoryIds,
} from "@/features/budgets/budgetClone"
import type { BudgetCloneRow } from "@/features/budgets/types"
import { getInlineErrorMessage } from "@/lib/errors/normalize"
import { inputValueToYyyyMm } from "@/lib/month"

type CloneBudgetCategoryModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: BudgetCloneRow | null
  sourceMonthValue: string
  sourceMonthLabel: string
  formatAmount: (minor: number) => string
  onClone: (targetMonthValue: string) => Promise<void>
}

const formatMonthValue = (value: string) => {
  if (!value) return ""
  const parsed = parse(value, "yyyy-MM", new Date())
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMMM yyyy")
}

export const CloneBudgetCategoryModal = ({
  open,
  onOpenChange,
  row,
  sourceMonthValue,
  sourceMonthLabel,
  formatAmount,
  onClone,
}: CloneBudgetCategoryModalProps) => {
  const [targetMonth, setTargetMonth] = useState("")
  const [existingTargetCategoryIds, setExistingTargetCategoryIds] = useState<
    number[]
  >([])
  const [isLoadingTarget, setIsLoadingTarget] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return
    if (!nextOpen) {
      setTargetMonth("")
      setExistingTargetCategoryIds([])
      setSubmitError("")
    }
    onOpenChange(nextOpen)
  }

  useEffect(() => {
    if (!open || !targetMonth || targetMonth === sourceMonthValue) {
      setExistingTargetCategoryIds([])
      return
    }

    const targetYyyyMm = inputValueToYyyyMm(targetMonth)
    if (targetYyyyMm === null) return

    let isCurrent = true
    setIsLoadingTarget(true)

    fetchBudgetMonthCategoryIds(targetYyyyMm)
      .then((categoryIds) => {
        if (!isCurrent) return
        setExistingTargetCategoryIds(categoryIds)
      })
      .catch(() => {
        if (!isCurrent) return
        setExistingTargetCategoryIds([])
      })
      .finally(() => {
        if (isCurrent) setIsLoadingTarget(false)
      })

    return () => {
      isCurrent = false
    }
  }, [open, sourceMonthValue, targetMonth])

  if (!row) return null

  const targetMonthLabel = formatMonthValue(targetMonth)
  const isSameMonth = targetMonth === sourceMonthValue
  const hasConflict =
    Boolean(targetMonth) &&
    !isSameMonth &&
    existingTargetCategoryIds.includes(row.category_id)
  const canClone = Boolean(targetMonth) && !isSameMonth && !isLoadingTarget

  const handleClone = async () => {
    if (!canClone || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError("")
    try {
      await onClone(targetMonth)
      handleOpenChange(false)
    } catch (error) {
      setSubmitError(
        getInlineErrorMessage(error, "Could not clone category budget"),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Clone category budget"
      description={`Copy ${row.category_name} from ${sourceMonthLabel} to another month.`}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canClone || isSubmitting}
            onClick={handleClone}
          >
            {isSubmitting ? "Cloning..." : "Clone budget"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{row.category_name}</p>
            <Badge variant="outline">
              {CATEGORY_TYPE_LABELS[row.category_type]}
            </Badge>
          </div>
          <p className="shrink-0 text-sm font-semibold">
            {formatAmount(row.amount_minor)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <Label>From</Label>
            <div className="flex h-8 items-center rounded-lg border border-border bg-muted/40 px-2.5 text-sm text-muted-foreground">
              {sourceMonthLabel}
            </div>
          </div>
          <ArrowRight
            className="mt-6 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="flex-1 space-y-2">
            <Label htmlFor="clone-category-target-month">To</Label>
            <MonthPickerField
              id="clone-category-target-month"
              value={targetMonth}
              onChange={setTargetMonth}
              placeholder="Pick month"
              aria-label="Target month for cloned budget"
            />
          </div>
        </div>

        {isSameMonth ? (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden />
            <AlertTitle>Pick a different month</AlertTitle>
            <AlertDescription>
              The target month must be different from the source month.
            </AlertDescription>
          </Alert>
        ) : null}

        {hasConflict ? (
          <Alert>
            <AlertTriangle aria-hidden />
            <AlertTitle>
              {targetMonthLabel} already budgets this category
            </AlertTitle>
            <AlertDescription>
              Cloning will replace the existing amount for {row.category_name}.
            </AlertDescription>
          </Alert>
        ) : null}

        {submitError ? (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden />
            <AlertTitle>Clone failed</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </AppModal>
  )
}
