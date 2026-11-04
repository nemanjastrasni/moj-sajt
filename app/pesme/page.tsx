import { publicPageMetadata } from "@/lib/seo/metadata"
import UiText from "@/app/components/UiText"
import Link from "next/link"



export const metadata = publicPageMetadata("Pesme sa akordima za gitaru", "Akordi i tekstovi zabavnih, narodnih i stranih pesama. Pronađi izvođača i izaberi pesmu za sviranje.", "/pesme")

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
