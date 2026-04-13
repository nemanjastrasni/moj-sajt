"use client"

import { useRouter } from "next/navigation"

export default function DeletePlaylistButton({ id }: { id: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    await fetch(`/api/listening-playlist/${id}`, {
      method: "DELETE",
    })

    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-500 hover:text-red-400"
    >
      🗑
    </button>
  )
}