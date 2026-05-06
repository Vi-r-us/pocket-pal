import { Loader2 } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { AppModal } from "@/components/modals/AppModal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconKeyPicker } from "@/components/category/IconKeyPicker"
import { ApiError, api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { AccountListItem, AccountType, ApiSuccess, UpsertAccountPayload } from "@/types/account"

export type AccountModalMode = "create" | "edit"
type StepKey = "details" | "financial" | "review"

type CreateAccountModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: AccountModalMode
  account: AccountListItem | null
  onSuccess: () => void
}

type FormState = {
  name: string
  type: AccountType
  currencyCode: string
  institutionName: string
  accountNumberLast4: string
  openingBalanceMajor: string
  notes: string
  includeInNetWorth: boolean
  displayOrder: string
  iconKey: string
  creditLimitMajor: string
  statementDay: string
  paymentDueDay: string
  isActive: boolean
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  type: "bank",
  currencyCode: "INR",
  institutionName: "",
  accountNumberLast4: "",
  openingBalanceMajor: "0.00",
  notes: "",
  includeInNetWorth: true,
  displayOrder: "0",
  iconKey: "",
  creditLimitMajor: "",
  statementDay: "",
  paymentDueDay: "",
  isActive: true,
}

const STEP_ORDER: StepKey[] = ["details", "financial", "review"]
const getStepIndex = (step: StepKey) => STEP_ORDER.indexOf(step)

const toFormState = (account: AccountListItem | null, mode: AccountModalMode): FormState => {
  if (!account || mode === "create") {
    return INITIAL_FORM_STATE
  }

  return {
    name: account.name ?? "",
    type: account.type,
    currencyCode: account.currency_code ?? "INR",
    institutionName: account.institution_name ?? "",
    accountNumberLast4: account.account_number_last4 ?? "",
    openingBalanceMajor: toMajorAmountString(account.opening_balance_minor),
    notes: account.notes ?? "",
    includeInNetWorth: account.include_in_net_worth ?? true,
    displayOrder: String(account.display_order ?? 0),
    iconKey: account.icon_key ?? "",
    creditLimitMajor: account.credit_limit_minor == null ? "" : toMajorAmountString(account.credit_limit_minor),
    statementDay: account.statement_day == null ? "" : String(account.statement_day),
    paymentDueDay: account.payment_due_day == null ? "" : String(account.payment_due_day),
    isActive: account.is_active ?? true,
  }
}

