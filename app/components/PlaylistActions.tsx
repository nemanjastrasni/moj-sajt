"use client"

import { useState } from "react"

export default function PlaylistActions({ id, name }: any) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [value, setValue] = useState(name)

  return (
    <>
      {/* ✏️ RENAME BUTTON */}
      <button onClick={() => setRenameOpen(true)}>
        ✏️
      </button>

      {/* 🗑 DELETE BUTTON */}
      <button onClick={() => setDeleteOpen(true)}>
        🗑
      </button>

      {/* 🔥 RENAME MODAL */}
      {renameOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 rounded-xl border border-gray-700 w-[320px]">

            <h2 className="text-white mb-3">Novo ime</h2>

            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2 mb-4 bg-black border border-gray-700 text-white rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameOpen(false)}
                className="px-3 py-1 bg-gray-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!value.trim()) return

                  await fetch("/api/playlist", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      playlistId: id,
                      name: value,
                    }),
                  })

                  setRenameOpen(false)
                  location.reload()
                }}
                className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600"
              >
                Sačuvaj
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🔥 DELETE MODAL */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 rounded-xl border border-gray-700 w-[320px]">

            <h2 className="text-white mb-4">
              Obriši playlistu?
            </h2>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-3 py-1 bg-gray-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  await fetch("/api/playlist", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      playlistId: id,
                    }),
                  })

                  setDeleteOpen(false)
                  location.reload()
                }}
                className="px-3 py-1 bg-red-500 rounded hover:bg-red-600"
              >
                Obriši
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}