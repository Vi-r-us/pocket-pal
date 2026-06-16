import { useEffect, useState } from "react"

export const useResponsiveTableView = () => {
  const [isMobileTableView, setIsMobileTableView] = useState(false)
  const [isTabletTableView, setIsTabletTableView] = useState(false)

  useEffect(() => {
    const updateResponsiveTableView = () => {
      const viewportWidth = window.innerWidth
      setIsMobileTableView(viewportWidth < 768)
      setIsTabletTableView(viewportWidth >= 768 && viewportWidth < 1024)
    }
    updateResponsiveTableView()
    window.addEventListener("resize", updateResponsiveTableView)
    return () => {
      window.removeEventListener("resize", updateResponsiveTableView)
    }
  }, [])

  return { isMobileTableView, isTabletTableView }
}
