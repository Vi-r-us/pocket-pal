import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toAppError } from '@/lib/errors/normalize'
import { reportError } from '@/lib/errors/reporter'
import type { AppError } from '@/lib/errors/classes'

type AppErrorBoundaryProps = {
  children: React.ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
  error: AppError | null
}

export function AppCrashFallback(props: {
  error: AppError
  onRetry: () => void
  onGoHome: () => void
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-lg border bg-card p-6">
        <div className="inline-flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">{props.error.shape.userMessage}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={props.onRetry}>
            Reload app
          </Button>
          <Button type="button" variant="outline" onClick={props.onGoHome}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      error: toAppError(error, {
        source: 'runtime',
        fallbackMessage: 'Something went wrong in the app. Please reload and try again.',
      }),
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    reportError(error, {
      source: 'runtime',
      operation: 'react-error-boundary',
      fallbackMessage: errorInfo.componentStack,
    })
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <AppCrashFallback
          error={this.state.error}
          onRetry={() => window.location.reload()}
          onGoHome={() => window.location.assign('/dashboard')}
        />
      )
    }

    return this.props.children
  }
}
