import Link from "next/link"

const categories = [
  { key: "domace", label: "Domaće" },
  { key: "strane", label: "Strane" },
  { key: "narodne", label: "Narodne" },
]

export default function BiografijePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-10">
        Biografije izvođača
      </h1>

      <ul className="space-y-4 text-lg">
        {categories.map((cat) => (
          <li key={cat.key}>
            <Link
              href={`/biografija/${cat.key}`}
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              {cat.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}