import GuideText from "./GuideText"
import styles from "./GuitarGuides.module.css"

function ChordDiagram({ name, frets }: { name: string; frets: number[] }) {
  return <figure className={styles.diagram}>
    <figcaption>{name}</figcaption>
    <svg viewBox="0 0 180 220" role="img" aria-label={`${name}: ${frets.map(fret => fret < 0 ? "X" : fret).join(" ")}`}>
      {frets.map((fret, index) => <text key={index} x={30 + index * 24} y="25" textAnchor="middle" fontSize="18" fill="currentColor">{fret < 0 ? "X" : fret === 0 ? "0" : ""}</text>)}
      {[0, 1, 2, 3, 4].map(fret => <line key={fret} x1="30" x2="150" y1={40 + fret * 34} y2={40 + fret * 34} stroke="currentColor" strokeWidth={fret === 0 ? 5 : 1} />)}
      {frets.map((fret, index) => <g key={index}>
        <line x1={30 + index * 24} x2={30 + index * 24} y1="40" y2="176" stroke="currentColor" />
        {fret > 0 && <circle cx={30 + index * 24} cy={40 + (fret - .5) * 34} r="9" fill="currentColor" />}
        <text x={30 + index * 24} y="202" textAnchor="middle" fontSize="14" fill="currentColor">{6 - index}</text>
      </g>)}
    </svg>
    <code>{frets.map(fret => fret < 0 ? "X" : fret).join(" ")}</code>
  </figure>
}

export default function GuitarGuideExamples({ kind }: { kind: "diagrams" | "practice" | "capo" }) {
  if (kind === "diagrams") return <div className={styles.diagrams}><ChordDiagram name="Em" frets={[0, 2, 2, 0, 0, 0]} /><ChordDiagram name="Am" frets={[-1, 0, 2, 2, 1, 0]} /></div>
  if (kind === "practice") return <div className={styles.example}>
    <p><strong><GuideText text={{ sr: "Vežba u 4/4: jedan trzaj na početku svakog takta", en: "4/4 exercise: one strum at the start of each bar" }} /></strong></p>
    <div className={styles.bars}>{["Em", "Am", "Em", "Am"].map((chord, index) => <div className={styles.bar} key={index}><strong>{chord}</strong><span>1 · 2 · 3 · 4</span></div>)}</div>
    <p><GuideText text={{ sr: "Menjaj na sledeću jedinicu. Brojevi su dobe; nisu brojevi pragova ili prstiju.", en: "Change on the next beat one. These numbers are beats, not frets or fingers." }} /></p>
  </div>
  return <div className={styles.example}><table>
    <caption><GuideText text={{ sr: "Standardno štimovanje, capo preko svih žica", en: "Standard tuning, capo across all strings" }} /></caption>
    <thead><tr><th scope="col"><GuideText text={{ sr: "Oblik hvata", en: "Chord shape" }} /></th><th scope="col"><GuideText text={{ sr: "Zvuk bez capoa", en: "Sound without capo" }} /></th><th scope="col"><GuideText text={{ sr: "Zvuk uz capo 2", en: "Sound with capo 2" }} /></th></tr></thead>
    <tbody>{[["C", "D"], ["G", "A"], ["Am", "Bm"], ["F", "G"]].map(([shape, sound]) => <tr key={shape}><th scope="row">{shape}</th><td>{shape}</td><td>{sound}</td></tr>)}</tbody>
  </table></div>
}
