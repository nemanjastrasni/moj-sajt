"use client"

import { useState } from "react"

export default function PlaylistModal({
  open,
  onClose,
  onSubmit,
  title = "Naziv playliste",
  defaultValue = "",
}: {
  open: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  title?: string
  defaultValue?: string
}) {
  const [value, setValue] = useState(defaultValue)

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-neutral-900 p-6 rounded-xl w-[320px] border border-gray-700">
        
        <h2 className="text-white mb-3">{title}</h2>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full p-2 rounded bg-black border border-gray-700 text-white mb-4"
          placeholder="Unesi ime..."
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              if (!value.trim()) return
              onSubmit(value)
              onClose()
            }}
            className="px-3 py-1 text-sm bg-blue-500 rounded hover:bg-blue-600"
          >
            OK
          </button>
        </div>

      </div>
    </div>
  )
}