"use client"

import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { applyTheme, currentTheme, subscribeTheme } from "@/lib/theme"

const serverTheme = () => "dark" as const

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme)
  const light = theme === "light"
  return <button type="button" role="switch" aria-checked={light} aria-label="Svetla tema"
    title={light ? "Ukljuci tamnu temu" : "Ukljuci svetlu temu"} onClick={() => applyTheme(light ? "dark" : "light")}
    className="theme-toggle" data-theme-toggle>
    <Moon size={17} aria-hidden="true" />
    <span aria-hidden="true" className="theme-toggle-track"><span className="theme-toggle-thumb" /></span>
    <Sun size={18} aria-hidden="true" />
  </button>
}
