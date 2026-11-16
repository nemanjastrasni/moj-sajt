"use client"

import { SessionProvider } from "next-auth/react"
import { BackNavigationProvider } from "./components/BackNavigation"
import { EngagementProvider } from "./components/Engagement"
import { MusicProvider } from "./components/MusicContext"
import { AppInstallProvider } from "./components/AppInstall"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider><BackNavigationProvider><EngagementProvider><MusicProvider><AppInstallProvider>{children}</AppInstallProvider></MusicProvider></EngagementProvider></BackNavigationProvider></SessionProvider>
}
