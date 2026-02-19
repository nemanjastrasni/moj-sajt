import Link from "next/link"
import { songs, Song } from "../../../lib/data/songs"

export default function ArtistPage({
  params,
}: {
  params: { category: string; artist: string }
}) {
  const artistSongs: Song[] = songs
    .filter((song: Song) => {
      return (
        song.category === params.category &&
        song.artist === params.artist
      )
    })
    .sort((a: Song, b: Song) =>
      a.title.localeCompare(b.title, "sr-Latn", {
        sensitivity: "base",
      })
    )

  if (artistSongs.length === 0) {
    return <h1>Nema pesama</h1>
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "30px" }}>
        {artistSongs[0].artistFull}
      </h1>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {artistSongs.map((song: Song) => (
          <li key={song.id} style={{ marginBottom: "12px" }}>
            <Link
              href={`/pesme/${params.category}/${params.artist}/${song.id}`}
              style={{
                textDecoration: "none",
                color: "#222",
                fontSize: "18px",
              }}
            >
              {song.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
