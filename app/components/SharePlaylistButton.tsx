"use client"

import { useState } from "react"
import { useI18n } from "./UiText"

export default function SharePlaylistButton() {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)

    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleShare}
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        🔗 {t("Podeli")}
      </button>

      {copied && (
        <div className="absolute top-8 left-0 bg-black border border-gray-700 px-3 py-2 rounded text-xs whitespace-nowrap shadow-lg">
          {t("Link playliste je kopiran")} 🎵
        </div>
      )}
    </div>
  )
}
