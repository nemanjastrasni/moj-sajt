import { english } from "./messages"
import { pathLocales } from "./routes"

export type Locale = "sr" | "en"
export const LOCALE_KEY = "gitarakordi-language"
export const LOCALE_EVENT = "gitarakordi-language-change"
export const normalizeLocale = (value: unknown): Locale => value === "en" ? "en" : "sr"
export const LOCALE_INIT_SCRIPT = `(function(){var l="sr",p=typeof location==="object"?location.pathname.replace(/\\/$/,"")||"/":"",r=${JSON.stringify(pathLocales)};try{if(localStorage.getItem("${LOCALE_KEY}")==="en")l="en"}catch(e){}if(Object.prototype.hasOwnProperty.call(r,p))l=r[p];document.documentElement.dataset.language=l;document.documentElement.lang=l==="sr"?"sr-Latn":"en"})()`

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
const localeSubscribers = new Set<() => void>()
let stopLocaleEvents: (() => void) | null = null
const publishLocale = () => { for (const notify of [...localeSubscribers]) notify() }
function storageLocale(event: StorageEvent) {
  if (event.key === LOCALE_KEY || event.key === null) {
    let value = event.newValue
    if (event.key === null) { try { value = localStorage.getItem(LOCALE_KEY) } catch {} }
    applyLocale(normalizeLocale(value), false)
  }
}
export function subscribeLocale(notify: () => void) {
  // A song may render hundreds of translated controls. Share browser listeners;
  // one cross-tab storage event must trigger one broadcast, not one per control.
  if (!localeSubscribers.size) {
    const target = window
    target.addEventListener(LOCALE_EVENT, publishLocale)
    target.addEventListener("storage", storageLocale)
    stopLocaleEvents = () => { target.removeEventListener(LOCALE_EVENT, publishLocale); target.removeEventListener("storage", storageLocale) }
  }
  localeSubscribers.add(notify)
  let active = true
  return () => {
    if (!active) return
    active = false
    localeSubscribers.delete(notify)
    if (!localeSubscribers.size) { stopLocaleEvents?.(); stopLocaleEvents = null }
  }
}
