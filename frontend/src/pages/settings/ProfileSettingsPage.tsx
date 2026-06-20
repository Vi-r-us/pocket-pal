import { Save } from "lucide-react"
import { Panel } from "@/components/layout/Panel"
import { SettingsSectionShell } from "@/components/settings/SettingsSectionShell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { AppTheme } from "@/stores/usePrefsStore"
import { usePrefsStore } from "@/stores/usePrefsStore"
import { useAuthStore } from "@/stores/useAuthStore"

const readUserField = (user: Record<string, unknown> | null, key: string) => {
  const value = user?.[key]
  return typeof value === "string" ? value.trim() : ""
}

export const ProfileSettingsPage = () => {
  const theme = usePrefsStore((state) => state.theme)
  const setTheme = usePrefsStore((state) => state.setTheme)
  const user = useAuthStore((state) => state.user)
  const fullName =
    readUserField(user, "fullname") ||
    readUserField(user, "fullName") ||
    readUserField(user, "name")
  const email = readUserField(user, "email")
  const handleThemeChange = (value: string) => {
    if (!value) {
      return
    }

    setTheme(value as AppTheme)
  }

  return (
    <SettingsSectionShell
      title="Profile"
      description="Manage your personal information and default app preferences."
      actions={
        <Button type="button">
          <Save className="size-4" aria-hidden />
          Save changes
        </Button>
      }
      main={
        <>
          <Panel title="Profile information" description="These details are used in receipts and account communications.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-full-name">Full name</Label>
                <Input
                  key={fullName}
                  id="settings-full-name"
                  defaultValue={fullName}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email address</Label>
                <Input
                  key={email}
                  id="settings-email"
                  type="email"
                  defaultValue={email}
                  placeholder="you@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-phone">Phone number</Label>
                <Input id="settings-phone" type="tel" placeholder="Add a phone number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-timezone">Time zone</Label>
                <Input id="settings-timezone" placeholder="Select your time zone" />
              </div>
            </div>
          </Panel>

          <Panel title="Theme preference" description="Select the default theme for your PocketPal workspace.">
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={handleThemeChange}
              variant="outline"
              spacing={2}
              className="grid grid-cols-3 gap-2"
            >
              <ToggleGroupItem value="light" aria-label="Use light theme">
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label="Use dark theme">
                Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="system" aria-label="Use system theme">
                System
              </ToggleGroupItem>
            </ToggleGroup>
          </Panel>
        </>
      }
      aside={
        <>
          <Panel title="Security snapshot" description="Track account protection signals and active session details.">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Password updated</span>
                <span className="font-medium">30 days ago</span>
              </li>
              <li className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Two-factor authentication</span>
                <span className="font-medium text-status-active">Enabled</span>
              </li>
              <li className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Current session</span>
                <span className="font-medium">Web - Active now</span>
              </li>
            </ul>
          </Panel>

          <Panel title="Notification preferences" description="Choose the updates you want to receive.">
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Budget alerts</span>
                <Checkbox defaultChecked />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Goal reminders</span>
                <Checkbox defaultChecked />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Marketing updates</span>
                <Checkbox />
              </label>
            </div>
          </Panel>
        </>
      }
    />
  )
}
