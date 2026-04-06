"use client"

export default function PlaylistActions({ id, name }: any) {
  return (
    <>
      <button
        onClick={async () => {
          const newName = prompt("Novo ime:", name)
          if (!newName) return

          await fetch("/api/playlist", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playlistId: id,
              name: newName,
            }),
          })

          location.reload()
        }}
      >
        ✏️
      </button>

      <button
        onClick={async () => {
          if (!confirm("Obriši playlistu?")) return

          await fetch("/api/playlist", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playlistId: id,
            }),
          })

          location.reload()
        }}
      >
        🗑
      </button>
    </>
  )
}