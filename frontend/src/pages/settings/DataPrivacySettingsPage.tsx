import { Link } from "react-router-dom"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsPlaceholderPage } from "@/pages/settings/SettingsPlaceholderPage"

export const DataPrivacySettingsPage = () => {
  return (
    <SettingsPlaceholderPage
      title="Data & Privacy"
      description="Control data export, retention, consent, and account-level privacy actions."
      statusTitle="Privacy overview"
      statusDescription="This panel will summarize retention policy and latest export activity."
      actions={
        <Button asChild type="button">
          <Link to="/settings/import-data">
            <Download className="size-4" aria-hidden />
            Import Data
          </Link>
        </Button>
      }
    />
  )
}
