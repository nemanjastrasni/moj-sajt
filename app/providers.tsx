"use client"

import { SessionProvider } from "next-auth/react"
import { BackNavigationProvider } from "./components/BackNavigation"
import { EngagementProvider } from "./components/Engagement"
import { MusicProvider } from "./components/MusicContext"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider><BackNavigationProvider><EngagementProvider><MusicProvider>{children}</MusicProvider></EngagementProvider></BackNavigationProvider></SessionProvider>
}
