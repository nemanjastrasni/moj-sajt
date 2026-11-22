"use client"
import Link from "next/link"
import type { ComponentProps } from "react"
import { localizedHref } from "@/lib/i18n/routes"
import { useI18n } from "./UiText"

export default function LocalizedLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { locale } = useI18n()
  return <Link {...props} href={localizedHref(href, locale === "en" ? "en" : "sr")} />
}
