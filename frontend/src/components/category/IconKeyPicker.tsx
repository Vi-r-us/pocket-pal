import { createElement, useMemo, useState } from "react"
import { ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  ALLOWED_CATEGORY_ICON_KEYS,
  CATEGORY_ICON_MAP,
  resolveCategoryIcon,
  type CategoryIconKey,
} from "@/lib/categoryIcons"

export type IconKeyPickerProps = {
  value: string | null
  onChange: (next: string | null) => void
  id?: string
  disabled?: boolean
  label?: string
  className?: string
}

export const IconKeyPicker = ({
  value,
  onChange,
  id,
  disabled,
  label = "Icon",
  className,
}: IconKeyPickerProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filteredKeys = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return [...ALLOWED_CATEGORY_ICON_KEYS]
    }
    return ALLOWED_CATEGORY_ICON_KEYS.filter((key) =>
      key.toLowerCase().includes(q),
    )
  }, [query])

  const handleSelect = (key: CategoryIconKey) => {
    onChange(key)
    setOpen(false)
    setQuery("")
  }

  const handleClear = () => {
    onChange(null)
    setOpen(false)
    setQuery("")
  }

  const pickerId = id ?? "icon-key-picker"

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <Label htmlFor={pickerId} className="text-sm font-medium">
          {label}
        </Label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <PopoverTrigger asChild>
            <Button
              type="button"
              id={pickerId}
              variant="outline"
              disabled={disabled}
              className="h-10 gap-2 px-3"
              aria-label={label ? `${label}, choose icon` : "Choose icon"}
              aria-expanded={open}
              aria-haspopup="dialog"
            >
              {createElement(resolveCategoryIcon(value), {
                className: "size-4 shrink-0",
                "aria-hidden": true,
              })}
              <span className="truncate text-muted-foreground text-xs">
                {value ?? "None"}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          </PopoverTrigger>
          {value !== null ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Clear icon"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
        <PopoverContent
          align="start"
          className="w-[min(100vw-2rem,20rem)] p-3"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              aria-label="Filter icons by name"
              className="h-9"
            />
            <div className="max-h-56 overflow-y-auto overscroll-contain">
              <div className="grid grid-cols-6 gap-1.5 p-0.5">
                {filteredKeys.map((key) => {
                  const Icon = CATEGORY_ICON_MAP[key]
                  const isSelected = value === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelect(key)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md border border-transparent text-foreground transition-colors",
                        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected && "border-primary bg-muted/80",
                      )}
                      title={key}
                      aria-label={`Select ${key}`}
                      aria-pressed={isSelected}
                    >
                      {createElement(Icon, {
                        className: "size-4",
                        "aria-hidden": true,
                      })}
                    </button>
                  )
                })}
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleClear}
            >
              Use no icon
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
