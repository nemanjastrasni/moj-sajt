import UiText, { CategoryLabel, UiInput } from "@/app/components/UiText"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import DeletePlaylistButton from "../components/DeletePlaylistButton"

export const dynamic = "force-dynamic"
export default async function ListeningPlaylistsPage() {

  const playlists = await prisma.listeningPlaylist.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-white">

      <h1 className="text-3xl font-bold text-center mb-10 tracking-wide">
        🎧 <UiText text="Moje plejliste za slušanje" />
      </h1>

      <p className="text-sm text-gray-400 mb-3 text-center">
        <UiText text="Prvo kreiraj playlistu, pa dodaj pesme unutar nje" />
      </p>

      {/* CREATE PLAYLIST */}
      <form
        action="/api/listening-playlist"
        method="POST"
        className="flex min-w-0 flex-col gap-2 mb-8 sm:flex-row"
       >
        <UiInput
          name="name"
          placeholder="Ime nove playliste..."
          required
          className="min-w-0 flex-1 p-2 rounded bg-black border border-gray-700"
        />
        <select
  name="category"
  defaultValue="Mix"
  className="p-2 rounded bg-black border border-gray-700"
>
  <option value="Domace"><UiText text="Zabavne" /></option>
  <option value="Strane"><UiText text="Strane" /></option>
  <option value="Narodne"><UiText text="Narodne" /></option>
  <option value="Mix"><UiText text="Mix" /></option>
</select>
        <button
          type="submit"
          className="bg-white text-black px-4 py-2 rounded"
        >
          <UiText text="+ Kreiraj" />
        </button>
      </form>

      {/* LISTA */}
      <div className="grid gap-4">

        {playlists.length === 0 && (
          <p className="text-gray-400 text-center">
            <UiText text="Nemaš još playliste" />
          </p>
        )}

        {playlists.map((pl) => (
          <div
            key={pl.id}
            className="p-4 rounded-lg border border-gray-800 hover:bg-white/5 transition flex justify-between items-center"
          >
            
            {/* LEVI DEO (klikabilan) */}
            <Link href={`/listening-playlist/${pl.id}`} className="flex-1 pr-10">
              <div>
                <div className="text-lg font-semibold">
                  🎧 {pl.name}
                </div>

                <div className="text-sm text-gray-400">
  {pl.items.length} <UiText text="pesama" /> • <CategoryLabel value={pl.category || "Mix"} />
</div>
              </div>
            </Link>

            {/* DESNI DEO (DELETE dugme) */}
            <DeletePlaylistButton id={pl.id} />

          </div>
        ))}

      </div>

    </div>
  )
}
