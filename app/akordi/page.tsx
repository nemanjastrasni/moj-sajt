import { publicPageMetadata } from "@/lib/seo/metadata"
import { CHORD_ROOTS } from "@/lib/seo/catalog"
import UiText from "@/app/components/UiText"

export const metadata = publicPageMetadata("Akordi za gitaru – Dijagrami i hvatovi", "Pregled akorda za gitaru po osnovnom tonu. Pronađi durske, molske i druge hvatove sa dijagramima.", "/akordi")

export default function AkordiPage() {
  const roots = CHORD_ROOTS

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6"><UiText text="Akordi za gitaru" /></h1>

      <div className="grid grid-cols-4 gap-4">
        {roots.map((r) => (
          <a
            key={r}
            href={`/akordi/${encodeURIComponent(r)}`}
            className="p-6 bg-gray-900 rounded-xl text-center text-xl hover:bg-gray-800"
          >
            {r}
          </a>
        ))}
      </div>
    </div>
  )
}
