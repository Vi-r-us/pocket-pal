import { toAppError } from '@/lib/errors/normalize'
import type { ErrorContext } from '@/lib/errors/types'
import { AppError } from '@/lib/errors/classes'

export type ReportableError = AppError | Error | unknown

export type ErrorReporter = (error: ReportableError, context?: ErrorContext) => void

export function sanitizeErrorForTransport(error: AppError): Record<string, unknown> {
  return {
    kind: error.shape.kind,
    source: error.shape.source,
    severity: error.shape.severity,
    message: error.shape.message,
    userMessage: error.shape.userMessage,
    status: error.shape.status,
    code: error.shape.code,
    retryable: error.shape.retryable,
    requestId: error.shape.requestId,
    timestamp: error.shape.timestamp,
    context: error.shape.cause ? { hasCause: true } : undefined,
  }
}

export function createErrorReporter(): ErrorReporter {
  return (error, context) => {
    const appError = toAppError(error, context)
    const payload = sanitizeErrorForTransport(appError)

    if (import.meta.env.DEV) {
      console.error('[frontend-error]', payload)
      return
    }

    const endpoint = (import.meta.env.VITE_ERROR_REPORT_URL ?? '').trim()
    if (!endpoint) {
      console.error('[frontend-error]', payload)
      return
    }

    try {
      const body = JSON.stringify(payload)
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(endpoint, blob)
      } else {
        void fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        })
      }
    } catch {
      console.error('[frontend-error]', payload)
    }
  }
}

export const reportError: ErrorReporter = createErrorReporter()
