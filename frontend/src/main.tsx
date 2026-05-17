import { StrictMode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { ThemeSync } from '@/components/theme/ThemeSync'
import { Toaster } from '@/components/ui/sonner'
import { installGlobalRuntimeErrorHandlers } from '@/lib/errors/runtime'
import { createAppQueryClient } from '@/lib/queryClient'

installGlobalRuntimeErrorHandlers()

const queryClient = createAppQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeSync />
          <App />
          <Toaster richColors />
        </QueryClientProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
