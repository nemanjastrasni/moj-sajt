"use client"

import { useSyncExternalStore, type InputHTMLAttributes } from "react"
import { currentLocale, subscribeLocale, translate } from "@/lib/i18n"
import { getCategoryLabel } from "@/lib/categories"

const serverLocale = () => "sr" as const
export function useI18n() {
  const locale = useSyncExternalStore(subscribeLocale, currentLocale, serverLocale)
  return { locale, t: (source: string, values?: Record<string, string | number>) => translate(locale, source, values) }
}
export default function UiText({ text, values }: { text: string; values?: Record<string, string | number> }) {
  const { t } = useI18n()
  return <>{t(text, values)}</>
}
export function CategoryLabel({ value }: { value?: string | null }) {
  const { locale } = useI18n()
  return <>{getCategoryLabel(value, locale)}</>
}
export function UiDate({ iso }: { iso: string }) {
  const { locale } = useI18n()
  return <>{new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "sr-Latn", { timeZone: "Europe/Belgrade" })}</>
}
export function UiInput({ placeholder, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useI18n()
  return <input {...props} placeholder={placeholder ? t(placeholder) : undefined} />
}
