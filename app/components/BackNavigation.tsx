"use client"

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react"
import { activeParentHref, type ParentTarget } from "@/lib/navigation/parent"

type NavigationContext = {
  target: ParentTarget | null
  register: (target: ParentTarget) => void
  unregister: (owner: string) => void
}
const Context = createContext<NavigationContext | null>(null)

export function BackNavigationProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ParentTarget | null>(null)
  const register = useCallback((next: ParentTarget) => setTarget(next), [])
  const unregister = useCallback((owner: string) => setTarget(current => current?.owner === owner ? null : current), [])
  const value = useMemo(() => ({ target, register, unregister }), [target, register, unregister])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function BackNavigationTarget({ pathname, href }: { pathname: string; href: string }) {
  const owner = useId(), navigation = useContext(Context)
  const register = navigation?.register, unregister = navigation?.unregister
  useEffect(() => {
    if (!register || !unregister) return
    register({ pathname, href, owner })
    return () => unregister(owner)
  }, [pathname, href, owner, register, unregister])
  return null
}

export function useParentHref(pathname: string | null) {
  const navigation = useContext(Context)
  return activeParentHref(pathname, navigation?.target ?? null)
}
