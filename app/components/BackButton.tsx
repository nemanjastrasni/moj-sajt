"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useI18n } from "./UiText"
import { useParentHref } from "./BackNavigation"

export default function BackButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const href = useParentHref(usePathname())

  if (!href) return null

  return (
    <Link
      href={href}
      aria-label={t("Nazad")}
      title={compact ? t("Nazad") : undefined}
      className={compact ? "mobile-header-icon mobile-header-back" : `
        group flex items-center gap-2
        px-4 py-2
        rounded-full
        bg-white/10
        backdrop-blur
        border border-white/20
        text-gray-300
        hover:text-white
        hover:bg-white/20
        transition-all duration-200
        shadow-md
      `}
    >
      <ArrowLeft size={18} aria-hidden="true" className="group-hover:-translate-x-1 transition-transform" />
      <span className={compact ? "sr-only" : "text-sm tracking-wide"}>
        {t("Nazad")}
      </span>
    </Link>
  )
}
