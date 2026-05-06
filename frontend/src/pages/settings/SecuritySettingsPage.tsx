import { SettingsPlaceholderPage } from "@/pages/settings/SettingsPlaceholderPage"

export const SecuritySettingsPage = () => {
  return (
    <SettingsPlaceholderPage
      title="Security"
      description="Manage password, two-factor authentication, and trusted sessions."
      statusTitle="Security health"
      statusDescription="This area will show password age, 2FA state, and recent login events."
    />
  )
}
