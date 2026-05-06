import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * The AppTheme type
 * @param light - The light theme
 * @param dark - The dark theme
 * @param system - The system theme
 */
export type AppTheme = 'light' | 'dark' | 'system'

/**
 * The PrefsStore type
 * @param displayCurrency - The display currency
 * @param theme - The theme of the app
 * @param setDisplayCurrency - The function to set the display currency
 * @param setTheme - The function to set the theme
 */
type PrefsStore = {
  displayCurrency: string
  theme: AppTheme
  setDisplayCurrency: (currency: string) => void
  setTheme: (theme: AppTheme) => void
}

/**
 * The usePrefsStore hook
 * @returns The prefs store
 */
export const usePrefsStore = create<PrefsStore>()(
  persist(
    (set) => ({
      displayCurrency: 'INR',
      theme: 'system',
      setDisplayCurrency: (currency) => set({ displayCurrency: currency }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'prefs-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
