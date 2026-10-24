import { english } from "./messages"

export type Locale = "sr" | "en"
export const LOCALE_KEY = "gitarakordi-language"
export const LOCALE_EVENT = "gitarakordi-language-change"
export const normalizeLocale = (value: unknown): Locale => value === "en" ? "en" : "sr"
export const LOCALE_INIT_SCRIPT = `(function(){var l="sr";try{if(localStorage.getItem("${LOCALE_KEY}")==="en")l="en"}catch(e){}document.documentElement.dataset.language=l;document.documentElement.lang=l==="sr"?"sr-Latn":"en"})()`

export function translate(locale: Locale, source: string, values: Record<string, string | number> = {}) {
  const text = locale === "en" && Object.hasOwn(english, source) ? english[source] : source
  return text.replace(/\{(\w+)\}/g, (match, key: string) => Object.hasOwn(values, key) ? String(values[key]) : match)
}
export const currentLocale = (): Locale => normalizeLocale(document.documentElement.dataset.language)
export function applyLocale(locale: Locale, persist = true) {
  const value = normalizeLocale(locale)
  document.documentElement.dataset.language = value
  document.documentElement.lang = value === "sr" ? "sr-Latn" : "en"
  if (persist) { try { localStorage.setItem(LOCALE_KEY, value) } catch {} }
  window.dispatchEvent(new Event(LOCALE_EVENT))
}
export function subscribeLocale(notify: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === LOCALE_KEY || event.key === null) {
      let value = event.newValue
      if (event.key === null) { try { value = localStorage.getItem(LOCALE_KEY) } catch {} }
      applyLocale(normalizeLocale(value), false)
    }
  }
  window.addEventListener(LOCALE_EVENT, notify)
  window.addEventListener("storage", storage)
  return () => { window.removeEventListener(LOCALE_EVENT, notify); window.removeEventListener("storage", storage) }
}
