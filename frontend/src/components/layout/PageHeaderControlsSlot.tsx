import type { PageHeaderControlsConfig } from "@/contexts/PageHeaderControlsContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

type PageHeaderControlsSlotProps = {
  controls: PageHeaderControlsConfig
}

export const PageHeaderControlsInline = ({
  controls,
}: PageHeaderControlsSlotProps) => {
  const overflowActions = controls.overflowActions ?? []

  return (
    <div className="hidden min-w-0 shrink-0 items-center gap-2 sm:flex">
      {controls.toolbar}
      {overflowActions.map((action) => {
        const Icon = action.icon
        return (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 max-lg:size-9 max-lg:px-0"
            title={action.label}
            onClick={action.onSelect}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="hidden lg:inline">{action.label}</span>
            <span className="sr-only lg:hidden">{action.label}</span>
          </Button>
        )
      })}
    </div>
  )
}

export const PageHeaderControlsMobileToolbar = ({
  controls,
}: PageHeaderControlsSlotProps) => {
  const overflowActions = controls.overflowActions ?? []

  return (
    <div className="app-content-frame flex items-center justify-between gap-2 border-t border-border pb-2.5 pt-2 sm:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {controls.toolbar}
      </div>
      {overflowActions.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0"
              aria-label="More page actions"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {overflowActions.map((action) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem key={action.id} onSelect={action.onSelect}>
                  <Icon className="size-4" aria-hidden />
                  {action.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
