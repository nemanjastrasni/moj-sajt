export default function AkordiPage() {
  const roots = [
    "A","A#","B","C","C#","D","D#","E","F","F#","G","G#"
  ]

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Akordi za gitaru</h1>

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