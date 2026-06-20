import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { MetricStatCard } from "@/components/cards/MetricStatCard";
import { CashFlowChartCard } from "@/components/charts/CashFlowChartCard";
import { CategoryBreakdownChartCard } from "@/components/charts/CategoryBreakdownChartCard";
import { GridItem } from "@/components/layout/GridItem";

const cashFlowData = [
  { month: "Jan", income: 2600, expense: 1200 },
  { month: "Feb", income: 2300, expense: 1100 },
  { month: "Mar", income: 4200, expense: 2400 },
  { month: "Apr", income: 2500, expense: 800 },
  { month: "May", income: 4500, expense: 2100 },
  { month: "Jun", income: 6200, expense: 3850 },
  { month: "Jul", income: 3300, expense: 1700 },
  { month: "Aug", income: 4300, expense: 3100 },
  { month: "Sep", income: 4400, expense: 2500 },
  { month: "Oct", income: 6300, expense: 4100 },
  { month: "Nov", income: 5200, expense: 2700 },
  { month: "Dec", income: 6900, expense: 4500 },
];

const expenseBreakdownData = [
  {
    key: "food",
    label: "Food & Dining",
    value: 1400,
    colorVar: "var(--chart-1)",
  },
  {
    key: "utilities",
    label: "Utilities",
    value: 700,
    colorVar: "var(--chart-2)",
  },
  {
    key: "transport",
    label: "Transport",
    value: 525,
    colorVar: "var(--chart-3)",
  },
  {
    key: "shopping",
    label: "Shopping",
    value: 525,
    colorVar: "var(--chart-4)",
  },
  {
    key: "entertainment",
    label: "Entertainment",
    value: 350,
    colorVar: "var(--chart-5)",
  },
];

export const DashboardPage = () => {
  return (
    <>
      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Balance"
          value="$56,200"
          footer="vs last month"
          trend={{ direction: "up", label: "12.5%" }}
          icon={<Wallet aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Income"
          value="$2,840"
          footer="vs last month"
          trend={{ direction: "down", label: "3.1%" }}
          tone="income"
          icon={<BanknoteArrowUp aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Expenses"
          value="$2,840"
          footer="vs last month"
          trend={{ direction: "down", label: "3.1%" }}
          tone="expense"
          icon={<BanknoteArrowDown aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} mdSpan={6} lgSpan={3} fill>
        <MetricStatCard
          title="Total Savings"
          value="$2,840"
          footer="vs last month"
          trend={{ direction: "down", label: "3.1%" }}
          tone="savings"
          icon={<PiggyBank aria-hidden />}
        />
      </GridItem>

      <GridItem span={12} lgSpan={7} fill>
        <CashFlowChartCard
          title="Cash Flow Overview"
          data={cashFlowData}
          xDataKey="month"
          height={320}
          yTickFormatter={(value) => `${Number(value) / 1000}K`}
          series={[
            {
              key: "income",
              label: "Income",
              colorVar: "#84cc16",
              showDots: true,
            },
            {
              key: "expense",
              label: "Expense",
              colorVar: "#14b8a6",
              showDots: true,
            },
          ]}
        />
      </GridItem>

      <GridItem span={12} lgSpan={5} fill>
        <CategoryBreakdownChartCard
          title="Expense Breakdown"
          data={expenseBreakdownData}
          valueFormatter={(v) => `$${v.toLocaleString()}`}
          centerLabel="Total"
          periodOptions={[
            { value: "this-month", label: "This Month" },
            { value: "last-month", label: "Last Month" },
            { value: "last-3-months", label: "Last 3 Months" },
          ]}
          defaultPeriod="this-month"
        />
      </GridItem>
    </>
  );
};
