import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toAppError } from '@/lib/errors/normalize'
import { reportError } from '@/lib/errors/reporter'

export function handleQueryError(error: unknown, queryKey?: readonly unknown[]): void {
  const appError = toAppError(error, {
    source: 'react-query',
    operation: 'query',
    fallbackMessage: 'Could not load data. Please try again.',
  })

  if (appError.shape.status === 401) {
    return
  }

  reportError(appError, {
    source: 'react-query',
    operation: `query:${JSON.stringify(queryKey ?? [])}`,
  })
}

export function handleMutationError(error: unknown, mutationKey?: readonly unknown[]): void {
  const appError = toAppError(error, {
    source: 'react-query',
    operation: 'mutation',
    fallbackMessage: 'Could not complete the action. Please try again.',
  })

  if (appError.shape.status === 401) {
    return
  }

  reportError(appError, {
    source: 'react-query',
    operation: `mutation:${JSON.stringify(mutationKey ?? [])}`,
  })
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => handleQueryError(error, query.queryKey),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => handleMutationError(error, mutation.options.mutationKey),
    }),
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,
        retry: 1,
      },
    },
  })
}
