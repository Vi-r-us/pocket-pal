import { SettingsNav } from "@/components/settings/SettingsNav"
import { Panel } from "@/components/layout/Panel"

export const SettingsOverviewPage = () => {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <Panel
        title="Settings"
        description="Choose a section to manage your profile, security, preferences, and data controls."
      >
        <SettingsNav variant="list" />
      </Panel>
    </div>
  )
}
