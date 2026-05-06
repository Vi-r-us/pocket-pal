export const APP_HEADER_PRIMARY_ACTION_EVENT = "pocketpal:header-primary-action"

export type AppHeaderPrimaryActionKey = "create-account" | "create-transaction" | "create-budget" | "create-goal" | "create-category-group"

export type AppHeaderPrimaryActionDetail = {
  actionKey: AppHeaderPrimaryActionKey
}
