"use client"

import { useState } from "react"

export default function BioText({ text }: { text: string }) {
  const [open, setOpen] = useState(false)

  const short = text.slice(0, 300)

  return (
    <div style={{ whiteSpace: "pre-line" }}>
      {open ? text : short + (text.length > 300 ? "..." : "")}

      {text.length > 300 && (
        <div
          onClick={() => setOpen(!open)}
          style={{
            marginTop: "10px",
            cursor: "pointer",
            color: "#3b82f6"
          }}
        >
          {open ? "Sakrij" : "Pročitaj više"}
        </div>
      )}
    </div>
  )
}