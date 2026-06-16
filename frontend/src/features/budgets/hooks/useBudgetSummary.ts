import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { getInlineErrorMessage } from "@/lib/errors/normalize"
import type { ApiEnvelope } from "@/types/api"
import type { BudgetSummaryData } from "../types"

export const useBudgetSummary = (selectedYyyyMm: number, refreshKey: number) => {
  const [summary, setSummary] = useState<BudgetSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isCurrent = true

    const fetchBudgetSummary = async () => {
      setIsLoading(true)
      setError("")

      try {
        const response = await api.get<ApiEnvelope<BudgetSummaryData>>(
          `/budgets/month/${selectedYyyyMm}/summary`,
        )
        if (!isCurrent) return
        setSummary(response.data)
      } catch (fetchError) {
        if (!isCurrent) return
        setSummary(null)
        setError(
          getInlineErrorMessage(fetchError, "Could not load budget metrics"),
        )
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    fetchBudgetSummary()

    return () => {
      isCurrent = false
    }
  }, [refreshKey, selectedYyyyMm])

  return { summary, isLoading, error, setError }
}
