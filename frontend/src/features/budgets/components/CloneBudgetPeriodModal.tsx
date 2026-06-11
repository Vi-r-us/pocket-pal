import { useEffect, useMemo, useState } from "react"
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
import type {
  BudgetCloneRow,
  CloneConflictStrategy,
} from "@/features/budgets/types"
import { getInlineErrorMessage } from "@/lib/errors/normalize"
import { inputValueToYyyyMm } from "@/lib/month"
import { cn } from "@/lib/utils"

type RowStatus = "new" | "overwrite" | "skip"

type CloneBudgetPeriodModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceMonthValue: string
  sourceMonthLabel: string
  sourceRows: BudgetCloneRow[]
  formatAmount: (minor: number) => string
  onClone: (
    targetMonthValue: string,
    strategy: CloneConflictStrategy,
  ) => Promise<void>
}

const STRATEGY_OPTIONS: Array<{
  value: CloneConflictStrategy
  label: string
  description: string
}> = [
  {
    value: "overwrite",
    label: "Overwrite existing",
    description:
      "Replace amounts for categories that already exist in the target month.",
  },
  {
    value: "skip",
    label: "Skip existing",
    description: "Only copy categories that are missing in the target month.",
  },
]

const STATUS_BADGES: Record<RowStatus, { label: string; className: string }> = {
  new: {
    label: "New",
    className:
      "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  overwrite: {
    label: "Will overwrite",
    className:
      "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  skip: {
    label: "Will skip",
    className: "border-transparent bg-muted text-muted-foreground",
  },
}

const formatMonthValue = (value: string) => {
  if (!value) return ""
  const parsed = parse(value, "yyyy-MM", new Date())
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMMM yyyy")
}

export const CloneBudgetPeriodModal = ({
  open,
  onOpenChange,
  sourceMonthValue,
  sourceMonthLabel,
  sourceRows,
  formatAmount,
  onClone,
}: CloneBudgetPeriodModalProps) => {
  const [targetMonth, setTargetMonth] = useState("")
  const [strategy, setStrategy] = useState<CloneConflictStrategy>("overwrite")
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
      setStrategy("overwrite")
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

  const isSameMonth = targetMonth === sourceMonthValue
  const hasTarget = Boolean(targetMonth) && !isSameMonth && !isLoadingTarget
  const targetMonthLabel = formatMonthValue(targetMonth)

  const previewRows = useMemo(
    () =>
      sourceRows.map((row) => {
        const exists = existingTargetCategoryIds.includes(row.category_id)
        const status: RowStatus =
          !hasTarget || !exists
            ? "new"
            : strategy === "overwrite"
              ? "overwrite"
              : "skip"
        return { row, status }
      }),
    [sourceRows, existingTargetCategoryIds, hasTarget, strategy],
  )

  const rowsToCopy = previewRows.filter((entry) => entry.status !== "skip")
  const totalMinorToCopy = rowsToCopy.reduce(
    (sum, entry) => sum + entry.row.amount_minor,
    0,
  )

  const canClone = hasTarget && rowsToCopy.length > 0 && !isSubmitting

  const handleClone = async () => {
    if (!canClone) return

    setIsSubmitting(true)
    setSubmitError("")
    try {
      await onClone(targetMonth, strategy)
      handleOpenChange(false)
    } catch (error) {
      setSubmitError(
        getInlineErrorMessage(error, "Could not clone month budgets"),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Copy month budget"
      description={`Copy all category budgets from ${sourceMonthLabel} to another month.`}
      size="lg"
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
          <Button type="button" disabled={!canClone} onClick={handleClone}>
            {isSubmitting
              ? "Cloning..."
              : rowsToCopy.length > 0
                ? `Clone ${rowsToCopy.length} budget${rowsToCopy.length === 1 ? "" : "s"}`
                : "Clone budgets"}
          </Button>
        </>
      }
    >
      {sourceRows.length === 0 ? (
        <Alert>
          <AlertTriangle aria-hidden />
          <AlertTitle>No budgets to copy</AlertTitle>
          <AlertDescription>
            {sourceMonthLabel} has no category budgets yet.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
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
              <Label htmlFor="clone-period-target-month">To</Label>
              <MonthPickerField
                id="clone-period-target-month"
                value={targetMonth}
                onChange={setTargetMonth}
                placeholder="Pick month"
                aria-label="Target month for cloned budgets"
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

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              If a category already exists in{" "}
              {targetMonthLabel || "the target month"}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {STRATEGY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                    strategy === option.value
                      ? "border-ring bg-muted/60"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    name="clone-conflict-strategy"
                    value={option.value}
                    checked={strategy === option.value}
                    onChange={() => setStrategy(option.value)}
                    className="mt-0.5 size-3.5 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {previewRows.map(({ row, status }) => (
                  <li
                    key={row.category_id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2",
                      status === "skip" && "opacity-60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{row.category_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_TYPE_LABELS[row.category_type]}
                      </p>
                    </div>
                    {hasTarget ? (
                      <Badge
                        variant="outline"
                        className={STATUS_BADGES[status].className}
                      >
                        {STATUS_BADGES[status].label}
                      </Badge>
                    ) : null}
                    <p className="w-24 shrink-0 text-right text-sm font-medium">
                      {formatAmount(row.amount_minor)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {rowsToCopy.length} of {sourceRows.length} categories
              </Badge>
              <Badge variant="secondary">
                {formatAmount(totalMinorToCopy)} total
              </Badge>
            </div>
          </div>

          {hasTarget && rowsToCopy.length === 0 ? (
            <Alert>
              <AlertTriangle aria-hidden />
              <AlertTitle>Nothing to copy</AlertTitle>
              <AlertDescription>
                Every category already exists in {targetMonthLabel}. Switch to
                &quot;Overwrite existing&quot; to replace them.
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
      )}
    </AppModal>
  )
}
