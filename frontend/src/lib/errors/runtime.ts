import { reportError } from '@/lib/errors/reporter'

let teardownRuntimeHandlers: (() => void) | null = null

export function installGlobalRuntimeErrorHandlers(): () => void {
  if (teardownRuntimeHandlers) {
    return teardownRuntimeHandlers
  }

  const handleWindowError = (event: ErrorEvent) => {
    reportError(event.error ?? new Error(event.message), {
      source: 'runtime',
      operation: 'window.onerror',
      fallbackMessage: 'Something went wrong in the app. Please reload and try again.',
    })
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, {
      source: 'runtime',
      operation: 'window.onunhandledrejection',
      fallbackMessage: 'Something went wrong in the app. Please reload and try again.',
    })
  }

  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  teardownRuntimeHandlers = () => {
    window.removeEventListener('error', handleWindowError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    teardownRuntimeHandlers = null
  }

  return teardownRuntimeHandlers
}
