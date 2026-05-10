import axios, { type AxiosError } from 'axios'
import { AppError, HttpAppError, RuntimeAppError } from '@/lib/errors/classes'
import { isRetryableStatus, resolveUserMessage } from '@/lib/errors/messages'
import type { ErrorContext } from '@/lib/errors/types'
import type { ApiErrorEnvelope } from '@/types/api'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getBackendEnvelope = (data: unknown): ApiErrorEnvelope => {
  if (!isObject(data)) return {}

  return {
    statusCode: typeof data.statusCode === 'number' ? data.statusCode : undefined,
    success: data.success === false ? false : undefined,
    message: typeof data.message === 'string' ? data.message : undefined,
    code: typeof data.code === 'string' ? data.code : undefined,
    errors: Array.isArray(data.errors) ? data.errors : undefined,
    data: data.data,
    requestId: typeof data.requestId === 'string' ? data.requestId : undefined,
  }
}

const nowIso = () => new Date().toISOString()

export function normalizeAxiosError(error: AxiosError, context: ErrorContext = {}): AppError {
  if (!error.response) {
    const message = error.message || 'Network request failed'
    return new AppError({
      name: 'AppError',
      kind: 'network',
      source: context.source ?? 'api',
      severity: 'error',
      message,
      userMessage: resolveUserMessage({
        kind: 'network',
        fallbackMessage: context.fallbackMessage,
      }),
      retryable: true,
      details: undefined,
      cause: error,
      timestamp: nowIso(),
    })
  }

  const status = error.response.status
  const envelope = getBackendEnvelope(error.response.data)
  const backendMessage = envelope.message
  const kind = status === 401 ? 'auth' : status === 400 || status === 422 ? 'validation' : 'http'
  const message = backendMessage?.trim() || error.message || `Request failed with status ${status}`
  const retryable = isRetryableStatus(status)

  return new HttpAppError({
    source: context.source ?? 'api',
    severity: status >= 500 ? 'error' : kind === 'validation' ? 'warning' : 'error',
    message,
    userMessage: resolveUserMessage({
      kind,
      status,
      backendMessage,
      fallbackMessage: context.fallbackMessage,
    }),
    status,
    code: envelope.code,
    retryable,
    requestId: envelope.requestId,
    details: envelope.errors ?? error.response.data,
    cause: error,
    timestamp: nowIso(),
  })
}

export function normalizeUnknownError(error: unknown, context: ErrorContext = {}): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (axios.isAxiosError(error)) {
    return normalizeAxiosError(error, context)
  }

  if (error instanceof Error) {
    const kind = context.source === 'runtime' ? 'runtime' : 'unknown'
    return new RuntimeAppError({
      source: context.source ?? 'unknown',
      severity: kind === 'runtime' ? 'fatal' : 'error',
      message: error.message || 'Unexpected application error',
      userMessage: resolveUserMessage({
        kind,
        fallbackMessage: context.fallbackMessage,
      }),
      retryable: false,
      details: undefined,
      cause: error,
      timestamp: nowIso(),
    })
  }

  const message = typeof error === 'string' ? error : 'Unexpected error'
  return new AppError({
    name: 'AppError',
    kind: 'unknown',
    source: context.source ?? 'unknown',
    severity: 'error',
    message,
    userMessage: resolveUserMessage({
      kind: 'unknown',
      backendMessage: message,
      fallbackMessage: context.fallbackMessage,
    }),
    retryable: false,
    details: error,
    cause: error,
    timestamp: nowIso(),
  })
}

export function toAppError(error: unknown, context?: ErrorContext): AppError {
  return normalizeUnknownError(error, context)
}

export function getInlineErrorMessage(error: unknown, fallbackMessage: string): string {
  return toAppError(error, { fallbackMessage }).shape.userMessage
}

export function shouldAutoRetry(error: unknown): boolean {
  return toAppError(error).shape.retryable
}
