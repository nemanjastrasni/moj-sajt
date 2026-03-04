import Link from "next/link"


const letters = [
"A","B","C","Č","Ć","D","DŽ","Đ","E","F","G","H","I","J",
"K","L","LJ","M","N","NJ","O","P","R","S","Š","T","U","V","Z","Ž"
]

export default function CategoryPage({ params }: { params: { category: string } }) {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Izaberi slovo</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {letters.map((l) => (
          <Link
            key={l}
            href={`/pesme/${params.category}/slovo/${l}`}
            style={{ border: "1px solid #ccc", padding: "6px 10px" }}
          >
            {l}
          </Link>
        ))}
      </div>
    </div>
  )
}