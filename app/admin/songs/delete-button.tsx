"use client"

export default function DeleteSongButton({ id }: { id: string }) {
  async function handleDelete() {
    if (!confirm("Obrisati pesmu?")) return

    await fetch(`/api/admin/songs/${id}`, {
      method: "DELETE",
    })

    location.reload()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:underline"
    >
      Delete
    </button>
  )
}