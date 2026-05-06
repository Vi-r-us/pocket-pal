import { SettingsPlaceholderPage } from "@/pages/settings/SettingsPlaceholderPage"

export const LinkedAccountsSettingsPage = () => {
  return (
    <SettingsPlaceholderPage
      title="Linked Accounts"
      description="Connect and manage external accounts and sync preferences."
      statusTitle="Sync status"
      statusDescription="This panel will show active connections, sync cadence, and recent failures."
    />
  )
}
