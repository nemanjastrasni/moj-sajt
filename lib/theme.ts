export type SiteTheme = "dark" | "light"
export const THEME_KEY = "gitarakordi-theme"
export const THEME_EVENT = "gitarakordi-theme-change"

export function normalizeTheme(value: unknown): SiteTheme { return value === "light" ? "light" : "dark" }

// Runs before the first paint, independent of React hydration or database access.
export const THEME_INIT_SCRIPT = `(function(){var t="dark";try{if(localStorage.getItem("${THEME_KEY}")==="light")t="light"}catch(e){}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t})()`

export function currentTheme(): SiteTheme { return normalizeTheme(document.documentElement.dataset.theme) }

export function applyTheme(theme: SiteTheme, persist = true) {
  const value = normalizeTheme(theme)
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
  if (persist) { try { localStorage.setItem(THEME_KEY, value) } catch {} }
  window.dispatchEvent(new Event(THEME_EVENT))
}

export function subscribeTheme(notify: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === null) {
      let value: string | null = event.newValue
      if (event.key === null) { try { value = localStorage.getItem(THEME_KEY) } catch {} }
      applyTheme(normalizeTheme(value), false)
    }
  }
  window.addEventListener(THEME_EVENT, notify)
  window.addEventListener("storage", storage)
  return () => { window.removeEventListener(THEME_EVENT, notify); window.removeEventListener("storage", storage) }
}
