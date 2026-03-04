import Link from "next/link"


const letters = [
"A","B","C","Č","Ć","D","DŽ","Đ","E","F","G","H","I","J",
"K","L","LJ","M","N","NJ","O","P","R","S","Š","T","U","V","Z","Ž"
]

export default function PesmePage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Izaberi kategoriju</h1>

      <ul>
        <li>
          <Link href="/pesme/domace">Domaće</Link>
        </li>

        <li>
          <Link href="/pesme/strane">Strane</Link>
        </li>

        <li>
          <Link href="/pesme/narodne">Narodne</Link>
        </li>
      </ul>
    </div>
  )
}