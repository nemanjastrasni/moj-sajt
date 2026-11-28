import Link from "next/link"
import Breadcrumbs from "./Breadcrumbs"
import styles from "./GuitarGuides.module.css"
import TunerButton from "./TunerButton"
import { GUITAR_STRINGS, midiFrequency, noteName } from "@/lib/tuner/model"
import { publicPageMetadata } from "@/lib/seo/metadata"

const copy = {
  sr: {
    path: "/stimer", home: "/", homeLabel: "Početna", pathsLabel: "Putanja stranice",
    title: "Online štimer za gitaru",
    description: "Naštimuj gitaru pomoću mikrofona u telefonu ili računaru. Pogledaj standardni štim, tonove svih šest žica i kada da zategneš ili opustiš žicu.",
    intro: "Naštimuj šest žica gitare pomoću mikrofona na telefonu ili računaru. Štimer prepoznaje ton i pokazuje da li da zategneš ili otpustiš žicu.",
    launch: "Otvori štimer",
    microphone: "Zvuk se obrađuje u pregledaču. Mikrofon se uključuje tek kada ga pokreneš u štimeru i dozvoliš pristup.",
    stepsHeading: "Kako da naštimuješ gitaru",
    steps: [
      "Otvori štimer, uključi mikrofon i odobri pristup u pregledaču.",
      "Trzni jednu praznu žicu i sačekaj da se ton ustali. Ako štimer prikaže drugu žicu, izaberi broj žice ručno.",
      "Ako je ton prenizak, malo zategni žicu. Ako je previsok, malo je otpusti. Trzni je ponovo i proveri da li je pokazivač u sredini.",
      "Ponovi za svih šest žica, od najdeblje do najtanje. Na kraju ih još jednom proveri redom.",
    ],
    standardHeading: "Standardni štim gitare",
    standard: "Od najdeblje do najtanje žice tonovi su E–A–D–G–H–E. Na stranim štimerima i u mnogim dijagramima H se piše B. Tabela koristi referentni ton A4 = 440 Hz.",
    string: "Žica", note: "Ton", frequency: "Frekvencija (Hz)", numberLocale: "sr-Latn",
    helpHeading: "Ako štimer ne prepoznaje ton",
    help: "Priguši ostale žice, približi gitaru mikrofonu i probaj u tišoj prostoriji. Ako se u pregledaču pojavi greška, proveri dozvolu mikrofona za GitarAkordi.",
    linksLabel: "Nastavi sa vežbanjem",
    chords: { path: "/akordi", text: "Dijagrami akorda za gitaru" },
    guides: { path: "/vodici", text: "Vodiči za gitaru" },
    alternate: { path: "/en/guitar-tuner", text: "English", lang: "en" },
  },
  en: {
    path: "/en/guitar-tuner", home: "/en", homeLabel: "Home", pathsLabel: "Page path",
    title: "Online guitar tuner",
    description: "Tune your guitar with your phone or computer microphone. See the notes and frequencies for all six strings in standard tuning and learn which way to adjust each string.",
    intro: "Tune your six-string guitar with the microphone on your phone or computer. The tuner detects the pitch and shows whether to tighten or loosen the string.",
    launch: "Open guitar tuner",
    microphone: "The browser processes the sound locally. The microphone starts after you turn it on in the tuner and allow access.",
    stepsHeading: "How to tune a guitar",
    steps: [
      "Open the tuner, turn on the microphone and allow access in your browser.",
      "Pluck one open string and let the note settle. If the tuner shows a different string, select the string number manually.",
      "If the note is flat, tighten the string a little. If it is sharp, loosen it. Pluck again and check that the indicator is centred.",
      "Repeat for all six strings, from thickest to thinnest. Then check them once more in order.",
    ],
    standardHeading: "Standard guitar tuning",
    standard: "From the thickest string to the thinnest, the notes are E–A–D–G–B–E. The table uses the reference pitch A4 = 440 Hz.",
    string: "String", note: "Note", frequency: "Frequency (Hz)", numberLocale: "en",
    helpHeading: "If the tuner cannot detect the note",
    help: "Mute the other strings, move the guitar closer to the microphone and try in a quieter room. If the browser displays an error, check the microphone permission for GitarAkordi.",
    linksLabel: "Keep practising",
    chords: { path: "/en/guitar-chords", text: "Guitar chord diagrams" },
    guides: { path: "/en/guides", text: "Guitar guides" },
    alternate: { path: "/stimer", text: "Srpski", lang: "sr-Latn" },
  },
} as const

type TunerLocale = keyof typeof copy

export function guitarTunerMetadata(locale: TunerLocale) {
  const page = copy[locale]
  return publicPageMetadata(page.title, page.description, page.path)
}

export default function GuitarTunerPage({ locale }: { locale: TunerLocale }) {
  const page = copy[locale]
  const formatFrequency = new Intl.NumberFormat(page.numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return <article className={styles.page}>
    <Breadcrumbs label={page.pathsLabel} items={[
      { name: page.homeLabel, path: page.home },
      { name: page.title, path: page.path },
    ]} />
    <h1>{page.title}</h1>
    <p className={styles.intro}>{page.intro}</p>
    <TunerButton label={page.launch} />
    <p>{page.microphone}</p>
    <section className={styles.section} aria-labelledby="tuning-steps">
      <h2 id="tuning-steps">{page.stepsHeading}</h2>
      <ol className={styles.steps}>{page.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </section>
    <section className={styles.section} aria-labelledby="standard-tuning">
      <h2 id="standard-tuning">{page.standardHeading}</h2>
      <p>{page.standard}</p>
      <div className={styles.example}>
        <table aria-labelledby="standard-tuning">
          <thead><tr><th scope="col">{page.string}</th><th scope="col">{page.note}</th><th scope="col">{page.frequency}</th></tr></thead>
          <tbody>{GUITAR_STRINGS.map(({ number, midi }) => <tr key={number}>
            <th scope="row">{number}</th><td>{noteName(midi, locale)}</td><td>{formatFrequency.format(midiFrequency(midi))}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="tuning-help">
      <h2 id="tuning-help">{page.helpHeading}</h2>
      <p>{page.help}</p>
    </section>
    <nav className={styles.links} aria-label={page.linksLabel}>
      <Link href={page.chords.path} prefetch={false}>{page.chords.text}</Link>
      <Link href={page.guides.path} prefetch={false}>{page.guides.text}</Link>
      <Link href={page.alternate.path} hrefLang={page.alternate.lang} lang={page.alternate.lang} prefetch={false}>{page.alternate.text}</Link>
    </nav>
  </article>
}
