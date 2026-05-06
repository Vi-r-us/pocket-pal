import { create } from 'zustand'

type ActiveOverlay = string | null

type UIStore = {
  isSidebarOpen: boolean
  activeModal: ActiveOverlay
  activeDrawer: ActiveOverlay
  setSidebarOpen: (isOpen: boolean) => void
  toggleSidebar: () => void
  setActiveModal: (modal: ActiveOverlay) => void
  setActiveDrawer: (drawer: ActiveOverlay) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  isSidebarOpen: true,
  activeModal: null,
  activeDrawer: null,
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setActiveDrawer: (drawer) => set({ activeDrawer: drawer }),
}))
