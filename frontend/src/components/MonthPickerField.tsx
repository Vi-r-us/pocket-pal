import { useEffect, useRef, useState } from "react"
import { format, parse } from "date-fns"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MonthPicker } from "@/components/ui/monthpicker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type MonthPickerFieldProps = {
  id?: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  minDate?: Date
  maxDate?: Date
  className?: string
  disabled?: boolean
  "aria-label"?: string
}

const toDate = (value: string) => {
  if (!value) return undefined
  const parsed = parse(value, "yyyy-MM", new Date())
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export const MonthPickerField = ({
  id,
  value,
  placeholder = "Pick a month",
  onChange,
  minDate,
  maxDate,
  className,
  disabled = false,
  "aria-label": ariaLabel,
}: MonthPickerFieldProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>()
  const [open, setOpen] = useState(false)
  const selectedMonth = toDate(value)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateWidth = () => {
      setPopoverWidth(element.getBoundingClientRect().width)
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [className])

  const handleMonthSelect = (date: Date) => {
    onChange(format(date, "yyyy-MM"))
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            data-empty={!selectedMonth}
            className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
          >
            {selectedMonth ? (
              format(selectedMonth, "MMM yyyy")
            ) : (
              <span>{placeholder}</span>
            )}
            <ChevronDownIcon
              className="size-4 text-muted-foreground"
              aria-hidden
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-0"
          style={popoverWidth ? { width: popoverWidth } : undefined}
        >
          <MonthPicker
            selectedMonth={selectedMonth}
            onMonthSelect={handleMonthSelect}
            minDate={minDate}
            maxDate={maxDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
