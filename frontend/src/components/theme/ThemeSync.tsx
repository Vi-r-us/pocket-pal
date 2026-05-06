import { useEffect } from 'react'
import type { AppTheme } from '@/stores/usePrefsStore'
import { usePrefsStore } from '@/stores/usePrefsStore'

const applyThemeClass = (theme: AppTheme) => {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark)

  root.classList.toggle('dark', shouldUseDark)
}

export const ThemeSync = () => {
  const theme = usePrefsStore((state) => state.theme)

  useEffect(() => {
    applyThemeClass(theme)

    if (theme !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyThemeClass('system')

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return null
}
