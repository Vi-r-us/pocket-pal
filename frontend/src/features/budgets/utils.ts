import type { BudgetCategoryType } from "./types"

const currencyFormatterCache = new Map<string, Intl.NumberFormat>()

export const compactAxisFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const getCurrencyFormatter = (currency: string) => {
  const normalizedCurrency = currency?.trim().toUpperCase() || "USD"
  const cached = currencyFormatterCache.get(normalizedCurrency)
  if (cached) return cached

  try {
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    })
    currencyFormatterCache.set(normalizedCurrency, formatter)
    return formatter
  } catch {
    const fallback = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    })
    currencyFormatterCache.set(normalizedCurrency, fallback)
    return fallback
  }
}

export const toMinorNumber = (value: number | string) => {
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const toCurrency = (minor: number | string, currency: string) => {
  return getCurrencyFormatter(currency).format(toMinorNumber(minor) / 100)
}

export const normalizeCategoryType = (
  value: string | null | undefined,
): BudgetCategoryType => {
  if (value === "income" || value === "savings") {
    return value
  }
  return "expense"
}

export const formatProgressLabel = (progressPercent: number) =>
  `${progressPercent.toFixed(1)}%`

export const capitalizeType = (type: string) =>
  type.charAt(0).toUpperCase() + type.slice(1)
