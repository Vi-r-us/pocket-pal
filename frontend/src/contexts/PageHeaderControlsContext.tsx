import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { LucideIcon } from "lucide-react"

export type PageHeaderOverflowAction = {
  id: string
  label: string
  icon: LucideIcon
  onSelect: () => void
}

export type PageHeaderControlsConfig = {
  toolbar: ReactNode
  overflowActions?: PageHeaderOverflowAction[]
}

type PageHeaderControlsContextValue = {
  headerControls: PageHeaderControlsConfig | null
  setHeaderControls: (controls: PageHeaderControlsConfig | null) => void
}

const PageHeaderControlsContext =
  createContext<PageHeaderControlsContextValue | null>(null)

export const PageHeaderControlsProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [headerControls, setHeaderControlsState] =
    useState<PageHeaderControlsConfig | null>(null)

  const setHeaderControls = useCallback(
    (controls: PageHeaderControlsConfig | null) => {
      setHeaderControlsState(controls)
    },
    [],
  )

  return (
    <PageHeaderControlsContext.Provider
      value={{ headerControls, setHeaderControls }}
    >
      {children}
    </PageHeaderControlsContext.Provider>
  )
}

export const usePageHeaderControlsContext = () => {
  const context = useContext(PageHeaderControlsContext)
  if (!context) {
    throw new Error(
      "usePageHeaderControlsContext must be used within PageHeaderControlsProvider",
    )
  }
  return context
}

export const usePageHeaderControls = (
  controls: PageHeaderControlsConfig | null,
) => {
  const { setHeaderControls } = usePageHeaderControlsContext()

  useEffect(() => {
    setHeaderControls(controls)
    return () => {
      setHeaderControls(null)
    }
  }, [controls, setHeaderControls])
}
