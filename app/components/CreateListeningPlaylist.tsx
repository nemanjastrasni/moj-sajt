"use client"

import { useI18n } from "@/app/components/UiText"
import { useState } from "react"

export default function CreateListeningPlaylist() {
  const { t } = useI18n()

  const [name, setName] = useState("")

  const onSubmit = async (e: any) => {
    e.preventDefault()

    await fetch("/api/listening-playlist", {
      method: "POST",
      body: new URLSearchParams({ name }),
    })

    window.location.reload()
  }

  return (
    <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-2 mb-8 sm:flex-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("Ime playliste...")}
        className="min-w-0 flex-1 p-2 rounded bg-black border border-gray-700"
      />
      <button className="bg-white text-black px-4 py-2 rounded">
        {t("+ Kreiraj")}
      </button>
    </form>
  )
}
