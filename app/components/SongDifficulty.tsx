"use client"

import { difficultyExplanation, difficultyLabels, type Difficulty } from "@/lib/music/difficulty"
import { useI18n } from "./UiText"

export default function SongDifficulty({ level }: { level: Difficulty | null }) {
  const { t } = useI18n()
  return <span title={t(difficultyExplanation)}>{t(level ? difficultyLabels[level] : "Nije procenjeno")}{level ? " *" : ""}</span>
}
