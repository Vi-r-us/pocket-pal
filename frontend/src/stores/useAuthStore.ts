import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * The AuthUser type
 * @param [key: string]: unknown - The key of the user object
 */
export type AuthUser = Record<string, unknown>

/**
 * The AuthStore type
 * @param user - The user object
 * @param isAuthenticated - Whether the user is authenticated
 * @param setUser - The function to set the user
 * @param clearUser - The function to clear the user
 */
type AuthStore = {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser) => void
  clearUser: () => void
}

/**
 * The useAuthStore hook
 * @returns The auth store
 */
export const useAuthStore = create<AuthStore>()(
  persist(  
    (set) => ({
      user: null,
      isAuthenticated: false,
      // isAuthenticated: true,
      setUser: (user) => {
        set({
          user,
          isAuthenticated: true,
        })
      },
      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
