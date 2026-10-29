import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, AudioLines, FileDown, Flag, Guitar, ListMusic, Maximize, Music2, Palette, type LucideIcon } from "lucide-react"
import UiText from "@/app/components/UiText"
import { aboutAccountNote, aboutAppearance, aboutContactNote, aboutIntro, aboutSections } from "@/lib/about"
import { PUBLIC_OPERATOR_NAME } from "@/lib/site-contact"
import styles from "./page.module.css"

export const metadata: Metadata = {
  title: "O nama",
  description: "GitaraAkordi: pesme sa akordima, plejliste, tonalitet i capo, PDF pesmarice, prikaz za sviranje, \u0161timer i metronom.",
}

const icons: Record<typeof aboutSections[number]["id"], LucideIcon> = {
  pesme: Music2, repertoar: ListMusic, tonalitet: Guitar, sviranje: Maximize,
  pdf: FileDown, alati: AudioLines, doprinos: Flag,
}

export default function AboutPage() {
  return <article className={styles.page}>
    <header className={styles.intro}>
      <h1><UiText text="O nama" /></h1>
      <p className={styles.lead}><UiText text={aboutIntro} /></p>
      <p><UiText text={aboutAccountNote} /></p>
      <Link href="/login" className="ui-button"><UiText text="Prijava i nalog" /><ArrowRight aria-hidden="true" /></Link>
    </header>

    <nav className={styles.contents} aria-labelledby="about-contents">
      <h2 id="about-contents"><UiText text={"Mogu\u0107nosti sajta"} /></h2>
      <ul>{aboutSections.map(section=><li key={section.id}><a href={"#" + section.id}><UiText text={section.title} /><ArrowRight aria-hidden="true" /></a></li>)}</ul>
    </nav>

    {aboutSections.map(section=>{
      const Icon=icons[section.id]
      return <section id={section.id} key={section.id} className={styles.section} aria-labelledby={section.id + "-title"}>
        <Icon className={styles.sectionIcon} aria-hidden="true" />
        <div>
          <h2 id={section.id + "-title"}><UiText text={section.title} /></h2>
          {section.paragraphs.map(paragraph=><p key={paragraph}><UiText text={paragraph} /></p>)}
          {section.links.length>0&&<ul className={styles.links}>{section.links.map(link=><li key={link.href}><Link href={link.href} prefetch={false}><UiText text={link.label} /><ArrowRight aria-hidden="true" /></Link></li>)}</ul>}
        </div>
      </section>
    })}

    <section className={styles.section} aria-labelledby="about-appearance">
      <Palette className={styles.sectionIcon} aria-hidden="true" />
      <div><h2 id="about-appearance"><UiText text="Izgled i jezik" /></h2><p><UiText text={aboutAppearance} /></p></div>
    </section>
    <footer className={styles.owner}>
      <h2><UiText text="Ko stoji iza sajta" /></h2>
      <p><UiText text="Sajt vodi" /> <span translate="no">{PUBLIC_OPERATOR_NAME}</span>. <UiText text="Fizicko lice, Srbija." /></p>
      <p><UiText text={aboutContactNote} /></p>
      <Link href="/kontakt" className="ui-button"><UiText text="Kontakt i podaci o sajtu" /><ArrowRight aria-hidden="true" /></Link>
    </footer>
  </article>
}
