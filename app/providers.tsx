"use client"

import { SessionProvider } from "next-auth/react"
import { BackNavigationProvider } from "./components/BackNavigation"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionProvider><BackNavigationProvider>{children}</BackNavigationProvider></SessionProvider>
}
