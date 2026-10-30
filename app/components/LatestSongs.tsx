"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useI18n } from "./UiText"
import SiteImage from "./SiteImage"
import { isHomeSongList, type HomeSong } from "@/lib/homeSongs"
import { RefreshCw } from "lucide-react"

export default function LatestSongs() {
  const { t } = useI18n()

  const [songs, setSongs] = useState<HomeSong[]>([]), [error, setError] = useState(false), [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void fetch("/api/latest", { signal: controller.signal }).then(async response => {
      const data: unknown = await response.json()
      if (!response.ok || !isHomeSongList(data)) throw Error("unavailable")
      if (!controller.signal.aborted) { setSongs(data); setError(false) }
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [retry])

  return (
    <section className="theme-dark-surface theme-photo-band relative isolate w-full py-10">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <SiteImage
          name="latestBackground"
          sizes="(min-width: 1152px) 1120px, calc(100vw - 32px)"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-2xl font-bold mb-6 text-white">
          {t("Najnovije pesme")}
        </h2>

      {error && <p role="alert" className="mb-4 flex items-center gap-2 text-sm">{t("Pesme trenutno nisu dostupne. Poku\u0161aj ponovo.")}<button type="button" className="ui-button" title={t("Pokusaj ponovo")} aria-label={t("Pokusaj ponovo")} onClick={() => setRetry(value => value + 1)}><RefreshCw size={18} /></button></p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {songs.map((song) => (
            <Link
              key={song.id}
              href={"/pesme/" + [song.category, song.artist.slug, song.slug].map(encodeURIComponent).join("/")}
              className="block px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition"
            >
              <div className="text-white text-sm font-medium">
                {song.title}
              </div>
              <div className="text-gray-400 text-xs">
                {song.artist.name}
              </div>
            </Link>
          ))}

        </div>

      </div>
    </section>
  )
}
