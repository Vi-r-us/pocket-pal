import type { LucideIcon } from "lucide-react"
import {
  Bell,
  CircleHelp,
  Link,
  Lock,
  Tags,
  UserRound,
  Wrench,
  ShieldAlert,
} from "lucide-react"

export type SettingsSectionId =
  | "profile"
  | "security"
  | "preferences"
  | "notifications"
  | "categories"
  | "linked-accounts"
  | "data-privacy"
  | "help"

export type SettingsSectionConfig = {
  id: SettingsSectionId
  label: string
  description: string
  path: `/settings/${string}`
  icon: LucideIcon
}

export const settingsSections: SettingsSectionConfig[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Manage your identity and personal details",
    path: "/settings/profile",
    icon: UserRound,
  },
  {
    id: "security",
    label: "Security",
    description: "Protect your account and active sessions",
    path: "/settings/security",
    icon: Lock,
  },
  {
    id: "preferences",
    label: "Preferences",
    description: "Set app behavior, theme, and formats",
    path: "/settings/preferences",
    icon: Wrench,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Choose what alerts you receive",
    path: "/settings/notifications",
    icon: Bell,
  },
  {
    id: "categories",
    label: "Categories",
    description: "Organize income, expense, and savings groups",
    path: "/settings/categories",
    icon: Tags,
  },
  {
    id: "linked-accounts",
    label: "Linked Accounts",
    description: "Track external connections and sync status",
    path: "/settings/linked-accounts",
    icon: Link,
  },
  {
    id: "data-privacy",
    label: "Data & Privacy",
    description: "Control data export, retention, and consent",
    path: "/settings/data-privacy",
    icon: ShieldAlert,
  },
  {
    id: "help",
    label: "Help & About",
    description: "Find support resources and app information",
    path: "/settings/help",
    icon: CircleHelp,
  },
]

export const getSettingsSection = (pathname: string) => settingsSections.find((section) => section.path === pathname) ?? null
