import { createElement, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AppModal } from "@/components/modals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { resolveCategoryIcon } from "@/lib/categoryIcons";
import { getInlineErrorMessage } from "@/lib/errors/normalize";
import type { ApiEnvelope } from "@/types/api";

type BudgetCategoryOption = {
  category_id: number;
  name: string;
  type: "expense" | "income" | "savings";
  icon_key?: string | null;
  group?: {
    group_id: number;
    name: string;
    icon_key?: string | null;
  } | null;
  is_active?: boolean;
};

type BudgetFormRow = {
  rowId: string;
  categoryId: string;
  amountMajor: string;
};

type BudgetPrefillRow = {
  category_id: number;
  amount_minor: number;
};

type CreateBudgetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialYyyyMm: number;
  mode?: "create" | "edit";
  initialRows?: BudgetPrefillRow[];
  onSuccess: (yyyyMm: number) => void;
};

const createEmptyRow = (seed: number): BudgetFormRow => ({
  rowId: `row-${Date.now()}-${seed}`,
  categoryId: "",
  amountMajor: "",
});

const toMajorAmountString = (minor: number) => {
  if (!Number.isFinite(minor)) return "0.00";
  return (minor / 100).toFixed(2);
};

const toFormRows = (initialRows?: BudgetPrefillRow[]) => {
  if (!initialRows || initialRows.length === 0) {
    return [createEmptyRow(0)];
  }

  return initialRows.map((row, index) => ({
    rowId: `row-${Date.now()}-${index}`,
    categoryId: String(row.category_id),
    amountMajor: toMajorAmountString(row.amount_minor),
  }));
};

const toMonthInputValue = (yyyyMm: number) => {
  const text = String(yyyyMm);
  if (!/^\d{6}$/.test(text)) return "";
  return `${text.slice(0, 4)}-${text.slice(4, 6)}`;
};

const toYyyyMm = (monthInput: string) => {
  if (!/^\d{4}-\d{2}$/.test(monthInput)) return null;
  const normalized = monthInput.replace("-", "");
  return /^\d{6}$/.test(normalized) ? Number(normalized) : null;
};

const parseMajorAmountToMinor = (rawAmount: string) => {
  const normalized = rawAmount.trim().replace(/,/g, "");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
};

