import { createElement, useMemo, useState } from "react"
import { CircleDollarSign, Loader2 } from "lucide-react"
import { AppModal } from "@/components/modals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { getInlineErrorMessage } from "@/lib/errors/normalize"
import { resolveCategoryIcon } from "@/lib/categoryIcons"
import { cn } from "@/lib/utils"
import type {
  AccountFilterOption,
  ApiSuccess,
  CategoryFilterOption,
  SavingsMode,
  TransactionListItem,
  TransactionType,
} from "@/types/transaction"
import { Separator } from "@/components/ui/separator"

type StepKey = "details" | "more-details" | "review"
export type TransactionModalMode = "create" | "edit" | "clone"

type CreateTransactionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: TransactionModalMode
  initialTransaction: TransactionListItem | null
  accountOptions: AccountFilterOption[]
  categoryOptions: CategoryFilterOption[]
  isLoadingOptions: boolean
  onCompleted: () => void
}

type FormErrors = {
  amount?: string
  account_id?: string
  category_id?: string
  destination_account_id?: string
}

type FormState = {
  step: StepKey
  type: TransactionType
  payee: string
  notes: string
  amountMajor: string
  dateValue: string
  timeValue: string
  accountId: string
  categoryId: string
  savingsMode: SavingsMode
  destinationAccountId: string
}

const STEP_ORDER: StepKey[] = ["details", "more-details", "review"]

/** Sentinel value for outbound savings (money left the account, not to another PocketPal account). */
const EXTERNAL_TRANSFER_DESTINATION_VALUE = "__external__"

const getStepIndex = (step: StepKey) => STEP_ORDER.indexOf(step)

