import Link from "next/link"
import UiText, { CategoryLabel } from "@/app/components/UiText"
import MusicButton from "@/app/components/MusicButton"

const categories = [
  { key: "domace", label: "Zabavne" },
  { key: "strane", label: "Strane" },
  { key: "narodne", label: "Narodne" },
]

export default function BiografijePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-6">
        <UiText text="Biografije izvođača" />
      </h1>
      <div className="mb-8 flex flex-wrap gap-3"><MusicButton /><Link href="/public-listening-playlists" className="ui-button"><UiText text="Javne muzicke liste" /></Link></div>

      <ul className="space-y-4 text-lg">
        {categories.map((cat) => (
          <li key={cat.key}>
            <Link
              href={`/biografija/${cat.key}`}
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              <CategoryLabel value={cat.key} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
