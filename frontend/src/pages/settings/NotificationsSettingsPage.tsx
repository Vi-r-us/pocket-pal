import { SettingsPlaceholderPage } from "@/pages/settings/SettingsPlaceholderPage"

export const NotificationsSettingsPage = () => {
  return (
    <SettingsPlaceholderPage
      title="Notifications"
      description="Choose alerts for budgets, goals, reminders, and product updates."
      statusTitle="Delivery status"
      statusDescription="This panel will show email and in-app notification channel health."
    />
  )
}
