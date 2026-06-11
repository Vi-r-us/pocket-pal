import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

type PageHeaderControlsContextValue = {
  headerControls: ReactNode | null
  setHeaderControls: (controls: ReactNode | null) => void
}

const PageHeaderControlsContext =
  createContext<PageHeaderControlsContextValue | null>(null)

export const PageHeaderControlsProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [headerControls, setHeaderControlsState] = useState<ReactNode | null>(
    null,
  )

  const setHeaderControls = useCallback((controls: ReactNode | null) => {
    setHeaderControlsState(controls)
  }, [])

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

export const usePageHeaderControls = (controls: ReactNode | null) => {
  const { setHeaderControls } = usePageHeaderControlsContext()

  useEffect(() => {
    setHeaderControls(controls)
    return () => {
      setHeaderControls(null)
    }
  }, [controls, setHeaderControls])
}
