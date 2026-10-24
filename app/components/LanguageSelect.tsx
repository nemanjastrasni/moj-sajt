"use client"

import { Languages } from "lucide-react"
import { applyLocale, normalizeLocale } from "@/lib/i18n"
import { useI18n } from "./UiText"

export default function LanguageSelect() {
  const { locale, t } = useI18n()
  return <label className="language-select" title={t("Jezik")}>
    <Languages size={17} aria-hidden="true" />
    <span className="sr-only">{t("Jezik")}</span>
    <select value={locale} onChange={event => applyLocale(normalizeLocale(event.target.value))}>
      <option value="sr" lang="sr-Latn">Srpski</option><option value="en" lang="en">English</option>
    </select>
  </label>
}
