import { Panel } from "@/components/layout/Panel"
import { SettingsSectionShell } from "@/components/settings/SettingsSectionShell"
import type { ReactNode } from "react"

type SettingsPlaceholderPageProps = {
  title: string
  description: string
  statusTitle: string
  statusDescription: string
  actions?: ReactNode
}

export const SettingsPlaceholderPage = ({
  title,
  description,
  statusTitle,
  statusDescription,
  actions,
}: SettingsPlaceholderPageProps) => {
  return (
    <SettingsSectionShell
      title={title}
      description={description}
      actions={actions}
      main={
        <Panel
          title="Coming soon"
          description="This section will be connected to backend settings APIs in the next iteration."
        >
          <p className="text-muted-foreground text-sm">
            The layout and navigation are ready. This section is now scaffolded and can be implemented independently.
          </p>
        </Panel>
      }
      aside={
        <Panel title={statusTitle} description={statusDescription}>
          <p className="text-muted-foreground text-sm">Use this space for contextual status, audit history, and quick actions.</p>
        </Panel>
      }
    />
  )
}
