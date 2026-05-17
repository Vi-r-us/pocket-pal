export type ApiEnvelope<TData> = {
  statusCode: number
  data: TData
  message: string
  success: boolean
  requestId?: string
}

export type ApiErrorEnvelope = {
  statusCode?: number
  success?: false
  message?: string
  code?: string
  errors?: unknown[]
  data?: unknown
  requestId?: string
}
