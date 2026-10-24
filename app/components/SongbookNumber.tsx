"use client"
import { useState } from "react"

export default function SongbookNumber({ value, min, max, onChange, className, label, disabled }: {
  value: number; min: number; max: number; onChange: (value: number) => void; className: string; label?: string; disabled?: boolean
}) {
  const [editing, setEditing] = useState<string | null>(null)
  return <input type="number" min={min} max={max} step={1} className={className} aria-label={label} disabled={disabled} value={editing ?? value}
    onFocus={() => setEditing(String(value))}
    onChange={event => {
      const raw = event.target.value
      setEditing(raw)
      const number = Number(raw)
      if (raw !== "" && Number.isInteger(number) && number >= min && number <= max) onChange(number)
    }}
    onBlur={() => {
      if (editing?.trim()) { const number = Number(editing); if (Number.isFinite(number)) onChange(Math.min(max, Math.max(min, Math.round(number)))) }
      setEditing(null)
    }} />
}
