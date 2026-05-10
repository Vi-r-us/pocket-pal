import type { AppErrorKind } from '@/lib/errors/types'

export const DEFAULT_ERROR_MESSAGES: Record<AppErrorKind, string> = {
  network: 'Network error. Check your internet and try again.',
  http: 'We could not process that request right now. Please try again.',
  auth: 'Your session has expired. Please log in again.',
  validation: 'Please review your input and try again.',
  runtime: 'Something went wrong in the app. Please reload and try again.',
  logic: 'This action could not be completed. Please try again.',
  unknown: 'Unexpected error. Please try again.',
}

export const STATUS_ERROR_MESSAGES: Partial<Record<number, string>> = {
  400: 'Invalid request. Please check your input.',
  401: 'You are not authorized. Please log in again.',
  403: 'You do not have permission to do this action.',
  404: 'Requested resource was not found.',
  408: 'The request timed out. Please try again.',
  409: 'This action conflicts with existing data.',
  422: 'Some fields are invalid. Please review and retry.',
  429: 'Too many requests. Please wait and retry.',
  500: 'Server error. Please try again in a moment.',
  502: 'Service is temporarily unavailable. Please retry shortly.',
  503: 'Service is unavailable right now. Please retry shortly.',
  504: 'Upstream service timed out. Please retry shortly.',
}

const sanitizeMessage = (value: string | undefined) => {
  if (!value) return ''
  return value.trim()
}

export function resolveUserMessage(params: {
  kind: AppErrorKind
  status?: number
  backendMessage?: string
  fallbackMessage?: string
}): string {
  const backendMessage = sanitizeMessage(params.backendMessage)
  if (backendMessage) return backendMessage

  if (typeof params.status === 'number' && STATUS_ERROR_MESSAGES[params.status]) {
    return STATUS_ERROR_MESSAGES[params.status] as string
  }

  const fallbackMessage = sanitizeMessage(params.fallbackMessage)
  if (fallbackMessage) return fallbackMessage

  return DEFAULT_ERROR_MESSAGES[params.kind]
}

export function isRetryableStatus(status?: number): boolean {
  if (!status) return false
  return [408, 425, 429, 500, 502, 503, 504].includes(status)
}
