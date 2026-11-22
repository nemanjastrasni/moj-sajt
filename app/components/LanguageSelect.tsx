"use client"

import { Languages } from "lucide-react"
import { applyLocale, normalizeLocale } from "@/lib/i18n"
import { useI18n } from "./UiText"
import { usePathname, useRouter } from "next/navigation"
import { localizedHref } from "@/lib/i18n/routes"

export default function LanguageSelect() {
  const { locale, t } = useI18n(), pathname = usePathname(), router = useRouter()
  return <label className="language-select" title={t("Jezik")}>
    <Languages size={17} aria-hidden="true" />
    <span className="sr-only">{t("Jezik")}</span>
    <select value={locale} onChange={event => {
      const next = normalizeLocale(event.target.value)
      const target = localizedHref(pathname ?? "", next)
      if (target && target !== pathname) router.push(target + window.location.search + window.location.hash, { scroll: false })
      else applyLocale(next)
    }}>
      <option value="sr" lang="sr-Latn">Srpski</option><option value="en" lang="en">English</option>
    </select>
  </label>
}
