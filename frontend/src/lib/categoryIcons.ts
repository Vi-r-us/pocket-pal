import type { LucideIcon } from "lucide-react"
import {
  ArrowLeftRight,
  Baby,
  BadgeDollarSign,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  Hammer,
  Heart,
  HeartHandshake,
  Home,
  Hospital,
  Landmark,
  Laptop,
  Layers,
  LineChart,
  MoreHorizontal,
  Palette,
  Percent,
  PieChart,
  PiggyBank,
  Plane,
  Receipt,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  TreePalm,
  UsersRound,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react"
import categoryIconData from "@/constants/category-icon-data.json"

export type CategoryIconKey = (typeof categoryIconData.allowedKeys)[number]

const FALLBACK_ICON: LucideIcon = Tag

export const CATEGORY_ICON_MAP = {
  ArrowLeftRight,
  Baby,
  BadgeDollarSign,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  Hammer,
  Heart,
  HeartHandshake,
  Home,
  Hospital,
  Landmark,
  Laptop,
  Layers,
  LineChart,
  MoreHorizontal,
  Palette,
  Percent,
  PieChart,
  PiggyBank,
  Plane,
  Receipt,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  TreePalm,
  UsersRound,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} as const satisfies Record<CategoryIconKey, LucideIcon>

export const ALLOWED_CATEGORY_ICON_KEYS = categoryIconData.allowedKeys as readonly CategoryIconKey[]

/**
 * Resolves Lucide icon for categories: prefers own icon_key, then group's icon_key (inherit), then Tag.
 */
export const resolveCategoryIcon = (
  iconKey: string | null | undefined,
  groupIconKey?: string | null | undefined,
): LucideIcon => {
  const key = iconKey ?? groupIconKey ?? null
  if (key && Object.prototype.hasOwnProperty.call(CATEGORY_ICON_MAP, key)) {
    return CATEGORY_ICON_MAP[key as CategoryIconKey]
  }
  return FALLBACK_ICON
}
