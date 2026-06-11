export const getCurrentYyyyMm = () => {
  const now = new Date()
  return now.getFullYear() * 100 + (now.getMonth() + 1)
}

export const yyyyMmToDate = (yyyyMm: number) => {
  const yyyyMmText = String(yyyyMm)
  if (!/^\d{6}$/.test(yyyyMmText)) return undefined

  const year = Number(yyyyMmText.slice(0, 4))
  const month = Number(yyyyMmText.slice(4, 6)) - 1
  const monthDate = new Date(year, month, 1)

  if (Number.isNaN(monthDate.getTime())) return undefined
  return monthDate
}

export const dateToYyyyMm = (date: Date) => {
  return date.getFullYear() * 100 + (date.getMonth() + 1)
}

export const yyyyMmToInputValue = (yyyyMm: number) => {
  const text = String(yyyyMm)
  if (!/^\d{6}$/.test(text)) return ""
  return `${text.slice(0, 4)}-${text.slice(4, 6)}`
}

export const inputValueToYyyyMm = (value: string) => {
  if (!/^\d{4}-\d{2}$/.test(value)) return null
  const normalized = value.replace("-", "")
  return /^\d{6}$/.test(normalized) ? Number(normalized) : null
}

export const formatYyyyMmLabel = (yyyyMm: number) => {
  const monthDate = yyyyMmToDate(yyyyMm)
  if (!monthDate) return "Selected month"

  return monthDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })
}
