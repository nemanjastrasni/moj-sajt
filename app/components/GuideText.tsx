"use client"

import { useI18n } from "./UiText"
import type { GuideText as Text } from "@/lib/guitarGuides"

export default function GuideText({ text }: { text: Text }) {
  const { locale } = useI18n()
  return <>{text[locale]}</>
}
