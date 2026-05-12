import axios, { type AxiosRequestConfig } from 'axios'
import { AppError } from '@/lib/errors/classes'
import { resolveUserMessage } from '@/lib/errors/messages'
import { toAppError } from '@/lib/errors/normalize'
import { useAuthStore } from '@/stores/useAuthStore'
import type { AppErrorShape, ErrorContext } from '@/lib/errors/types'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RequestOptions = Omit<AxiosRequestConfig, 'url' | 'method' | 'data' | 'withCredentials'> & {
  body?: unknown
  retryUnauthorized?: boolean
  headers?: Record<string, string>
}

class ApiError extends AppError {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown, context: Partial<AppErrorShape> = {}) {
    super({
      name: 'AppError',
      kind: status === 401 ? 'auth' : status === 400 || status === 422 ? 'validation' : 'http',
      source: context.source ?? 'api',
      severity: status >= 500 ? 'error' : 'warning',
      message,
      userMessage: context.userMessage ?? message,
      status,
      code: context.code,
      retryable: context.retryable ?? status >= 500,
      requestId: context.requestId,
      details: data,
      cause: context.cause,
      timestamp: context.timestamp ?? new Date().toISOString(),
    })
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
const API_PREFIX = `/${(import.meta.env.VITE_API_PREFIX ?? 'api/v1').replaceAll(/^\/+|\/+$/g, '')}`
const authDebugPrefix = '[api-auth]'
const authDebugStorageKey = '__auth_debug__'

const pushAuthDebug = (entry: Record<string, unknown>) => {
  try {
    const storage = globalThis.sessionStorage
    const existingRaw = storage.getItem(authDebugStorageKey)
    const existing = existingRaw ? (JSON.parse(existingRaw) as Array<Record<string, unknown>>) : []
    const next = [...existing, { ts: new Date().toISOString(), ...entry }].slice(-80)
    storage.setItem(authDebugStorageKey, JSON.stringify(next))
  } catch {
    // Intentionally ignore storage failures in debug utility
  }
}

const buildUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const fullPath = normalizedPath.startsWith(`${API_PREFIX}/`) ? normalizedPath : `${API_PREFIX}${normalizedPath}`
  return `${API_URL}${fullPath}`
}

const getBackendMessage = (data: unknown): string | undefined => {
  if (typeof data === 'string' && data.trim()) {
    return data.trim()
  }

  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }

  return undefined
}

const toApiError = (error: unknown, context: ErrorContext = {}): ApiError => {
  if (error instanceof ApiError) {
    const backendMessage = getBackendMessage(error.data)
    return new ApiError(error.status, error.message, error.data, {
      ...error.shape,
      userMessage:
        backendMessage ||
        error.shape.userMessage ||
        resolveUserMessage({
          kind: error.shape.kind,
          status: error.status,
          fallbackMessage: context.fallbackMessage,
        }),
    })
  }

  const appError = toAppError(error, { source: 'api', ...context })
  return new ApiError(appError.shape.status ?? 500, appError.shape.message, appError.shape.details, appError.shape)
}

const handleUnauthorized = () => {
  pushAuthDebug({
    event: 'handle-unauthorized',
    pathname: globalThis.location.pathname,
  })
  console.warn(`${authDebugPrefix} clearing user and redirecting to /login`, {
    pathname: globalThis.location.pathname,
  })
  useAuthStore.getState().clearUser()

  if (globalThis.location.pathname !== '/login') {
    globalThis.location.assign('/login')
  }
}

const requestClient = axios.create({
  withCredentials: true,
  validateStatus: () => true,
})

const refreshClient = axios.create({
  withCredentials: true,
  validateStatus: () => true,
})

const refreshSession = async (): Promise<boolean> => {
  pushAuthDebug({
    event: 'refresh-start',
  })
  console.info(`${authDebugPrefix} attempting refresh-tokens`)
  const response = await refreshClient.post(buildUrl('/users/refresh-tokens'))
  pushAuthDebug({
    event: 'refresh-response',
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
  })
  console.info(`${authDebugPrefix} refresh-tokens response`, {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
  })

  if (response.status === 401) {
    return false
  }

  return response.status >= 200 && response.status < 300
}

const ensureOkResponse = <T>(status: number, data: T): T => {
  if (status < 200 || status >= 300) {
    const kind = status === 401 ? 'auth' : status === 400 || status === 422 ? 'validation' : 'http'
    const backendMessage = getBackendMessage(data)
    throw new ApiError(status, backendMessage || `Request failed with status ${status}`, data, {
      source: 'api',
      kind,
      userMessage: resolveUserMessage({
        kind,
        status,
        backendMessage,
      }),
    })
  }

  return data
}

const request = async <T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { body, retryUnauthorized = true, headers, ...restOptions } = options

  const config: AxiosRequestConfig = {
    ...restOptions,
    method,
    url: buildUrl(path),
    data: body,
    headers,
    withCredentials: true,
    validateStatus: () => true,
  }

  try {
    const response = await requestClient.request<T>(config)
    pushAuthDebug({
      event: 'request-response',
      method,
      path,
      status: response.status,
    })
    console.info(`${authDebugPrefix} request response`, {
      method,
      path,
      status: response.status,
    })

    if (response.status === 401) {
      pushAuthDebug({
        event: 'request-401',
        method,
        path,
        retryUnauthorized,
      })
      console.warn(`${authDebugPrefix} received 401`, {
        method,
        path,
        retryUnauthorized,
      })
      if (retryUnauthorized) {
        const didRefresh = await refreshSession()
        pushAuthDebug({
          event: 'refresh-completed',
          method,
          path,
          didRefresh,
        })
        console.info(`${authDebugPrefix} refresh attempt completed`, {
          method,
          path,
          didRefresh,
        })

        if (didRefresh) {
          const retryResponse = await requestClient.request<T>(config)
          pushAuthDebug({
            event: 'retry-response',
            method,
            path,
            status: retryResponse.status,
          })
          console.info(`${authDebugPrefix} retry response`, {
            method,
            path,
            status: retryResponse.status,
          })
          if (retryResponse.status !== 401) {
            if (retryResponse.status === 204) {
              return undefined as T
            }

            return ensureOkResponse<T>(retryResponse.status, retryResponse.data as T)
          }
        }
      }

      handleUnauthorized()
      throw new ApiError(401, 'Unauthorized')
    }

    if (response.status === 204) {
      return undefined as T
    }

    return ensureOkResponse<T>(response.status, response.data as T)
  } catch (error) {
    throw toApiError(error, {
      source: 'api',
      operation: `${method} ${path}`,
      endpoint: buildUrl(path),
    })
  }
}

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, 'body'> = {}) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'body'> = {}) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'body'> = {}) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'body'> = {}) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options: RequestOptions = {}) => request<T>('DELETE', path, options),
}

export { ApiError }
