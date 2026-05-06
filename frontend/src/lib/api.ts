import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type RequestOptions = Omit<AxiosRequestConfig, 'url' | 'method' | 'data' | 'withCredentials'> & {
  body?: unknown
  retryUnauthorized?: boolean
  headers?: Record<string, string>
}

class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

const buildUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_URL}${normalizedPath}`
}

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 500
    const message = error.message || `Request failed with status ${status}`
    return new ApiError(status, message, error.response?.data)
  }

  return new ApiError(500, 'Unexpected request error')
}

const handleUnauthorized = () => {
  useAuthStore.getState().clearUser()

  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
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
  const response = await refreshClient.post(buildUrl('/users/refresh-tokens'))

  if (response.status === 401) {
    return false
  }

  return response.status >= 200 && response.status < 300
}

const ensureOkResponse = <T>(status: number, data: T): T => {
  if (status < 200 || status >= 300) {
    throw new ApiError(status, `Request failed with status ${status}`, data)
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

    if (response.status === 401) {
      if (retryUnauthorized) {
        const didRefresh = await refreshSession()

        if (didRefresh) {
          const retryResponse = await requestClient.request<T>(config)
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
    throw toApiError(error)
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
