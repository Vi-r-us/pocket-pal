export type CategoryType = "income" | "expense" | "savings"

export type CategoryGroupRow = {
  group_id: number
  user_id: number | null
  type: CategoryType
  name: string
  icon_key: string | null
}

export type ApiSuccess<T> = {
  statusCode: number
  data: T
  message: string
  success: boolean
}
