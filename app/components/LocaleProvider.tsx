"use client"
import { createContext, useEffect, useSyncExternalStore, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { applyLocale, currentLocale, subscribeLocale, type Locale } from "@/lib/i18n"
import { routeLocale } from "@/lib/i18n/routes"

export const RouteLocaleContext = createContext<Locale | null>(null)
const defaultLocale = () => "sr" as const
export default function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname(), forced = routeLocale(pathname ?? "")
  const stored = useSyncExternalStore(subscribeLocale, currentLocale, defaultLocale)
  // The URL determines translated pages on the server as well as in the browser.
  useEffect(() => { if (forced) applyLocale(forced) }, [forced])
  useEffect(() => { if (forced && stored !== forced) applyLocale(forced, false) }, [forced, stored])
  return <RouteLocaleContext.Provider value={forced}>{children}</RouteLocaleContext.Provider>
}
