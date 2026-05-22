import type { CSSProperties, ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const DEFAULT_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

type ChartDataPoint = Record<string, string | number | null | undefined>;
type FormatterValue = string | number;

type TooltipValueFormatter = (
  value: FormatterValue,
  name: string,
) => [FormatterValue, string] | FormatterValue;

export type MultiBarSeriesConfig = {
  key: string;
  label: string;
  colorVar?: string;
  radius?: number | [number, number, number, number];
  className?: string;
};

export type MultiBarChartMode = "grouped" | "stacked";

export type MultiBarChartCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
  data: ChartDataPoint[];
  xDataKey: string;
  series: MultiBarSeriesConfig[];
  mode?: MultiBarChartMode;
  height?: number;
  className?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  xTickFormatter?: (value: string | number) => string;
  yTickFormatter?: (value: string | number) => string;
  tooltipValueFormatter?: TooltipValueFormatter;
  emptyMessage?: ReactNode;
  ariaLabel?: string;
};

const defaultTooltipValueFormatter = (
  value: FormatterValue,
  name: string,
): [FormatterValue, string] => [value, name];

export const MultiBarChartCard = ({
  title = "Bar Chart Overview",
  description,
  headerAction,
  data,
  xDataKey,
  series,
  mode = "grouped",
  height = 300,
  className,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  xTickFormatter,
  yTickFormatter,
  tooltipValueFormatter = defaultTooltipValueFormatter,
  emptyMessage = "No chart data to display",
  ariaLabel,
}: MultiBarChartCardProps) => {
  const safeSeries = series.filter((item) =>
    data.some((point) => {
      const value = point[item.key];
      return typeof value === "number" && Number.isFinite(value);
    }),
  );

  const chartConfig = safeSeries.reduce<ChartConfig>((acc, item, index) => {
    acc[item.key] = {
      label: item.label,
      color:
        item.colorVar ??
        DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length],
    };
    return acc;
  }, {});

  const hasRows = data.length > 0;
  const hasRenderableSeries = safeSeries.length > 0;
  const shouldShowEmptyState = !hasRows || !hasRenderableSeries;
  const stackId = mode === "stacked" ? "stacked-bars" : undefined;
  const resolvedAriaLabel =
    ariaLabel ??
    (typeof title === "string"
      ? `${title} multi-series ${mode} bar chart`
      : `Multi-series ${mode} bar chart`);

  return (
    <Card className={cn("rounded-2xl border border-border", className)}>
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {headerAction ? <CardAction>{headerAction}</CardAction> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {shouldShowEmptyState ? (
          <div
            className="flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground"
            style={{ height }}
          >
            {emptyMessage}
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            style={{ "--chart-height": `${height}px` } as CSSProperties}
            aria-label={resolvedAriaLabel}
          >
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 8, right: 8, left: 12, bottom: 0 }}
            >
              {showGrid ? (
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="4 4"
                  stroke="hsl(var(--border))"
                />
              ) : null}
              {showXAxis ? (
                <XAxis
                  dataKey={xDataKey}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  stroke="var(--muted-foreground)"
                  tickFormatter={xTickFormatter}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
              ) : null}
              {showYAxis ? (
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  stroke="var(--muted-foreground)"
                  tickFormatter={yTickFormatter}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
              ) : null}
              {showTooltip ? (
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent formatter={tooltipValueFormatter} />
                  }
                />
              ) : null}
              {showLegend ? (
                <ChartLegend
                  verticalAlign="top"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={
                    {
                      paddingBottom: 14,
                      color: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    } as CSSProperties
                  }
                  content={<ChartLegendContent />}
                />
              ) : null}
              {safeSeries.map((item) => (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  fill={`var(--color-${item.key})`}
                  stackId={stackId}
                  radius={item.radius ?? 10}
                  className={item.className}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
