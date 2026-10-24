"use client"

import { useRouter } from "next/navigation"
import { useI18n } from "./UiText"

export default function DeletePlaylistButton({ id }: { id: string }) {
  const { t } = useI18n()
  const router = useRouter()

  const handleDelete = async () => {
  const res = await fetch(`/api/listening-playlist/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    alert(t("Greška pri brisanju"))
    return
  }

  window.location.reload()
}

  return (
    <button
  aria-label={t("Obriši")}
  onClick={(e) => {
    e.stopPropagation()
    handleDelete()
  }}
  className="text-red-500 hover:text-red-400 ml-4"
>
  🗑
</button>
  )
}
