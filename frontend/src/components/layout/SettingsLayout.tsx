import { Outlet, useLocation } from "react-router-dom"
import { SettingsNav } from "@/components/settings/SettingsNav"
import { GridItem } from "@/components/layout/GridItem"
import { Panel } from "@/components/layout/Panel"

const isSettingsLandingRoute = (pathname: string) => pathname === "/settings" || pathname === "/settings/"
const isSettingsFullPageRoute = (pathname: string) =>
  pathname === "/settings/import-data" || pathname === "/settings/import-data/"

export const SettingsLayout = () => {
  const location = useLocation()

  if (isSettingsLandingRoute(location.pathname) || isSettingsFullPageRoute(location.pathname)) {
    return (
      <GridItem span={12}>
        <Outlet />
      </GridItem>
    )
  }

  return (
    <>
      <GridItem span={12} mdSpan={4} lgSpan={2} className="hidden md:block">
        <Panel
          tone="card"
          padding="sm"
          title="Settings"
          description="Navigate profile, security, and app controls"
        >
          <SettingsNav variant="rail" />
        </Panel>
      </GridItem>

      <GridItem span={12} mdSpan={8} lgSpan={10}>
        <Outlet />
      </GridItem>
    </>
  )
}
