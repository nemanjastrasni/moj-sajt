import Link from "next/link"
import { basicGuitarChords } from "@/lib/guitarBasics"
import { GuideChordDiagram } from "./GuitarGuideExamples"
import GuideText from "./GuideText"
import styles from "./BasicGuitarChords.module.css"

export default function BasicGuitarChords() {
  return <div className={styles.grid}>
    {basicGuitarChords.map(chord => <div className={styles.chord} key={chord.name}>
      <GuideChordDiagram name={chord.name} frets={chord.frets} />
      <Link href={`/akordi/${chord.root}`} prefetch={false}>
        <GuideText text={{ sr: `Svi ${chord.root} akordi i hvatovi`, en: `All ${chord.root} chords and shapes` }} />
      </Link>
    </div>)}
  </div>
}
