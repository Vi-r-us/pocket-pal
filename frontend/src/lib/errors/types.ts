export type AppErrorKind =
  | 'network'
  | 'http'
  | 'auth'
  | 'validation'
  | 'runtime'
  | 'logic'
  | 'unknown'

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'

export type ErrorSource = 'api' | 'react-query' | 'ui-action' | 'runtime' | 'unknown'

export type AppErrorShape = {
  name: 'AppError'
  kind: AppErrorKind
  source: ErrorSource
  severity: ErrorSeverity
  message: string
  userMessage: string
  status?: number
  code?: string
  retryable: boolean
  requestId?: string
  details?: unknown
  cause?: unknown
  timestamp: string
}

export type ErrorContext = {
  source?: ErrorSource
  operation?: string
  endpoint?: string
  fallbackMessage?: string
  silent?: boolean
  tags?: Record<string, string>
}
