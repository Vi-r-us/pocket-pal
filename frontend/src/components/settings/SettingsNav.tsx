import { ChevronRight } from "lucide-react"
import { NavLink } from "react-router-dom"
import type { SettingsSectionConfig } from "@/features/settings/settingsSections"
import { settingsSections } from "@/features/settings/settingsSections"
import { cn } from "@/lib/utils"

type SettingsNavProps = {
  className?: string
  sections?: SettingsSectionConfig[]
  variant?: "rail" | "list"
}

export const SettingsNav = ({ className, sections = settingsSections, variant = "rail" }: SettingsNavProps) => {
  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {sections.map((section) => {
          const Icon = section.icon

          return (
            <NavLink
              key={section.id}
              to={section.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary/60 bg-primary/5"
                    : "hover:border-primary/40 hover:bg-muted/60",
                )
              }
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-sm text-foreground">{section.label}</span>
                <span className="mt-0.5 block truncate text-muted-foreground text-xs">{section.description}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </NavLink>
          )
        })}
      </div>
    )
  }

  return (
    <nav className={cn("space-y-1", className)} aria-label="Settings sections">
      {sections.map((section) => {
        const Icon = section.icon

        return (
          <NavLink
            key={section.id}
            to={section.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md border-l-[3px] px-2.5 py-2 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-l-primary bg-primary/10 text-foreground"
                  : "border-l-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate font-medium">{section.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
