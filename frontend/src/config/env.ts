type AppMode = 'development' | 'test' | 'production'
type AppEnvironment = 'development' | 'preview' | 'production'

type AppEnvConfig = {
  apiUrl: string
  apiPrefix: string
  errorReportUrl: string
}

const currentMode = (import.meta.env.MODE || 'development') as AppMode

const modeDefaults: Record<AppMode, AppEnvConfig> = {
  development: {
    apiUrl: '',
    apiPrefix: 'api/v1',
    errorReportUrl: '',
  },
  test: {
    apiUrl: '',
    apiPrefix: 'api/v1',
    errorReportUrl: '',
  },
  production: {
    apiUrl: '',
    apiPrefix: 'api/v1',
    errorReportUrl: '',
  },
}

const normalizeApiPrefix = (value: string) =>
  value.replaceAll(/^\/+|\/+$/g, '')

const normalizeAppEnvironment = (
  envValue: string | undefined,
  mode: AppMode,
): AppEnvironment => {
  const normalized = (envValue ?? '').trim().toLowerCase()

  if (normalized === 'production' || normalized === 'prod') {
    return 'production'
  }

  if (
    normalized === 'preview' ||
    normalized === 'staging' ||
    normalized === 'stage' ||
    normalized === 'test' ||
    normalized === 'testing'
  ) {
    return 'preview'
  }

  if (normalized === 'development' || normalized === 'dev' || normalized === 'local') {
    return 'development'
  }

  if (mode === 'production') {
    return 'production'
  }

  if (mode === 'test') {
    return 'preview'
  }

  return 'development'
}

const defaults = modeDefaults[currentMode]
const appEnvironment = normalizeAppEnvironment(import.meta.env.VITE_APP_ENV, currentMode)

export const appEnv = {
  environment: appEnvironment,
  mode: currentMode,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  isDevelopment: appEnvironment === 'development',
  isPreview: appEnvironment === 'preview',
  isProduction: appEnvironment === 'production',
  apiUrl: (import.meta.env.VITE_API_URL ?? defaults.apiUrl)
    .trim()
    .replace(/\/+$/, ''),
  apiPrefix: normalizeApiPrefix(
    (import.meta.env.VITE_API_PREFIX ?? defaults.apiPrefix).trim() || 'api/v1',
  ),
  errorReportUrl: (
    import.meta.env.VITE_ERROR_REPORT_URL ?? defaults.errorReportUrl
  ).trim(),
} as const