const toDateString = (value: Date) => {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, "0")
  const d = String(value.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const toTimeString = (value: Date) => {
  const hh = String(value.getHours()).padStart(2, "0")
  const mm = String(value.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

const toMajorAmountString = (minor: number | string) => {
  const normalizedMinor = typeof minor === "number" ? minor : Number(minor)
  if (!Number.isFinite(normalizedMinor)) return ""
  return (normalizedMinor / 100).toFixed(2)
}

const parseDescriptionParts = (description: string | null | undefined) => {
  const normalized = (description || "").trim()
  if (!normalized) {
    return { payee: "", notes: "" }
  }

  const notesMatch = normalized.match(/^(.*?)\s*\((.*)\)\s*$/)
  if (notesMatch) {
    return {
      payee: (notesMatch[1] || "").trim(),
      notes: (notesMatch[2] || "").trim(),
    }
  }

  const emDashIndex = normalized.indexOf(" — ")
  if (emDashIndex >= 0) {
    return {
      payee: normalized.slice(0, emDashIndex).trim(),
      notes: normalized.slice(emDashIndex + 3).trim(),
    }
  }

  return { payee: normalized, notes: "" }
}

const buildDescription = (payee: string, notes: string) => {
  const normalizedPayee = payee.trim()
  const normalizedNotes = notes.trim()
  if (normalizedPayee && normalizedNotes) {
    return `${normalizedPayee} (${normalizedNotes})`
  }
  if (normalizedPayee) return normalizedPayee
  if (normalizedNotes) return normalizedNotes
  return ""
}

const parseSavingsFormFields = (initialTransaction: TransactionListItem | null) => {
  const metadata = initialTransaction?.metadata
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { savingsMode: "allocate" as SavingsMode, destinationAccountId: "" }
  }

  const savingsMode = metadata.savings_mode === "transfer" ? "transfer" : "allocate"
  const destinationAccountId =
    metadata.destination_account_id != null
      ? String(metadata.destination_account_id)
      : savingsMode === "transfer"
        ? EXTERNAL_TRANSFER_DESTINATION_VALUE
        : ""

  return { savingsMode, destinationAccountId }
}

const buildInitialFormState = (
  mode: TransactionModalMode,
  initialTransaction: TransactionListItem | null,
): FormState => {
  const now = new Date()
  if (!initialTransaction || mode === "create") {
    return {
      step: "details",
      type: "expense",
      payee: "",
      notes: "",
      amountMajor: "",
      dateValue: toDateString(now),
      timeValue: toTimeString(now),
      accountId: "",
      categoryId: "",
      savingsMode: "allocate",
      destinationAccountId: "",
    }
  }

  const savingsFields = parseSavingsFormFields(initialTransaction)

  const descriptionParts = parseDescriptionParts(initialTransaction.description)
  const parsedTimestamp = new Date(initialTransaction.timestamp)
  const hasValidTimestamp = !Number.isNaN(parsedTimestamp.getTime())
  return {
    step: "details",
    type: initialTransaction.type,
    payee: descriptionParts.payee,
    notes: descriptionParts.notes,
    amountMajor: toMajorAmountString(initialTransaction.amount_minor),
    dateValue: hasValidTimestamp ? toDateString(parsedTimestamp) : toDateString(now),
    timeValue: hasValidTimestamp ? toTimeString(parsedTimestamp) : toTimeString(now),
    accountId: String(initialTransaction.account?.account_id ?? ""),
    categoryId: String(initialTransaction.category?.category_id ?? ""),
    savingsMode: savingsFields.savingsMode,
    destinationAccountId: savingsFields.destinationAccountId,
  }
}

const buildTimestampIso = (dateValue: string, timeValue: string) => {
  if (!dateValue) return null
  const normalizedTime = timeValue || "00:00"
  const timestamp = new Date(`${dateValue}T${normalizedTime}`)
  if (Number.isNaN(timestamp.getTime())) return null
  return timestamp.toISOString()
}

const parseMajorAmountToMinor = (rawAmount: string) => {
  const normalized = rawAmount.trim().replace(/,/g, "")
  if (!normalized) return null
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
}

const getModalTitle = (mode: TransactionModalMode) => {
  if (mode === "edit") return "Edit Transaction"
  if (mode === "clone") return "Clone Transaction"
  return "Add Transaction"
}

const getSubmitLabel = (mode: TransactionModalMode) => {
  if (mode === "edit") return "Save Changes"
  if (mode === "clone") return "Create Clone"
  return "Save Transaction"
}

export const CreateTransactionModal = ({
  open,
  onOpenChange,
  mode,
  initialTransaction,
  accountOptions,
  categoryOptions,
  isLoadingOptions,
  onCompleted,
}: CreateTransactionModalProps) => {
  const [form, setForm] = useState<FormState>(() => buildInitialFormState(mode, initialTransaction))
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredCategories = useMemo(
    () => categoryOptions.filter((category) => category.type === form.type),
    [categoryOptions, form.type],
  )

  const groupedCategories = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: CategoryFilterOption[] }>()

    for (const category of filteredCategories) {
      const groupName = category.group?.name?.trim() || "Other categories"
      const groupId = category.group?.group_id ? String(category.group.group_id) : "none"
      const key = `${groupId}:${groupName}`
      if (!groups.has(key)) {
        groups.set(key, { key, label: groupName, items: [] })
      }
      groups.get(key)?.items.push(category)
    }

    return Array.from(groups.values())
  }, [filteredCategories])

  const selectedAccount = accountOptions.find((account) => String(account.account_id) === form.accountId)
  const selectedCategory = filteredCategories.find((category) => String(category.category_id) === form.categoryId)
  const selectedDestinationAccount = accountOptions.find(
    (account) => String(account.account_id) === form.destinationAccountId,
  )
  const selectedCurrencyCode = selectedAccount?.currency_code || ""
  const isExternalTransferDestination = form.destinationAccountId === EXTERNAL_TRANSFER_DESTINATION_VALUE
  const isTransferLocked =
    mode === "edit" &&
    initialTransaction?.metadata != null &&
    typeof initialTransaction.metadata === "object" &&
    !Array.isArray(initialTransaction.metadata) &&
    initialTransaction.metadata.savings_mode === "transfer" &&
    initialTransaction.metadata.destination_account_id != null

  const destinationAccountOptions = useMemo(() => {
    if (!form.accountId || !selectedCurrencyCode) return []

    return accountOptions
      .filter(
        (account) =>
          account.is_active !== false &&
          String(account.account_id) !== form.accountId &&
          account.currency_code === selectedCurrencyCode,
      )
      .sort((left, right) => {
        const leftIsSavings = left.type === "savings" ? 0 : 1
        const rightIsSavings = right.type === "savings" ? 0 : 1
        if (leftIsSavings !== rightIsSavings) return leftIsSavings - rightIsSavings
        return left.name.localeCompare(right.name)
      })
  }, [accountOptions, form.accountId, selectedCurrencyCode])
  const currentStepIndex = getStepIndex(form.step)

  const getStepTriggerClassName = (step: StepKey) => {
    const stepIndex = getStepIndex(step)
    const isCurrentStep = stepIndex === currentStepIndex
    const isCompletedStep = stepIndex < currentStepIndex

    return cn(
      "justify-start text-sm rounded-md px-4 border-2 transition-colors",
      isCurrentStep && "border-primary bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:bg-primary/90",
      isCompletedStep && "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15 focus-visible:bg-primary/15",
      !isCurrentStep && !isCompletedStep && "border-border bg-muted/20 text-muted-foreground hover:bg-muted/30 focus-visible:bg-muted/30",
    )
  }

  const getStepSeparatorClassName = (stepBeforeSeparator: StepKey) => {
    const stepIndex = getStepIndex(stepBeforeSeparator)
    const isCompletedPath = stepIndex < currentStepIndex
    return cn("w-[2px] ml-10 h-[1.5rem] align-middle", isCompletedPath ? "bg-primary" : "bg-border")
  }

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrors({})
      setSubmitError("")
      setIsSubmitting(false)
    }
    onOpenChange(nextOpen)
  }

  const handleTypeChange = (nextType: TransactionType) => {
    const shouldClearCategory =
      !!form.categoryId &&
      !categoryOptions.some(
        (category) => String(category.category_id) === form.categoryId && category.type === nextType,
      )
    setForm((previous) => ({
      ...previous,
      type: nextType,
      categoryId: shouldClearCategory ? "" : previous.categoryId,
      ...(nextType !== "savings"
        ? { savingsMode: "allocate" as SavingsMode, destinationAccountId: "" }
        : {}),
    }))
  }

  const validateStep = (targetStep: StepKey) => {
    const nextErrors: FormErrors = {}

    if (targetStep === "details" || targetStep === "review") {
      const amountMinor = parseMajorAmountToMinor(form.amountMajor)
      if (amountMinor === null) {
        nextErrors.amount = "Enter a valid amount greater than 0"
      }
    }

    if (targetStep === "more-details" || targetStep === "review") {
      if (!form.accountId) {
        nextErrors.account_id = "Select an account"
      }
      if (!form.categoryId) {
        nextErrors.category_id = "Select a category"
      }
      if (
        form.type === "savings" &&
        form.savingsMode === "transfer" &&
        !isTransferLocked &&
        !isExternalTransferDestination &&
        !form.destinationAccountId
      ) {
        nextErrors.destination_account_id = "Select a destination account"
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const goToNextStep = () => {
    if (!validateStep(form.step)) return
    const currentIndex = STEP_ORDER.indexOf(form.step)
    const nextStep = STEP_ORDER[Math.min(currentIndex + 1, STEP_ORDER.length - 1)]
    setForm((previous) => ({ ...previous, step: nextStep }))
  }

  const goToPreviousStep = () => {
    const currentIndex = STEP_ORDER.indexOf(form.step)
    const previousStep = STEP_ORDER[Math.max(currentIndex - 1, 0)]
    setForm((previous) => ({ ...previous, step: previousStep }))
  }

  const reviewSection = (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Mode</span>
        <Badge variant="outline" data-slot="badge" className="capitalize text-primary rounded-md border-primary bg-primary/10">
          {mode}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Type</span>
        <Badge variant="outline" data-slot="badge" className="capitalize text-primary rounded-md border-primary bg-primary/10">
          {form.type === "expense" ? "Expense" : form.type === "income" ? "Income" : "Savings"}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Amount</span>
        <span className="font-medium">
          {form.amountMajor || "—"} {selectedCurrencyCode || ""}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Date & time</span>
        <span>
          {form.dateValue || "—"} {form.timeValue || ""}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Category</span>
        <span className="text-right">{selectedCategory?.name || "—"}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Account</span>
        <span className="text-right">{selectedAccount?.name || "—"}</span>
      </div>
      {form.type === "savings" ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Saving method</span>
            <span className="text-right">
              {form.savingsMode === "transfer" ? "Transfer to another account" : "Allocate on this account"}
            </span>
          </div>
          {form.savingsMode === "transfer" ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">To account</span>
              <span className="text-right">
                {isExternalTransferDestination
                  ? "External / elsewhere"
                  : selectedDestinationAccount?.name || "—"}
              </span>
            </div>
          ) : null}
        </>
      ) : null}
      <div className="grid gap-1">
        <span className="text-muted-foreground">Description to save</span>
        <span className="rounded-md border bg-background px-2 py-1.5 text-xs">
          {buildDescription(form.payee, form.notes) || "No description"}
        </span>
      </div>
    </div>
  )

  const detailSection = (
    <div className="grid gap-4">
      <div className="inline-flex w-full rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          className={cn(
            "h-8 flex-1 rounded-md text-sm font-medium transition-colors",
            form.type === "expense" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => handleTypeChange("expense")}
        >
          Expense
        </button>
        <button
          type="button"
          className={cn(
            "h-8 flex-1 rounded-md text-sm font-medium transition-colors",
            form.type === "income" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => handleTypeChange("income")}
        >
          Income
        </button>
        <button
          type="button"
          className={cn(
            "h-8 flex-1 rounded-md text-sm font-medium transition-colors",
            form.type === "savings" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => handleTypeChange("savings")}
        >
          Savings
        </button>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tx-payee">Payee / Merchant</Label>
        <Input
          id="tx-payee"
          type="text"
          placeholder="Enter merchant or payee"
          value={form.payee}
          onChange={(event) => setForm((previous) => ({ ...previous, payee: event.target.value }))}
        />
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="tx-amount">Amount</Label>
          <div className="flex gap-2">
            <Input
              id="tx-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amountMajor}
              onChange={(event) => setForm((previous) => ({ ...previous, amountMajor: event.target.value }))}
              aria-invalid={errors.amount ? true : undefined}
              className="flex-1"
            />
            <Select value={selectedCurrencyCode || undefined} disabled>
              <SelectTrigger className="w-[96px]">
                <SelectValue placeholder="Curr" />
              </SelectTrigger>
              <SelectContent>
                {selectedCurrencyCode ? (
                  <SelectItem value={selectedCurrencyCode}>{selectedCurrencyCode}</SelectItem>
                ) : (
                  <SelectItem value="none">Select account</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {errors.amount ? <p className="text-destructive text-xs">{errors.amount}</p> : null}
        </div>

        <div className="grid gap-1.5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              type="date"
              value={form.dateValue}
              onChange={(event) => setForm((previous) => ({ ...previous, dateValue: event.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tx-time">Time</Label>
            <Input
              id="tx-time"
              type="time"
              value={form.timeValue}
              onChange={(event) => setForm((previous) => ({ ...previous, timeValue: event.target.value }))}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const moreDetailsSection = (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="tx-category">Category</Label>
        <Select value={form.categoryId || undefined} onValueChange={(value) => setForm((previous) => ({ ...previous, categoryId: value }))}>
          <SelectTrigger id="tx-category" className={cn(errors.category_id && "border-destructive", "w-full")}>
            <SelectValue placeholder={isLoadingOptions ? "Loading categories..." : "Select category"} />
          </SelectTrigger>
          <SelectContent>
            {groupedCategories.map((group) => (
              <SelectGroup key={group.key} className="flex flex-col">
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map((category) => {
                  const Icon = resolveCategoryIcon(category.icon_key, category.group?.icon_key)
                  return (
                    <SelectItem key={category.category_id} value={String(category.category_id)}>
                      <span className="flex items-center gap-3">
                        {createElement(Icon, { className: "size-4 text-muted-foreground", "aria-hidden": true })}
                        <span className="text-wrap text-ellipsis">{category.name}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {errors.category_id ? <p className="text-destructive text-xs">{errors.category_id}</p> : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tx-account">Account</Label>
        <Select
          value={form.accountId || undefined}
          onValueChange={(value) =>
            setForm((previous) => ({
              ...previous,
              accountId: value,
              destinationAccountId:
                previous.destinationAccountId === value
                  ? EXTERNAL_TRANSFER_DESTINATION_VALUE
                  : previous.destinationAccountId,
            }))
          }
        >
          <SelectTrigger id="tx-account" className={cn(errors.account_id && "border-destructive", "w-full")}>
            <SelectValue placeholder={isLoadingOptions ? "Loading accounts..." : "Select account"} />
          </SelectTrigger>
          <SelectContent>
            {accountOptions.map((account) => (
              <SelectItem key={account.account_id} value={String(account.account_id)}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.account_id ? <p className="text-destructive text-xs">{errors.account_id}</p> : null}
      </div>

      {form.type === "savings" ? (
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-4">
          <div className="grid gap-2">
            <Label>Saving method</Label>
            <div className="inline-flex w-full rounded-lg border bg-muted/40 p-1">
              <button
                type="button"
                disabled={isTransferLocked}
                className={cn(
                  "h-9 flex-1 rounded-md px-2 text-sm font-medium transition-colors",
                  form.savingsMode === "allocate"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  isTransferLocked && "cursor-not-allowed opacity-60",
                )}
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    savingsMode: "allocate",
                    destinationAccountId: "",
                  }))
                }
              >
                Allocate on this account
              </button>
              <button
                type="button"
                disabled={isTransferLocked}
                className={cn(
                  "h-9 flex-1 rounded-md px-2 text-sm font-medium transition-colors",
                  form.savingsMode === "transfer"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  isTransferLocked && "cursor-not-allowed opacity-60",
                )}
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    savingsMode: "transfer",
                    destinationAccountId: EXTERNAL_TRANSFER_DESTINATION_VALUE,
                  }))
                }
              >
                Transfer to another account
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              {form.savingsMode === "allocate"
                ? "Track savings without changing this account balance."
                : isExternalTransferDestination
                  ? "Money left this account for an external investment or payee (broker, SIP, another person)."
                  : "Money moved to one of your other PocketPal accounts."}
            </p>
          </div>

          {form.savingsMode === "transfer" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="tx-destination-account">To account</Label>
              <Select
                value={form.destinationAccountId || EXTERNAL_TRANSFER_DESTINATION_VALUE}
                disabled={isTransferLocked}
                onValueChange={(value) =>
                  setForm((previous) => ({ ...previous, destinationAccountId: value }))
                }
              >
                <SelectTrigger
                  id="tx-destination-account"
                  className={cn(errors.destination_account_id && "border-destructive", "w-full")}
                >
                  <SelectValue
                    placeholder={
                      !form.accountId
                        ? "Select source account first"
                        : "Select where the money went"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EXTERNAL_TRANSFER_DESTINATION_VALUE}>
                    External / elsewhere (default)
                  </SelectItem>
                  {destinationAccountOptions.map((account) => (
                    <SelectItem key={account.account_id} value={String(account.account_id)}>
                      {account.name}
                      {account.type === "savings" ? " (Savings)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.destination_account_id ? (
                <p className="text-destructive text-xs">{errors.destination_account_id}</p>
              ) : null}
              {isTransferLocked ? (
                <p className="text-muted-foreground text-xs">
                  Transfer destination cannot be changed. Delete and recreate to move funds elsewhere.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="tx-notes">Notes (optional)</Label>
        <textarea
          id="tx-notes"
          className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="Add a note..."
          value={form.notes}
          onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
          maxLength={120}
        />
        <p className="text-right text-muted-foreground text-xs">{form.notes.length}/120</p>
      </div>
    </div>
  )

  const handleSubmit = async () => {
    if (!validateStep("review")) {
      setForm((previous) => ({ ...previous, step: "review" }))
      return
    }

    if (mode === "edit" && !initialTransaction?.transaction_id) {
      setSubmitError("Could not update transaction: missing transaction id")
      return
    }

    const amountMinor = parseMajorAmountToMinor(form.amountMajor)
    if (amountMinor === null) return

    setSubmitError("")
    setIsSubmitting(true)

    try {
      const description = buildDescription(form.payee, form.notes)
      const timestampIso = buildTimestampIso(form.dateValue, form.timeValue)
      const source = mode === "edit" ? (initialTransaction?.source ?? "manual") : "manual"
      const payload = {
        account_id: Number(form.accountId),
        category_id: Number(form.categoryId),
        amount_minor: amountMinor,
        currency: selectedCurrencyCode || undefined,
        type: form.type,
        source,
        description,
        ...(timestampIso ? { timestamp: timestampIso } : {}),
        ...(form.type === "savings" && mode !== "edit"
          ? {
              savings_mode: form.savingsMode,
              ...(form.savingsMode === "transfer" && !isExternalTransferDestination
                ? { destination_account_id: Number(form.destinationAccountId) }
                : {}),
            }
          : {}),
      }

      if (mode === "edit") {
        await api.patch(`/transactions/${initialTransaction.transaction_id}`, payload)
      } else {
        await api.post<ApiSuccess<TransactionListItem>>("/transactions", payload)
      }

      onCompleted()
      handleModalOpenChange(false)
    } catch (error) {
      setSubmitError(
        getInlineErrorMessage(error, mode === "edit" ? "Could not update transaction" : "Could not create transaction"),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleModalOpenChange(false)} disabled={isSubmitting}>
        Cancel
      </Button>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={goToPreviousStep}
          disabled={isSubmitting || form.step === "details"}
          className="hidden md:inline-flex"
        >
          Back
        </Button>
        {form.step !== "review" ? (
          <Button type="button" onClick={goToNextStep} disabled={isSubmitting} className="hidden md:inline-flex">
            Next
          </Button>
        ) : null}
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className={cn(form.step !== "review" ? "md:hidden" : "", "md:w-fit w-full")}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving...
            </>
          ) : (
            getSubmitLabel(mode)
          )}
        </Button>
      </div>
    </>
  )

  return (
    <AppModal
      open={open}
      onOpenChange={handleModalOpenChange}
      title={
        <span className="inline-flex items-center gap-2 text-base font-semibold">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CircleDollarSign className="size-4" aria-hidden />
          </span>
          {getModalTitle(mode)}
        </span>
      }
      size="lg"
      contentClassName="max-h-[92vh] overflow-y-auto"
      footerClassName="sm:justify-between"
      footer={footer}
    >
      <div className="grid gap-4 py-1">
        {submitError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
            {submitError}
          </p>
        ) : null}

        <div className="md:hidden">
          <div className="grid gap-4">
            {detailSection}
            {moreDetailsSection}
          </div>
        </div>

        <div className="hidden md:block">
          <Tabs value={form.step} onValueChange={(value) => setForm((previous) => ({ ...previous, step: value as StepKey }))} orientation="vertical" className="gap-4">
            <TabsList className="h-fit flex-col items-start justify-start  bg-muted/30 p-1">
              <TabsTrigger value="details" className={getStepTriggerClassName("details")}>
                Details
              </TabsTrigger>

              <Separator className={getStepSeparatorClassName("details")} orientation="vertical" />

              <TabsTrigger value="more-details" className={getStepTriggerClassName("more-details")}>
                More details
              </TabsTrigger>

              <Separator className={getStepSeparatorClassName("more-details")} orientation="vertical" />

              <TabsTrigger value="review" className={getStepTriggerClassName("review")}>
                Review
              </TabsTrigger>
            </TabsList>

            <div className="flex-1">
              <TabsContent value="details">{detailSection}</TabsContent>
              <TabsContent value="more-details">{moreDetailsSection}</TabsContent>
              <TabsContent value="review">{reviewSection}</TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </AppModal>
  )
}
