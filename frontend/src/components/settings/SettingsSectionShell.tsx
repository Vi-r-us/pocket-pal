import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SettingsSectionShellProps = {
  title: string
  description?: string
  actions?: ReactNode
  main: ReactNode
  aside?: ReactNode
  className?: string
}

export const SettingsSectionShell = ({
  title,
  description,
  actions,
  main,
  aside,
  className,
}: SettingsSectionShellProps) => {
  return (
    <div className={cn("space-y-4 md:space-y-6", className)}>
      <div className="md:hidden">
        <Button asChild type="button" variant="ghost" size="sm" className="gap-1.5 pl-0">
          <Link to="/settings">
            <ArrowLeft className="size-4" aria-hidden />
            All settings
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
          {description ? <p className="text-muted-foreground text-sm md:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-10 xl:gap-8">
        <section className="space-y-4 md:space-y-6 lg:col-span-5">{main}</section>
        {aside ? <aside className="space-y-4 md:space-y-6 lg:col-span-5">{aside}</aside> : null}
      </div>
    </div>
  )
}
