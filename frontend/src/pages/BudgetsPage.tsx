import { type ColumnDef } from "@tanstack/react-table";
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  Copy,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Receipt,
  RotateCcw,
  TrendingUp,
  Trash2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CategoryBreakdownChartCard,
  MultiBarChartCard,
  type CategoryBreakdownDatum,
} from "@/components/charts";
import { MonthPickerField } from "@/components/MonthPickerField";
import {
  CloneBudgetCategoryModal,
  CloneBudgetPeriodModal,
  CreateBudgetModal,
} from "@/features/budgets/components";
import {
  buildPeriodClonePayload,
  fetchBudgetMonthCategoryIds,
  mapSummaryToCloneRows,
  putCategoryBudgets,
} from "@/features/budgets/budgetClone";
import type { BudgetCloneRow, CloneConflictStrategy } from "@/features/budgets/types";
import { MetricStatCard } from "@/components/cards/MetricStatCard";
import {
  DataTableBase,
  DataTablePagination,
} from "@/components/data-table";
import { GridItem } from "@/components/layout/GridItem";
import { usePageHeaderControls } from "@/contexts/PageHeaderControlsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  APP_HEADER_PRIMARY_ACTION_EVENT,
  type AppHeaderPrimaryActionDetail,
} from "@/constants/headerActions";
import { api } from "@/lib/api";
import { getInlineErrorMessage } from "@/lib/errors/normalize";
import {
  formatYyyyMmLabel,
  getCurrentYyyyMm,
  inputValueToYyyyMm,
  yyyyMmToInputValue,
} from "@/lib/month";
import { cn } from "@/lib/utils";
import type { ApiEnvelope } from "@/types/api";

type BudgetSummaryData = {
  summaries: Array<{
    budget_id: number;
    category_id: number;
    category: {
      category_id: number;
      name: string;
      type: string;
    } | null;
    category_type?: string | null;
    amount_minor: number | string;
    spent_minor: number | string;
    remaining_minor: number | string;
  }>;
  totals: {
    budget_minor: number | string;
    spent_minor: number | string;
    savings_minor: number | string;
    remaining_minor: number | string;
    currency_code: string | null;
  };
  yyyy_mm: number;
};

type BudgetVsActualDataPoint = {
  category: string;
  budget_minor: number;
  actual_minor: number;
};

type BudgetCategoryType = "expense" | "income" | "savings";
type BudgetCategoryFilterType = BudgetCategoryType | "all";

type BudgetCategoryTableRow = {
  category_id: number;
  category_name: string;
  category_type: BudgetCategoryType;
  budget_minor: number;
  spent_minor: number;
  remaining_minor: number;
  progress_percent: number;
  progress_percent_for_bar: number;
};

const BUDGET_CATEGORY_TYPES: BudgetCategoryType[] = [
  "expense",
  "income",
  "savings",
];

const BUDGET_TYPE_PALETTES: Record<BudgetCategoryType, string[]> = {
  expense: [
    "#7F1D1D",
    "#991B1B",
    "#B91C1C",
    "#DC2626",
    "#EF4444",
    "#FCA5A5",
  ],
  income: [
    "#14532D",
    "#166534",
    "#15803D",
    "#16A34A",
    "#22C55E",
    "#86EFAC",
  ],
  savings: [
    "#312E81",
    "#3730A3",
    "#4338CA",
    "#4F46E5",
    "#6366F1",
    "#A5B4FC",
  ],
};

const BUDGET_BAR_SERIES_COLORS: Record<
  BudgetCategoryType,
  { budget: string; actual: string }
> = {
  expense: {
    budget: "#7F1D1D",
    actual: "#F87171",
  },
  income: {
    budget: "#14532D",
    actual: "#4ADE80",
  },
  savings: {
    budget: "#312E81",
    actual: "#818CF8",
  },
};

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();
const compactAxisFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const getCurrencyFormatter = (currency: string) => {
  const normalizedCurrency = currency?.trim().toUpperCase() || "USD";
  const cached = currencyFormatterCache.get(normalizedCurrency);
  if (cached) return cached;

  try {
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    });
    currencyFormatterCache.set(normalizedCurrency, formatter);
    return formatter;
  } catch {
    const fallback = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
    currencyFormatterCache.set(normalizedCurrency, fallback);
    return fallback;
  }
};