const toNullableInteger = (rawValue: string) => {
  const value = rawValue.trim()
  if (!value) return null
  if (!/^-?\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toMajorAmountString = (minor: number | string | null | undefined) => {
  const normalizedMinor = typeof minor === "number" ? minor : Number(minor)
  if (!Number.isFinite(normalizedMinor)) return "0.00"
  return (normalizedMinor / 100).toFixed(2)
}

const parseMajorAmountToMinor = (rawAmount: string) => {
  const normalized = rawAmount.trim().replace(/,/g, "")
  if (!normalized) return null
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

const toApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (!(error instanceof ApiError)) return fallbackMessage
  if (typeof error.data === "string" && error.data.trim()) return error.data

  if (error.data && typeof error.data === "object") {
    const message = (error.data as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message
  }

  return error.message || fallbackMessage
}

export const CreateAccountModal = ({ open, onOpenChange, mode, account, onSuccess }: CreateAccountModalProps) => {
  const [formState, setFormState] = useState<FormState>(() => toFormState(account, mode))
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<StepKey>("details")

  const title = mode === "create" ? "Create account" : "Edit account"
  const description = mode === "create" ? "Add a new account with metadata." : "Update account details and settings."
  const submitLabel = mode === "create" ? "Create account" : "Save changes"
  const currentStepIndex = getStepIndex(step)

  const canSubmit = useMemo(() => {
    if (!formState.name.trim()) return false
    if (!formState.currencyCode.trim()) return false
    return true
  }, [formState.currencyCode, formState.name])

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSubmitError("")
      setIsSubmitting(false)
      setStep("details")
    }
    onOpenChange(nextOpen)
  }

  const goToNextStep = () => {
    const nextStep = STEP_ORDER[Math.min(currentStepIndex + 1, STEP_ORDER.length - 1)]
    setStep(nextStep)
  }

  const goToPreviousStep = () => {
    const previousStep = STEP_ORDER[Math.max(currentStepIndex - 1, 0)]
    setStep(previousStep)
  }

  const getStepTriggerClassName = (targetStep: StepKey) => {
    const targetStepIndex = getStepIndex(targetStep)
    const isCurrentStep = targetStepIndex === currentStepIndex
    const isCompletedStep = targetStepIndex < currentStepIndex

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError("")

    const name = formState.name.trim()
    const currencyCode = formState.currencyCode.trim().toUpperCase()
    const accountNumberLast4 = formState.accountNumberLast4.trim()
    const institutionName = formState.institutionName.trim()
    const notes = formState.notes.trim()
    const iconKey = formState.iconKey.trim()
    const openingBalanceMinor = parseMajorAmountToMinor(formState.openingBalanceMajor)
    const displayOrder = toNullableInteger(formState.displayOrder)
    const creditLimitMinor = formState.creditLimitMajor.trim()
      ? parseMajorAmountToMinor(formState.creditLimitMajor)
      : null
    const statementDay = toNullableInteger(formState.statementDay)
    const paymentDueDay = toNullableInteger(formState.paymentDueDay)

    if (!name) {
      setSubmitError("Account name is required")
      return
    }
    if (currencyCode.length !== 3) {
      setSubmitError("Currency code must be exactly 3 characters")
      return
    }
    if (accountNumberLast4 && !/^\d{4}$/.test(accountNumberLast4)) {
      setSubmitError("Account number last4 must be exactly 4 digits")
      return
    }
    if (openingBalanceMinor === null) {
      setSubmitError("Opening balance must be a valid amount")
      return
    }
    if (displayOrder === null || displayOrder < 0) {
      setSubmitError("Display order must be a non-negative integer")
      return
    }
    if (creditLimitMinor !== null && creditLimitMinor < 0) {
      setSubmitError("Credit limit must be a valid amount")
      return
    }
    if (statementDay !== null && (statementDay < 1 || statementDay > 31)) {
      setSubmitError("Statement day must be between 1 and 31")
      return
    }
    if (paymentDueDay !== null && (paymentDueDay < 1 || paymentDueDay > 31)) {
      setSubmitError("Payment due day must be between 1 and 31")
      return
    }

    const payload: UpsertAccountPayload = {
      name,
      type: formState.type,
      currency_code: currencyCode,
      opening_balance_minor: openingBalanceMinor,
      include_in_net_worth: formState.includeInNetWorth,
      display_order: displayOrder,
      is_active: formState.isActive,
      ...(creditLimitMinor !== null ? { credit_limit_minor: creditLimitMinor } : {}),
      ...(statementDay !== null ? { statement_day: statementDay } : {}),
      ...(paymentDueDay !== null ? { payment_due_day: paymentDueDay } : {}),
      ...(mode === "edit"
        ? {
            institution_name: institutionName || "",
            account_number_last4: accountNumberLast4 || "",
            notes,
            icon_key: iconKey,
          }
        : {
            ...(institutionName ? { institution_name: institutionName } : {}),
            ...(accountNumberLast4 ? { account_number_last4: accountNumberLast4 } : {}),
            ...(notes ? { notes } : {}),
            ...(iconKey ? { icon_key: iconKey } : {}),
          }),
    }

    setIsSubmitting(true)
    try {
      if (mode === "create") {
        await api.post<ApiSuccess<AccountListItem>>("/accounts", payload)
      } else if (account) {
        await api.patch<ApiSuccess<AccountListItem>>(`/accounts/${account.account_id}`, payload)
      }
      handleModalOpenChange(false)
      onSuccess()
    } catch (error) {
      setSubmitError(toApiErrorMessage(error, "Could not save account"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const detailsSection = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="account-name">Account name</Label>
        <Input
          id="account-name"
          value={formState.name}
          onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
          placeholder="Savings Account"
          aria-label="Account name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="account-type">Account type</Label>
        <Select value={formState.type} onValueChange={(value) => setFormState((current) => ({ ...current, type: value as AccountType }))}>
          <SelectTrigger id="account-type" aria-label="Account type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Bank</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-currency">Currency code</Label>
        <Input
          id="account-currency"
          maxLength={3}
          value={formState.currencyCode}
          onChange={(event) => setFormState((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))}
          placeholder="INR"
          aria-label="Currency code"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="account-last4">Account number last</Label>
        <Input
          id="account-last4"
          maxLength={4}
          value={formState.accountNumberLast4}
          onChange={(event) =>
            setFormState((current) => ({ ...current, accountNumberLast4: event.target.value.replace(/[^\d]/g, "") }))
          }
          placeholder="4242"
          aria-label="Account number last 4 digits"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-institution">Institution name</Label>
        <Input
          id="account-institution"
          value={formState.institutionName}
          onChange={(event) => setFormState((current) => ({ ...current, institutionName: event.target.value }))}
          placeholder="Any Bank"
          aria-label="Institution name"
        />
      </div>
      <IconKeyPicker
        id="account-icon"
        label="Icon key"
        value={formState.iconKey || null}
        onChange={(next) => setFormState((current) => ({ ...current, iconKey: next ?? "" }))}
      />
    </div>
  )

  const financialSection = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="opening-balance">Opening balance</Label>
        <Input
          id="opening-balance"
          value={formState.openingBalanceMajor}
          onChange={(event) => setFormState((current) => ({ ...current, openingBalanceMajor: event.target.value }))}
          placeholder="0.00"
          aria-label="Opening balance"
        />
        <p className="text-xs text-muted-foreground">Use major units (for example `1250.75`). We store minor units automatically.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="display-order">Display order</Label>
        <Input
          id="display-order"
          value={formState.displayOrder}
          onChange={(event) => setFormState((current) => ({ ...current, displayOrder: event.target.value }))}
          placeholder="0"
          aria-label="Display order"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="credit-limit">Credit limit</Label>
        <Input
          id="credit-limit"
          value={formState.creditLimitMajor}
          onChange={(event) => setFormState((current) => ({ ...current, creditLimitMajor: event.target.value }))}
          placeholder="Optional (e.g. 50000.00)"
          aria-label="Credit limit"
        />
        <p className="text-xs text-muted-foreground">Optional. Enter amount in major units.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="statement-day">Statement day</Label>
        <Input
          id="statement-day"
          value={formState.statementDay}
          onChange={(event) => setFormState((current) => ({ ...current, statementDay: event.target.value }))}
          placeholder="1-31"
          aria-label="Statement day"
        />
        <p className="text-xs text-muted-foreground">Billing cycle close day (1-31).</p>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="payment-day">Payment due day</Label>
        <Input
          id="payment-day"
          value={formState.paymentDueDay}
          onChange={(event) => setFormState((current) => ({ ...current, paymentDueDay: event.target.value }))}
          placeholder="1-31"
          aria-label="Payment due day"
        />
        <p className="text-xs text-muted-foreground">Credit card payment due day (1-31).</p>
      </div>
    </div>
  )

  const reviewSection = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account-notes">Notes</Label>
        <textarea
          id="account-notes"
          value={formState.notes}
          onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Optional notes"
          className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Account notes"
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label htmlFor="include-net-worth" className="inline-flex items-center gap-2 text-sm">
          <Checkbox
            id="include-net-worth"
            checked={formState.includeInNetWorth}
            onCheckedChange={(value) => setFormState((current) => ({ ...current, includeInNetWorth: value === true }))}
          />
          Include in net worth
        </label>
        <label htmlFor="is-active" className="inline-flex items-center gap-2 text-sm">
          <Checkbox
            id="is-active"
            checked={formState.isActive}
            onCheckedChange={(value) => setFormState((current) => ({ ...current, isActive: value === true }))}
          />
          Account is active
        </label>
      </div>
    </div>
  )

  return (
    <AppModal
      open={open}
      onOpenChange={handleModalOpenChange}
      title={title}
      description={description}
      size="lg"
      contentClassName="max-h-[92vh] overflow-y-auto md:max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="md:hidden space-y-4">
          {detailsSection}
          {financialSection}
          {reviewSection}
        </div>

        <div className="hidden md:block">
          <Tabs value={step} onValueChange={(value) => setStep(value as StepKey)} orientation="vertical" className="gap-4">
            <TabsList className="h-fit flex-col items-start justify-start bg-muted/30 p-1">
              <TabsTrigger value="details" className={getStepTriggerClassName("details")}>
                Details
              </TabsTrigger>
              <Separator className={getStepSeparatorClassName("details")} orientation="vertical" />
              <TabsTrigger value="financial" className={getStepTriggerClassName("financial")}>
                Financial
              </TabsTrigger>
              <Separator className={getStepSeparatorClassName("financial")} orientation="vertical" />
              <TabsTrigger value="review" className={getStepTriggerClassName("review")}>
                Review
              </TabsTrigger>
            </TabsList>

            <div className="flex-1">
              <TabsContent value="details">{detailsSection}</TabsContent>
              <TabsContent value="financial">{financialSection}</TabsContent>
              <TabsContent value="review">{reviewSection}</TabsContent>
            </div>
          </Tabs>
        </div>

        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => handleModalOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={isSubmitting || step === "details"} className="hidden md:inline-flex">
              Back
            </Button>
            {step !== "review" ? (
              <Button type="button" onClick={goToNextStep} disabled={isSubmitting} className="hidden md:inline-flex">
                Next
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting || !canSubmit} className={cn(step !== "review" ? "md:hidden" : "", "w-full md:w-fit")}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </AppModal>
  )
}
