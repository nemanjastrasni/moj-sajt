import UiText from "@/app/components/UiText"
import Link from "next/link"


const letters = [
"A","B","C","Č","Ć","D","DŽ","Đ","E","F","G","H","I","J",
"K","L","LJ","M","N","NJ","O","P","R","S","Š","T","U","V","Z","Ž"
]

export default function PesmePage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1><UiText text="Izaberi kategoriju" /></h1>

      <ul>
        <li>
          <Link href="/pesme/domace"><UiText text="Zabavne" /></Link>
        </li>

        <li>
          <Link href="/pesme/strane"><UiText text="Strane" /></Link>
        </li>

        <li>
          <Link href="/pesme/narodne"><UiText text="Narodne" /></Link>
        </li>
      </ul>
    </div>
  )
}
