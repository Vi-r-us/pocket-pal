import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "./button"
import { cn } from "@/lib/utils"

type Month = {
  number: number
  name: string
}

const MONTHS: Month[][] = [
  [
    { number: 0, name: "Jan" },
    { number: 1, name: "Feb" },
    { number: 2, name: "Mar" },
    { number: 3, name: "Apr" },
  ],
  [
    { number: 4, name: "May" },
    { number: 5, name: "Jun" },
    { number: 6, name: "Jul" },
    { number: 7, name: "Aug" },
  ],
  [
    { number: 8, name: "Sep" },
    { number: 9, name: "Oct" },
    { number: 10, name: "Nov" },
    { number: 11, name: "Dec" },
  ],
]

type ButtonVariant =
  | "default"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "secondary"
  | null
  | undefined

type MonthCalProps = {
  selectedMonth?: Date
  onMonthSelect?: (date: Date) => void
  onYearForward?: () => void
  onYearBackward?: () => void
  callbacks?: {
    yearLabel?: (year: number) => string
    monthLabel?: (month: Month) => string
  }
  variant?: {
    calendar?: {
      main?: ButtonVariant
      selected?: ButtonVariant
    }
    chevrons?: ButtonVariant
  }
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
}

const MonthCal = ({
  selectedMonth,
  onMonthSelect,
  callbacks,
  variant,
  minDate,
  maxDate,
  disabledDates,
  onYearBackward,
  onYearForward,
}: MonthCalProps) => {
  const [year, setYear] = React.useState(
    selectedMonth?.getFullYear() ?? new Date().getFullYear(),
  )
  const [month, setMonth] = React.useState(
    selectedMonth?.getMonth() ?? new Date().getMonth(),
  )
  const [menuYear, setMenuYear] = React.useState(year)

  React.useEffect(() => {
    if (!selectedMonth) return
    setYear(selectedMonth.getFullYear())
    setMonth(selectedMonth.getMonth())
    setMenuYear(selectedMonth.getFullYear())
  }, [selectedMonth])

  const effectiveMinDate = minDate
  const effectiveMaxDate =
    minDate && maxDate && minDate > maxDate ? minDate : maxDate

  const disabledDatesMapped = disabledDates?.map((date) => ({
    year: date.getFullYear(),
    month: date.getMonth(),
  }))

  const isMonthDisabled = (monthNumber: number) => {
    if (
      effectiveMaxDate &&
      (menuYear > effectiveMaxDate.getFullYear() ||
        (menuYear === effectiveMaxDate.getFullYear() &&
          monthNumber > effectiveMaxDate.getMonth()))
    ) {
      return true
    }

    if (
      effectiveMinDate &&
      (menuYear < effectiveMinDate.getFullYear() ||
        (menuYear === effectiveMinDate.getFullYear() &&
          monthNumber < effectiveMinDate.getMonth()))
    ) {
      return true
    }

    if (
      disabledDatesMapped?.some(
        (entry) => entry.year === menuYear && entry.month === monthNumber,
      )
    ) {
      return true
    }

    return false
  }

  const handleYearBackward = () => {
    setMenuYear(menuYear - 1)
    onYearBackward?.()
  }

  const handleYearForward = () => {
    setMenuYear(menuYear + 1)
    onYearForward?.()
  }

  const handleMonthSelect = (monthNumber: number) => {
    setMonth(monthNumber)
    setYear(menuYear)
    onMonthSelect?.(new Date(menuYear, monthNumber))
  }

  return (
    <div className="w-full space-y-4">
        <div className="relative flex w-full items-center justify-center pt-1">
          <div className="text-sm font-medium">
            {callbacks?.yearLabel
              ? callbacks.yearLabel(menuYear)
              : menuYear}
          </div>
          <button
            type="button"
            onClick={handleYearBackward}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? "outline" }),
              "absolute left-1 inline-flex h-7 w-7 items-center justify-center p-0",
            )}
            aria-label="Previous year"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleYearForward}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? "outline" }),
              "absolute right-1 inline-flex h-7 w-7 items-center justify-center p-0",
            )}
            aria-label="Next year"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <div className="w-full space-y-1">
          {MONTHS.map((monthRow, rowIndex) => (
            <div
              key={rowIndex}
              className="grid w-full grid-cols-4 gap-0"
            >
              {monthRow.map((monthItem) => {
                const isSelected =
                  month === monthItem.number && menuYear === year

                return (
                  <div
                    key={monthItem.number}
                    className="relative min-w-0 p-0 text-center text-sm focus-within:relative focus-within:z-20"
                  >
                    <button
                      type="button"
                      onClick={() => handleMonthSelect(monthItem.number)}
                      disabled={isMonthDisabled(monthItem.number)}
                      aria-selected={isSelected}
                      className={cn(
                        buttonVariants({
                          variant: isSelected
                            ? (variant?.calendar?.selected ?? "default")
                            : (variant?.calendar?.main ?? "ghost"),
                        }),
                        "h-8 w-full p-0 font-normal aria-selected:opacity-100",
                      )}
                    >
                      {callbacks?.monthLabel
                        ? callbacks.monthLabel(monthItem)
                        : monthItem.name}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
    </div>
  )
}

const MonthPicker = ({
  onMonthSelect,
  selectedMonth,
  minDate,
  maxDate,
  disabledDates,
  callbacks,
  onYearBackward,
  onYearForward,
  variant,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & MonthCalProps) => {
  return (
    <div className={cn("w-full p-3", className)} {...props}>
      <MonthCal
        onMonthSelect={onMonthSelect}
        selectedMonth={selectedMonth}
        minDate={minDate}
        maxDate={maxDate}
        disabledDates={disabledDates}
        callbacks={callbacks}
        onYearBackward={onYearBackward}
        onYearForward={onYearForward}
        variant={variant}
      />
    </div>
  )
}

MonthPicker.displayName = "MonthPicker"

export { MonthPicker }
export type { Month, MonthCalProps }