const toMinorNumber = (value: number | string) => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toCurrency = (minor: number | string, currency: string) => {
  return getCurrencyFormatter(currency).format(toMinorNumber(minor) / 100);
};

const normalizeCategoryType = (value: string | null | undefined): BudgetCategoryType => {
  if (value === "income" || value === "savings") {
    return value;
  }
  return "expense";
};

const BudgetMetricsLoading = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <GridItem key={index} span={12} mdSpan={6} lgSpan={3} fill>
          <MetricStatCard
            title={<Skeleton className="h-4 w-24" />}
            value={<Skeleton className="h-8 w-32" />}
            footer={<Skeleton className="h-3 w-28" />}
          />
        </GridItem>
      ))}
    </>
  );
};

export const BudgetsPage = () => {
  const [selectedYyyyMm, setSelectedYyyyMm] = useState(getCurrentYyyyMm);
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<BudgetSummaryData | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState("");
  const [isCreateBudgetModalOpen, setIsCreateBudgetModalOpen] = useState(false);
  const [budgetModalMode, setBudgetModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [budgetModalKey, setBudgetModalKey] = useState(0);
  const [budgetModalInitialRows, setBudgetModalInitialRows] = useState<
    Array<{ category_id: number; amount_minor: number }>
  >([]);
  const [selectedBreakdownType, setSelectedBreakdownType] =
    useState<BudgetCategoryType>("expense");
  const [selectedBarType, setSelectedBarType] =
    useState<BudgetCategoryType>("expense");
  const [categoryTypeFilter, setCategoryTypeFilter] =
    useState<BudgetCategoryFilterType>("all");
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(10);
  const [isMobileTableView, setIsMobileTableView] = useState(false);
  const [isTabletTableView, setIsTabletTableView] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [budgetRowPendingDelete, setBudgetRowPendingDelete] =
    useState<BudgetCategoryTableRow | null>(null);
  const [isDeletingBudget, setIsDeletingBudget] = useState(false);
  const [isCategoryCloneModalOpen, setIsCategoryCloneModalOpen] =
    useState(false);
  const [isPeriodCloneModalOpen, setIsPeriodCloneModalOpen] = useState(false);
  const [categoryCloneRow, setCategoryCloneRow] =
    useState<BudgetCloneRow | null>(null);

  useEffect(() => {
    let isCurrent = true;

    const fetchBudgetSummary = async () => {
      setIsMetricsLoading(true);
      setMetricsError("");

      try {
        const response = await api.get<ApiEnvelope<BudgetSummaryData>>(
          `/budgets/month/${selectedYyyyMm}/summary`,
        );
        // console.log("response", response)
        if (!isCurrent) return;
        setSummary(response.data);
      } catch (error) {
        if (!isCurrent) return;
        setSummary(null);
        setMetricsError(
          getInlineErrorMessage(error, "Could not load budget metrics"),
        );
      } finally {
        if (isCurrent) setIsMetricsLoading(false);
      }
    };

    fetchBudgetSummary();

    return () => {
      isCurrent = false;
    };
  }, [refreshKey, selectedYyyyMm]);

  useEffect(() => {
    const handleHeaderPrimaryAction = (event: Event) => {
      const customEvent = event as CustomEvent<AppHeaderPrimaryActionDetail>;
      if (customEvent.detail?.actionKey !== "create-budget") {
        return;
      }
      setBudgetModalMode("create");
      setBudgetModalInitialRows([]);
      setBudgetModalKey((value) => value + 1);
      setIsCreateBudgetModalOpen(true);
    };

    window.addEventListener(
      APP_HEADER_PRIMARY_ACTION_EVENT,
      handleHeaderPrimaryAction,
    );
    return () => {
      window.removeEventListener(
        APP_HEADER_PRIMARY_ACTION_EVENT,
        handleHeaderPrimaryAction,
      );
    };
  }, []);

  const monthLabel = useMemo(
    () => formatYyyyMmLabel(selectedYyyyMm),
    [selectedYyyyMm],
  );

  const sourceMonthValue = useMemo(
    () => yyyyMmToInputValue(selectedYyyyMm),
    [selectedYyyyMm],
  );

  const sourceCloneRows = useMemo(
    () => mapSummaryToCloneRows(summary?.summaries ?? []),
    [summary?.summaries],
  );

  const budgetsHeaderControls = useMemo(
    () => ({
      toolbar: (
        <MonthPickerField
          id="budgets-month-picker"
          className="w-full min-w-0 sm:w-[200px]"
          value={sourceMonthValue}
          onChange={(next) => {
            const parsed = inputValueToYyyyMm(next);
            if (parsed === null) return;
            setSelectedYyyyMm(parsed);
            setTablePage(1);
          }}
          aria-label="Select budget month"
        />
      ),
      overflowActions: [
        {
          id: "copy-month",
          label: "Copy month",
          icon: Copy,
          onSelect: () => setIsPeriodCloneModalOpen(true),
        },
      ],
    }),
    [sourceMonthValue],
  );

  usePageHeaderControls(budgetsHeaderControls);

  useEffect(() => {
    const updateResponsiveTableView = () => {
      const viewportWidth = window.innerWidth;
      setIsMobileTableView(viewportWidth < 768);
      setIsTabletTableView(viewportWidth >= 768 && viewportWidth < 1024);
    };
    updateResponsiveTableView();
    window.addEventListener("resize", updateResponsiveTableView);
    return () => {
      window.removeEventListener("resize", updateResponsiveTableView);
    };
  }, []);

  const currencyCode =
    summary?.totals.currency_code?.trim().toUpperCase() || null;
  const totalBudgetMinor = toMinorNumber(summary?.totals.budget_minor ?? 0);
  const totalSpentMinor = toMinorNumber(summary?.totals.spent_minor ?? 0);
  const savingsMinor = toMinorNumber(summary?.totals.savings_minor ?? 0);
  const remainingMinor = toMinorNumber(summary?.totals.remaining_minor ?? 0);

  const totalBudgetValue = currencyCode
    ? toCurrency(totalBudgetMinor, currencyCode)
    : "—";
  const totalSpentValue = currencyCode
    ? toCurrency(totalSpentMinor, currencyCode)
    : "—";
  const savingsValue = currencyCode
    ? toCurrency(savingsMinor, currencyCode)
    : "—";
  const remainingValue = currencyCode
    ? toCurrency(remainingMinor, currencyCode)
    : "—";

  const noCurrencyBadge = !currencyCode ? (
    <Badge variant="outline" className="rounded-full text-xs">
      N/A
    </Badge>
  ) : undefined;

  const isEmptyMetrics =
    !isMetricsLoading &&
    !metricsError &&
    (summary?.summaries.length ?? 0) === 0;

  const budgetSummariesWithType = useMemo(
    () =>
      (summary?.summaries ?? []).map((item) => ({
        ...item,
        normalized_type: normalizeCategoryType(
          item.category_type ?? item.category?.type,
        ),
      })),
    [summary?.summaries],
  );

  const breakdownCountsByType = useMemo(
    () =>
      BUDGET_CATEGORY_TYPES.reduce(
        (acc, type) => {
          const count = budgetSummariesWithType.filter(
            (item) =>
              item.normalized_type === type &&
              Math.max(0, toMinorNumber(item.amount_minor)) > 0,
          ).length;
          acc[type] = count;
          return acc;
        },
        { expense: 0, income: 0, savings: 0 } as Record<BudgetCategoryType, number>,
      ),
    [budgetSummariesWithType],
  );

  const availableBreakdownTypes = useMemo(
    () =>
      BUDGET_CATEGORY_TYPES.filter((type) => breakdownCountsByType[type] > 0),
    [breakdownCountsByType],
  );

  const effectiveBreakdownType =
    availableBreakdownTypes.includes(selectedBreakdownType)
      ? selectedBreakdownType
      : availableBreakdownTypes[0] ?? selectedBreakdownType;

  const activeBudgetTypeSummaries = useMemo(
    () =>
      budgetSummariesWithType
        .filter(
          (item) =>
            item.normalized_type === effectiveBreakdownType &&
            Math.max(0, toMinorNumber(item.amount_minor)) > 0,
        )
        .sort(
          (left, right) =>
            Math.max(0, toMinorNumber(right.amount_minor)) -
            Math.max(0, toMinorNumber(left.amount_minor)),
        ),
    [budgetSummariesWithType, effectiveBreakdownType],
  );

  const budgetBreakdownPalette = BUDGET_TYPE_PALETTES[effectiveBreakdownType];
  const budgetBreakdownData = useMemo(() => {
    const topFive = activeBudgetTypeSummaries.slice(0, 5);
    const othersTotal = activeBudgetTypeSummaries
      .slice(5)
      .reduce((sum, item) => sum + Math.max(0, toMinorNumber(item.amount_minor)), 0);

    const chartRows: CategoryBreakdownDatum[] = topFive.map((item, index) => ({
      key: `${effectiveBreakdownType}-${item.category_id}`,
      label: item.category?.name?.trim() || "Uncategorized",
      value: Math.max(0, toMinorNumber(item.amount_minor)),
      colorVar: budgetBreakdownPalette[index],
    }));

    if (othersTotal > 0) {
      chartRows.push({
        key: `${effectiveBreakdownType}-others`,
        label: "Others",
        value: othersTotal,
        colorVar: budgetBreakdownPalette[5],
      });
    }

    return chartRows;
  }, [
    activeBudgetTypeSummaries,
    budgetBreakdownPalette,
    effectiveBreakdownType,
  ]);

  const breakdownTypeLabel =
    effectiveBreakdownType.charAt(0).toUpperCase() +
    effectiveBreakdownType.slice(1);
  const hasBudgetBreakdownRows = budgetBreakdownData.length > 0;
  const breakdownFooterNote = hasBudgetBreakdownRows
    ? `Top 5 ${effectiveBreakdownType} budgets by allocation in ${monthLabel}`
    : `No ${effectiveBreakdownType} budgets available for ${monthLabel}`;
  const handleBreakdownTypeChange = (value: string) => {
    if (
      value !== "expense" &&
      value !== "income" &&
      value !== "savings"
    ) {
      return;
    }
    setSelectedBreakdownType(value);
  };

  const effectiveBarType = availableBreakdownTypes.includes(selectedBarType)
    ? selectedBarType
    : availableBreakdownTypes[0] ?? selectedBarType;

  const handleBarTypeChange = (value: string) => {
    if (
      value !== "expense" &&
      value !== "income" &&
      value !== "savings"
    ) {
      return;
    }
    setSelectedBarType(value);
  };

  const budgetVsActualData: Array<BudgetVsActualDataPoint & { ranking_minor: number }> =
    budgetSummariesWithType
      .filter(
        (item) =>
          item.normalized_type === effectiveBarType &&
          Math.max(0, toMinorNumber(item.amount_minor)) > 0,
      )
      .map((item) => ({
      category: item.category?.name?.trim() || "Uncategorized",
      budget_minor: Math.max(0, toMinorNumber(item.amount_minor)),
      actual_minor: Math.max(0, toMinorNumber(item.spent_minor)),
      ranking_minor: Math.max(0, toMinorNumber(item.amount_minor)),
    }))
    .filter((item) => item.budget_minor > 0 || item.actual_minor > 0);
  const chartBarLimit = isMobileTableView ? 5 : isTabletTableView ? 8 : 12;
  const sortedBudgetVsActualData = [...budgetVsActualData]
    .sort(
      (left, right) =>
        right.ranking_minor - left.ranking_minor,
    );
  const topBudgetVsActualData = sortedBudgetVsActualData.slice(0, chartBarLimit);
  const otherBudgetVsActualData = sortedBudgetVsActualData.slice(chartBarLimit);
  const othersBarRow =
    otherBudgetVsActualData.length > 0
      ? {
          category: "Others",
          budget_minor: otherBudgetVsActualData.reduce(
            (sum, item) => sum + item.budget_minor,
            0,
          ),
          actual_minor: otherBudgetVsActualData.reduce(
            (sum, item) => sum + item.actual_minor,
            0,
          ),
        }
      : null;
  const limitedBudgetVsActualData: BudgetVsActualDataPoint[] = [
    ...topBudgetVsActualData.map(({ category, budget_minor, actual_minor }) => ({
      category,
      budget_minor,
      actual_minor,
    })),
    ...(othersBarRow ? [othersBarRow] : []),
  ];
  const isBudgetVsActualTruncated =
    otherBudgetVsActualData.length > 0;
  const barTypeLabel =
    effectiveBarType.charAt(0).toUpperCase() +
    effectiveBarType.slice(1);
  const barSeriesColors = BUDGET_BAR_SERIES_COLORS[effectiveBarType];
  const categoryTableRows: BudgetCategoryTableRow[] = (summary?.summaries ?? [])
    .map((item) => {
      const budgetMinor = Math.max(0, toMinorNumber(item.amount_minor));
      const spentMinor = Math.max(0, toMinorNumber(item.spent_minor));
      const remainingMinor = toMinorNumber(item.remaining_minor);
      const progressPercent =
        budgetMinor > 0
          ? (spentMinor / budgetMinor) * 100
          : spentMinor > 0
            ? 100
            : 0;
      const categoryTypeRaw = item.category?.type?.toLowerCase();
      const categoryType = normalizeCategoryType(
        item.category_type ?? categoryTypeRaw,
      );

      return {
        category_id: item.category_id,
        category_name: item.category?.name?.trim() || "Uncategorized",
        category_type: categoryType,
        budget_minor: budgetMinor,
        spent_minor: spentMinor,
        remaining_minor: remainingMinor,
        progress_percent: progressPercent,
        progress_percent_for_bar: Math.min(100, Math.max(0, progressPercent)),
      };
    })
    .filter((item) => item.budget_minor > 0 || item.spent_minor > 0);

  const filteredCategoryTableRows =
    categoryTypeFilter === "all"
      ? categoryTableRows
      : categoryTableRows.filter(
          (row) => row.category_type === categoryTypeFilter,
        );
  const totalFilteredRows = filteredCategoryTableRows.length;
  const tableTotalPages =
    totalFilteredRows === 0 ? 1 : Math.ceil(totalFilteredRows / tableLimit);
  const safeTablePage = Math.min(Math.max(tablePage, 1), tableTotalPages);
  const paginatedCategoryTableRows = filteredCategoryTableRows.slice(
    (safeTablePage - 1) * tableLimit,
    (safeTablePage - 1) * tableLimit + tableLimit,
  );

  const formatChartAmount = (value: string | number) =>
    currencyCode ? toCurrency(value, currencyCode) : "—";
  const formatCloneAmount = (minor: number) =>
    currencyCode ? toCurrency(minor, currencyCode) : "—";
  const formatCompactAxisAmount = (value: string | number) =>
    compactAxisFormatter.format(toMinorNumber(value) / 100);
  const formatProgressLabel = (progressPercent: number) =>
    `${progressPercent.toFixed(1)}%`;

  const handleCategoryTypeFilterChange = (value: string) => {
    if (
      value !== "all" &&
      value !== "expense" &&
      value !== "income" &&
      value !== "savings"
    )
      return;
    setCategoryTypeFilter(value);
    setTablePage(1);
  };

  const handleCategoryTablePageChange = (nextPage: number) => {
    setTablePage(Math.min(Math.max(nextPage, 1), tableTotalPages));
  };

  const handleCategoryTableLimitChange = (nextLimit: number) => {
    setTableLimit(nextLimit);
    setTablePage(1);
  };

  const handleCategoryAction = useCallback(
    (action: "edit" | "reset" | "delete" | "clone", row: BudgetCategoryTableRow) => {
      if (action === "edit") {
        setBudgetModalMode("edit");
        setBudgetModalInitialRows([
          {
            category_id: row.category_id,
            amount_minor: row.budget_minor,
          },
        ]);
        setBudgetModalKey((value) => value + 1);
        setIsCreateBudgetModalOpen(true);
        return;
      }
      if (action === "clone") {
        setCategoryCloneRow({
          category_id: row.category_id,
          category_name: row.category_name,
          category_type: row.category_type,
          amount_minor: row.budget_minor,
        });
        setIsCategoryCloneModalOpen(true);
        return;
      }
      if (action === "delete") {
        setBudgetRowPendingDelete(row);
        setIsDeleteDialogOpen(true);
        return;
      }

      console.info("[Budget Category Table Action]", {
        action,
        category_id: row.category_id,
        category_name: row.category_name,
      });
    },
    [],
  );

  const handleBudgetModalSuccess = (nextYyyyMm: number) => {
    setSelectedYyyyMm(nextYyyyMm);
    setRefreshKey((value) => value + 1);
  };

  const handleCloneCategoryBudget = async (targetMonthValue: string) => {
    if (!categoryCloneRow) return;

    const targetYyyyMm = inputValueToYyyyMm(targetMonthValue);
    if (targetYyyyMm === null) return;

    await putCategoryBudgets(targetYyyyMm, [
      {
        category_id: categoryCloneRow.category_id,
        amount_minor: categoryCloneRow.amount_minor,
      },
    ]);
    setCategoryCloneRow(null);
    handleBudgetModalSuccess(targetYyyyMm);
  };

  const handleClonePeriodBudgets = async (
    targetMonthValue: string,
    strategy: CloneConflictStrategy,
  ) => {
    const targetYyyyMm = inputValueToYyyyMm(targetMonthValue);
    if (targetYyyyMm === null) return;

    const existingTargetCategoryIds =
      await fetchBudgetMonthCategoryIds(targetYyyyMm);
    const categoryBudgets = buildPeriodClonePayload(
      sourceCloneRows,
      existingTargetCategoryIds,
      strategy,
    );

    if (categoryBudgets.length === 0) return;

    await putCategoryBudgets(targetYyyyMm, categoryBudgets);
    handleBudgetModalSuccess(targetYyyyMm);
  };

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
          <DropdownMenuItem onSelect={() => handleCategoryAction("edit", row)}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleCategoryAction("clone", row)}>
            <Copy className="size-4" aria-hidden />
            Clone
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleCategoryAction("reset", row)}>
            <RotateCcw className="size-4" aria-hidden />
            Reset
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => handleCategoryAction("delete", row)}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete budget
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [handleCategoryAction],
  );

  const handleDeleteBudget = async () => {
    if (!budgetRowPendingDelete || isDeletingBudget) return;

    setIsDeletingBudget(true);
    try {
      await api.delete<ApiEnvelope<unknown>>(
        `/budgets/month/${selectedYyyyMm}/category/${budgetRowPendingDelete.category_id}`,
      );
      setIsDeleteDialogOpen(false);
      setBudgetRowPendingDelete(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMetricsError(
        getInlineErrorMessage(error, "Could not delete budget category"),
      );
    } finally {
      setIsDeletingBudget(false);
    }
  };

  const categoryTableColumns = useMemo<
    ColumnDef<BudgetCategoryTableRow>[]
  >(() => {
    const categoryColumn: ColumnDef<BudgetCategoryTableRow> = {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }) => {
        const Icon =
          row.original.category_type === "income"
            ? TrendingUp
            : row.original.category_type === "savings"
              ? PiggyBank
              : Receipt;
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {row.original.category_name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {row.original.category_type}
              </p>
            </div>
          </div>
        );
      },
    };

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
    };

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
    };

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
    };

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
    };

    const actionColumn: ColumnDef<BudgetCategoryTableRow> = {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          {renderCategoryRowActions(row.original)}
        </div>
      ),
    };

    if (isTabletTableView) {
      return [categoryColumn, spentColumn, progressColumn];
    }

    return [
      categoryColumn,
      budgetColumn,
      spentColumn,
      remainingColumn,
      progressColumn,
      actionColumn,
    ];
  }, [currencyCode, isTabletTableView, renderCategoryRowActions]);

  if (isMetricsLoading) {
    return <BudgetMetricsLoading />;
  }

  return (
    <>
      <CreateBudgetModal
        key={budgetModalKey}
        open={isCreateBudgetModalOpen}
        onOpenChange={setIsCreateBudgetModalOpen}
        initialYyyyMm={selectedYyyyMm}
        mode={budgetModalMode}
        initialRows={budgetModalInitialRows}
        onSuccess={handleBudgetModalSuccess}
      />
      <CloneBudgetCategoryModal
        open={isCategoryCloneModalOpen}
        onOpenChange={(open) => {
          setIsCategoryCloneModalOpen(open);
          if (!open) setCategoryCloneRow(null);
        }}
        row={categoryCloneRow}
        sourceMonthValue={sourceMonthValue}
        sourceMonthLabel={monthLabel}
        formatAmount={formatCloneAmount}
        onClone={handleCloneCategoryBudget}
      />
      <CloneBudgetPeriodModal
        open={isPeriodCloneModalOpen}
        onOpenChange={setIsPeriodCloneModalOpen}
        sourceMonthValue={sourceMonthValue}
        sourceMonthLabel={monthLabel}
        sourceRows={sourceCloneRows}
        formatAmount={formatCloneAmount}
        onClone={handleClonePeriodBudgets}
      />
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeletingBudget) return;
          setIsDeleteDialogOpen(open);
          if (!open) {
            setBudgetRowPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget category?</AlertDialogTitle>
            <AlertDialogDescription>
              {budgetRowPendingDelete
                ? `This will remove ${budgetRowPendingDelete.category_name} from ${monthLabel} budget.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBudget}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteBudget}
              disabled={isDeletingBudget}
            >
              {isDeletingBudget ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {metricsError ? (
        <GridItem span={12} fill>
          <Card className="border-destructive/40">
            <CardContent className="space-y-2 p-6">
              <p className="text-sm font-medium text-destructive">
                Could not load budget metrics
              </p>
              <p className="text-sm text-muted-foreground">{metricsError}</p>
            </CardContent>
          </Card>
        </GridItem>
      ) : null}

      {isEmptyMetrics ? (
        <GridItem span={12} fill>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium">
                No budgets set for {monthLabel}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add category budgets to see tracked totals for budget, spent,
                and remaining amounts.
              </p>
            </CardContent>
          </Card>
        </GridItem>
      ) : null}

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Budget"
          value={totalBudgetValue}
          footer={monthLabel}
          badge={noCurrencyBadge}
          icon={
            <Wallet
              className="text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          }
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Spent"
          value={totalSpentValue}
          footer={`Tracked expenses for ${monthLabel}`}
          badge={noCurrencyBadge}
          icon={
            <BanknoteArrowDown
              className="text-rose-600 dark:text-rose-400"
              aria-hidden
            />
          }
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Remaining"
          value={remainingValue}
          footer={`Available after spend for ${monthLabel}`}
          badge={noCurrencyBadge}
          icon={
            <PiggyBank
              className="text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          }
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Savings"
          value={savingsValue}
          footer={`Saved in ${monthLabel}`}
          badge={noCurrencyBadge}
          icon={
            <BanknoteArrowUp
              className="text-blue-600 dark:text-blue-400"
              aria-hidden
            />
          }
        />
      </GridItem>

      <GridItem span={12} lgSpan={6} fill>
        <CategoryBreakdownChartCard
          title="Category Budget Allocation"
          description={`Top 5 ${effectiveBreakdownType} budgets for ${monthLabel}`}
          data={budgetBreakdownData}
          centerLabel={`${breakdownTypeLabel} Budget`}
          headerAction={
            <ToggleGroup
              className="gap-2 rounded-lg"
              type="single"
              value={effectiveBreakdownType}
              onValueChange={handleBreakdownTypeChange}
            >
              <ToggleGroupItem
                value="expense"
                aria-label="Expense budgets"
                disabled={breakdownCountsByType.expense === 0}
                className={cn(
                  "!rounded-sm gap-2",
                  effectiveBreakdownType === "expense"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Expense
              </ToggleGroupItem>
              <ToggleGroupItem
                value="income"
                aria-label="Income budgets"
                disabled={breakdownCountsByType.income === 0}
                className={cn(
                  "!rounded-sm gap-2",
                  effectiveBreakdownType === "income"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Income
              </ToggleGroupItem>
              <ToggleGroupItem
                value="savings"
                aria-label="Savings budgets"
                disabled={breakdownCountsByType.savings === 0}
                className={cn(
                  "!rounded-sm gap-2",
                  effectiveBreakdownType === "savings"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Savings
              </ToggleGroupItem>
            </ToggleGroup>
          }
          palette={budgetBreakdownPalette}
          valueFormatter={(value) =>
            currencyCode ? toCurrency(value, currencyCode) : "—"
          }
          footerNote={currencyCode ? breakdownFooterNote : "Currency unavailable for this month"}
          emptyMessage="No category budget data to display for this month"
        />
      </GridItem>

      <GridItem span={12} lgSpan={6} fill>
        <MultiBarChartCard
          title="Budget vs Actual by Category"
          description={
            isBudgetVsActualTruncated
              ? `Top ${topBudgetVsActualData.length} ${effectiveBarType} budgets with Others for ${monthLabel}`
              : `Planned and spent ${effectiveBarType} budgets for ${monthLabel}`
          }
          headerAction={
            <ToggleGroup
              className="gap-2 rounded-lg"
              type="single"
              value={effectiveBarType}
              onValueChange={handleBarTypeChange}
            >
              <ToggleGroupItem
                value="expense"
                aria-label="Expense bar chart"
                disabled={breakdownCountsByType.expense === 0}
                className={cn(
                  "!rounded-sm gap-2",
                  effectiveBarType === "expense"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Expense
              </ToggleGroupItem>
              <ToggleGroupItem
                value="income"
                aria-label="Income bar chart"
                disabled={breakdownCountsByType.income === 0}
                className={cn(
                  "!rounded-sm gap-2",
                  effectiveBarType === "income"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Income
              </ToggleGroupItem>
              <ToggleGroupItem
                value="savings"
                aria-label="Savings bar chart"
                disabled={breakdownCountsByType.savings === 0}
                className={cn(
                  "!rounded-sm gap-2",
                  effectiveBarType === "savings"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Savings
              </ToggleGroupItem>
            </ToggleGroup>
          }
          data={limitedBudgetVsActualData}
          xDataKey="category"
          mode="grouped"
          series={[
            {
              key: "budget_minor",
              label: "Budget",
              colorVar: barSeriesColors.budget,
            },
            {
              key: "actual_minor",
              label: "Actual",
              colorVar: barSeriesColors.actual,
            },
          ]}
          yTickFormatter={formatCompactAxisAmount}
          tooltipValueFormatter={formatChartAmount}
          emptyMessage={`No ${effectiveBarType} budget data to compare for this month`}
          ariaLabel={`Budget versus actual spend by ${barTypeLabel} category`}
        />
      </GridItem>

      <GridItem span={12} fill>
        <Card>
          <CardHeader className="space-y-0 pb-2 flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Category Table
            </CardTitle>
            <ToggleGroup
              className="gap-2 rounded-lg"
              type="single"
              value={categoryTypeFilter}
              onValueChange={handleCategoryTypeFilterChange}
            >
              <ToggleGroupItem
                value="all"
                aria-label="All categories"
                className={cn(
                  "!rounded-sm gap-2",
                  categoryTypeFilter === "all"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                All
              </ToggleGroupItem>
              <ToggleGroupItem
                value="expense"
                aria-label="Expense categories"
                className={cn(
                  "!rounded-sm gap-2",
                  categoryTypeFilter === "expense"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Expense
              </ToggleGroupItem>
              <ToggleGroupItem
                value="income"
                aria-label="Income categories"
                className={cn(
                  "!rounded-sm gap-2",
                  categoryTypeFilter === "income"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Income
              </ToggleGroupItem>
              <ToggleGroupItem
                value="savings"
                aria-label="Savings categories"
                className={cn(
                  "!rounded-sm gap-2",
                  categoryTypeFilter === "savings"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                Savings
              </ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* <DataTableToolbar
              rightSlot={
                <span className="text-sm text-muted-foreground">
                  {totalFilteredRows} categories
                </span>
              }
            /> */}

            {isMobileTableView ? (
              paginatedCategoryTableRows.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {categoryTypeFilter === "all"
                    ? "No categories in this month."
                    : `No ${categoryTypeFilter} categories in this month.`}
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedCategoryTableRows.map((row) => {
                    const Icon =
                      row.category_type === "income"
                        ? TrendingUp
                        : row.category_type === "savings"
                          ? PiggyBank
                          : Receipt;
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
                    );
                  })}
                </div>
              )
            ) : (
              <DataTableBase
                columns={categoryTableColumns}
                data={paginatedCategoryTableRows}
                isLoading={false}
                emptyMessage={
                  categoryTypeFilter === "all"
                    ? "No categories in this month."
                    : `No ${categoryTypeFilter} categories in this month.`
                }
              />
            )}

            <DataTablePagination
              page={safeTablePage}
              limit={tableLimit}
              total={totalFilteredRows}
              totalPages={tableTotalPages}
              onPageChange={handleCategoryTablePageChange}
              onLimitChange={handleCategoryTableLimitChange}
              limitOptions={[5, 10, 20, 50]}
            />
          </CardContent>
        </Card>
      </GridItem>
    </>
  );
};
