import { SettingsPlaceholderPage } from "@/pages/settings/SettingsPlaceholderPage"

export const PreferencesSettingsPage = () => {
  return (
    <SettingsPlaceholderPage
      title="Preferences"
      description="Configure app behavior, display options, and personal defaults."
      statusTitle="Preference snapshot"
      statusDescription="This panel will summarize active theme, language, and format settings."
    />
  )
}
