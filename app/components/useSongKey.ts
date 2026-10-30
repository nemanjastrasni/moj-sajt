"use client"
import { useState } from "react"

export default function useSongKey(songId: string) {
  const [value, setValue] = useState({ songId, transpose: 0 })
  const transpose = value.songId === songId ? value.transpose : 0
  function change(next: number | ((current: number) => number)) {
    setValue(current => {
      const proposed = typeof next === "function" ? next(current.songId === songId ? current.transpose : 0) : next
      return { songId, transpose: Number.isInteger(proposed) ? Math.max(-11, Math.min(11, proposed)) : 0 }
    })
  }
  return { transpose, change, controlsDisabled: false, phase: "ready", error: "", reload: async () => {} }
}
