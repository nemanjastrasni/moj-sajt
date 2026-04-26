import { prisma } from "@/lib/prisma"
import PlaylistPlayer from "@/app/components/PlaylistPlayer"
import SharePlaylistButton from "@/app/components/SharePlaylistButton"

export default async function Page({ params }: any) {
  await prisma.listeningPlaylist.update({
    where: { id: params.id },
    data: {
      views: {
        increment: 1,
      },
    },
  })

  const playlist = await prisma.listeningPlaylist.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      category: true,
      user: true,
      items: {
        orderBy: {
          order: "asc",
        },
      },
    },
  })

  if (!playlist) {
    return <div className="p-10 text-white">Ne postoji</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-white">

      <form
  action={`/api/listening-playlist/${playlist.id}/rename`}
  method="POST"
  className="flex gap-2 mb-6"
>
  <input
    name="name"
    defaultValue={playlist.name}
    className="text-2xl font-bold bg-transparent border-b border-gray-600 outline-none"
  />
  <select
  name="category"
  defaultValue={playlist.category ?? "Mix"}
  className="p-2 rounded bg-black border border-gray-700"
>
  <option value="Domace">Domaće</option>
  <option value="Strane">Strane</option>
  <option value="Narodne">Narodne</option>
  <option value="Mix">Mix</option>
</select>

  <button className="text-sm text-green-400">
    Save
  </button>
  <SharePlaylistButton />
</form>

      {/* ADD ITEM */}
      <form
  action={`/api/listening-playlist/item`}
  method="POST"
  className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6"
>
        <input type="hidden" name="playlistId" value={playlist.id} />

        <input
          name="url"
          placeholder="YouTube link"
          required
          className="flex-1 p-3 rounded bg-black border border-gray-700 min-w-0"
        />

        <button className="bg-white text-black px-4 py-2 rounded">
          + Dodaj
        </button>
      </form>

      {/* PLAYER + ITEMS */}
      <PlaylistPlayer playlist={playlist} />
      

    </div>
  )
}