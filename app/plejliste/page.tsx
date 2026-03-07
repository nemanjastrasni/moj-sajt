import Link from "next/link"

const generated = [
  {
    slug: "easy-guitar",
    title: "Easy Guitar Songs",
    desc: "Jednostavne pesme za početnike na gitari"
  },
  {
    slug: "four-chords",
    title: "4 Chord Songs",
    desc: "Pesme koje koriste samo četiri akorda"
  },
  {
    slug: "acoustic",
    title: "Acoustic Songs",
    desc: "Pesme idealne za akustičnu gitaru"
  }
]

const genres = [
  { slug: "rock-70s", title: "Rock Songs 70s" },
  { slug: "rock-80s", title: "Rock Songs 80s" },
  { slug: "rock-90s", title: "Rock Songs 90s" },
  { slug: "pop-songs", title: "Pop Guitar Songs" },
  { slug: "blues-guitar", title: "Blues Guitar Songs" }
]

export default function PlaylistsPage() {
  return (
    <div className="max-w-5xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-10">
        Plejliste za gitaru
      </h1>

      {/* GENERISANE PLAYLISTE */}
      <section className="mb-12">

        <h2 className="text-xl font-semibold mb-4">
          🎸 Generisane playliste
        </h2>

        <div className="grid gap-4">

          {generated.map((p) => (
            <Link
              key={p.slug}
              href={`/plejliste/${p.slug}`}
              className="border p-5 rounded hover:bg-gray-100"
            >
              <div className="font-semibold">
                {p.title}
              </div>

              <div className="text-sm text-gray-500">
                {p.desc}
              </div>
            </Link>
          ))}

        </div>

      </section>

      {/* ZANR / ERA */}
      <section>

        <h2 className="text-xl font-semibold mb-4">
          🎵 Žanr i era
        </h2>

        <div className="grid gap-3">

          {genres.map((p) => (
            <Link
              key={p.slug}
              href={`/plejliste/${p.slug}`}
              className="border p-4 rounded hover:bg-gray-100"
            >
              {p.title}
            </Link>
          ))}

        </div>

      </section>

    </div>
  )
}