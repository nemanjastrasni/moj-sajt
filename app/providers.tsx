"use client"

import { SessionProvider } from "next-auth/react"
import { BackNavigationProvider } from "./components/BackNavigation"
import { MusicProvider } from "./components/MusicContext"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider><BackNavigationProvider><MusicProvider>{children}</MusicProvider></BackNavigationProvider></SessionProvider>
}