export const CreateBudgetModal = ({
  open,
  onOpenChange,
  initialYyyyMm,
  mode = "create",
  initialRows,
  onSuccess,
}: CreateBudgetModalProps) => {
  const [monthInput, setMonthInput] = useState(
    toMonthInputValue(initialYyyyMm),
  );
  const [rows, setRows] = useState<BudgetFormRow[]>(() =>
    toFormRows(initialRows),
  );
  const [categoryOptions, setCategoryOptions] = useState<
    BudgetCategoryOption[]
  >([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;

    let isCurrent = true;
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response =
          await api.get<ApiEnvelope<BudgetCategoryOption[]>>("/categories");
        if (!isCurrent) return;
        const nextOptions = [...response.data]
          .filter((item) => item.is_active ?? true)
          .sort((a, b) => a.name.localeCompare(b.name));
        setCategoryOptions(nextOptions);
      } catch (error) {
        if (!isCurrent) return;
        setSubmitError(
          getInlineErrorMessage(
            error,
            "Could not load categories for budget setup",
          ),
        );
      } finally {
        if (isCurrent) setIsLoadingCategories(false);
      }
    };

    fetchCategories();

    return () => {
      isCurrent = false;
    };
  }, [open]);

  const canSubmit = useMemo(
    () => rows.some((row) => row.categoryId && row.amountMajor.trim()),
    [rows],
  );

  const groupedCategories = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; label: string; items: BudgetCategoryOption[] }
    >();

    for (const category of categoryOptions) {
      const groupName = category.group?.name?.trim() || "Other categories";
      const groupId = category.group?.group_id
        ? String(category.group.group_id)
        : "none";
      const key = `${groupId}:${groupName}`;

      if (!groups.has(key)) {
        groups.set(key, { key, label: groupName, items: [] });
      }
      groups.get(key)?.items.push(category);
    }

    return Array.from(groups.values());
  }, [categoryOptions]);

  const handleRowChange = (
    rowId: string,
    key: keyof Omit<BudgetFormRow, "rowId">,
    value: string,
  ) => {
    setRows((previous) =>
      previous.map((row) =>
        row.rowId === rowId ? { ...row, [key]: value } : row,
      ),
    );
  };

  const handleAddRow = () => {
    setRows((previous) => [...previous, createEmptyRow(previous.length)]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((previous) => {
      if (previous.length === 1) return previous;
      return previous.filter((row) => row.rowId !== rowId);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");

    const yyyyMm = toYyyyMm(monthInput);
    if (!yyyyMm) {
      setSubmitError("Select a valid month");
      return;
    }

    const categoryBudgets: Array<{
      category_id: number;
      amount_minor: number;
    }> = [];
    const selectedCategoryIds = new Set<number>();

    for (const row of rows) {
      if (!row.categoryId && !row.amountMajor.trim()) continue;
      if (!row.categoryId) {
        setSubmitError("Select category for all entered budget rows");
        return;
      }

      const categoryId = Number(row.categoryId);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        setSubmitError("Selected category is invalid");
        return;
      }
      if (selectedCategoryIds.has(categoryId)) {
        setSubmitError("Each category can be added only once");
        return;
      }
      selectedCategoryIds.add(categoryId);

      const amountMinor = parseMajorAmountToMinor(row.amountMajor);
      if (amountMinor === null) {
        setSubmitError("Budget amount must be a valid number");
        return;
      }

      categoryBudgets.push({
        category_id: categoryId,
        amount_minor: amountMinor,
      });
    }

    if (categoryBudgets.length === 0) {
      setSubmitError("Add at least one category budget row");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put<ApiEnvelope<unknown>>(`/budgets/month/${yyyyMm}`, {
        categoryBudgets,
      });
      onSuccess(yyyyMm);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(getInlineErrorMessage(error, "Could not save budget"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === "edit" ? "Edit budget" : "Create budget";
  const description =
    mode === "edit"
      ? "Update monthly budget amounts for selected categories"
      : "Add monthly budgets for one or more categories";
  const submitLabel = mode === "edit" ? "Save changes" : "Save budget";

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-budget-form"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </>
      }
    >
      <form
        id="create-budget-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="budget-month">Month</Label>
          <Input
            id="budget-month"
            type="month"
            value={monthInput}
            onChange={(event) => setMonthInput(event.target.value)}
            aria-label="Budget month"
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Category budgets</p>
            <Button
              className="text-primary border-primary rounded-md"
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
            >
              <Plus className="size-4" aria-hidden />
              Add row
            </Button>
          </div>

          {rows.map((row, index) => (
            <div
              key={row.rowId}
              className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-[1fr_180px_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`budget-category-${row.rowId}`}>Category</Label>
                <Select
                  value={row.categoryId}
                  onValueChange={(value) =>
                    handleRowChange(row.rowId, "categoryId", value)
                  }
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger
                    id={`budget-category-${row.rowId}`}
                    aria-label={`Category for budget row ${index + 1}`}
                  >
                    <SelectValue
                      placeholder={
                        isLoadingCategories
                          ? "Loading categories..."
                          : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedCategories.map((group) => (
                      <SelectGroup key={group.key} className="flex flex-col">
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.items.map((option) => {
                          const Icon = resolveCategoryIcon(
                            option.icon_key,
                            option.group?.icon_key,
                          );
                          return (
                            <SelectItem
                              key={option.category_id}
                              value={String(option.category_id)}
                            >
                              <span className="flex items-center gap-3">
                                {createElement(Icon, {
                                  className: "size-4 text-muted-foreground",
                                  "aria-hidden": true,
                                })}
                                <span className="text-wrap text-ellipsis">
                                  {option.name}
                                </span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`budget-amount-${row.rowId}`}>Amount</Label>
                <Input
                  id={`budget-amount-${row.rowId}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={row.amountMajor}
                  onChange={(event) =>
                    handleRowChange(
                      row.rowId,
                      "amountMajor",
                      event.target.value,
                    )
                  }
                  aria-label={`Amount for budget row ${index + 1}`}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveRow(row.rowId)}
                  disabled={rows.length === 1}
                  aria-label={`Remove budget row ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
      </form>
    </AppModal>
  );
};
