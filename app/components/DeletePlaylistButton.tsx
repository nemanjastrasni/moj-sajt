"use client"

export default function DeletePlaylistButton({ id }: { id: string }) {
  return (
    <button
      onClick={async () => {
        if (!confirm("Obrisati playlistu?")) return

        await fetch(`/api/listening-playlist/${id}`, {
          method: "DELETE",
        })

        window.location.reload()
      }}
      className="text-red-500 hover:text-red-400 ml-4"
    >
      🗑
    </button>
  )
}