"use client"

import { useRouter, usePathname } from "next/navigation"

export default function BackButton() {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === "/") return null

  return (
    <button
      onClick={() => router.back()}
      className="
        group flex items-center gap-2
        px-4 py-2
        rounded-full
        bg-white/10
        backdrop-blur
        border border-white/20
        text-gray-300
        hover:text-white
        hover:bg-white/20
        transition-all duration-200
        shadow-md
      "
    >
      <span className="text-lg group-hover:-translate-x-1 transition-transform">
        ←
      </span>
      <span className="text-sm tracking-wide">
        Nazad
      </span>
    </button>
  )
}