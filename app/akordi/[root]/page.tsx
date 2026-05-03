import fs from "fs"
import path from "path"

function formatChordName(ch: string) {
  return ch
    .replace("-major", "")
    .replace("-minor", "m")
    .replace("-diminished", "dim")
    .replace("-augmented", "aug")
    .replace("-suspended-2nd-4th", "sus2sus4")
    .replace("-suspended-2nd", "sus2")
    .replace("-suspended-4th", "sus4")
    .replace("-suspended", "sus")
    .replace("-add-9", "add9")
    .replace("-add-11", "add11")
    .replace("-6th", "6")
    .replace("-7th", "7")
    .replace("-9th", "9")
    .replace("-11th", "11")
    .replace("-13th", "13")
    .replace("-flat-", "b")
    .replace("-sharp-", "#")
    .replace(/-over-/g, "/")
    .replace(/_([a-g]#?)/gi, "/$1")
    .replace(/-/g, "")
}

export default function RootPage({ params }: any) {
  const root = decodeURIComponent(params.root)

  const dir = path.join(process.cwd(), "public/chords_final")
  const files = fs.readdirSync(dir)

  const chords = files
  .filter(f => {
    const name = f.toLowerCase()
    const r = root.toLowerCase()

    // 🔥 sprečava C da hvata C#
    return name.startsWith(r)
  })
  .map(f => f.replace("_v1.png", ""))
  .filter(ch => !ch.toLowerCase().startsWith(root.toLowerCase() + "#"))
  .sort((a, b) => {
    const getSuffix = (ch: string) => {
  const name = formatChordName(ch)

  // 🔥 A (major) tretiraj kao ""
  if (name === root) return ""

  return name.replace(root, "")
}

    const sa = getSuffix(a)
    const sb = getSuffix(b)
      if (sa === "") return -1
      if (sb === "") return 1

    const order = [
      "", "m", "dim", "dim7",
      "sus", "sus2", "sus4", "sus2sus4",

      "alt", "aug", "5", "6", "69",

      "7", "7b5", "aug7", "9", "9b5", "aug9", "7b9",

      "7#9", "11", "9#11", "13", "maj7", "maj7b5", "maj7#5",

      "maj7sus2", "maj9", "maj11", "maj13",

      "m6", "m7", "m7b5", "m9", "m69", "m11",
      "mmaj7", "mmaj7b5", "mmaj9", "mmaj11",

      "add9", "add11", "madd9"
    ]

    // slash NA KRAJ
    if (sa.includes("/")) return 1
    if (sb.includes("/")) return -1

    const ai = order.indexOf(sa)
    const bi = order.indexOf(sb)

    if (ai === -1 && bi === -1) return sa.localeCompare(sb)
    if (ai === -1) return 1
    if (bi === -1) return -1

    return ai - bi
  })

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{root} akordi</h1>

      <div className="grid grid-cols-6 gap-4">
        {chords.map((ch, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <img
              src={`/chords_final/${encodeURIComponent(ch)}_v1.png`}
              width={100}
              alt={ch}
            />
            <span className="text-xs text-gray-400">
              {formatChordName(ch)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}