import Link from "next/link"
import { notFound } from "next/navigation"
import Breadcrumbs from "@/app/components/Breadcrumbs"
import GuideText from "@/app/components/GuideText"
import GuitarGuideExamples from "@/app/components/GuitarGuideExamples"
import styles from "@/app/components/GuitarGuides.module.css"
import { getGuitarGuide, guitarGuides, guidePath } from "@/lib/guitarGuides"
import { publicPageMetadata } from "@/lib/seo/metadata"

type Props = { params: Promise<{ slug: string }> }
export const dynamicParams = false
export function generateStaticParams() { return guitarGuides.map(({ slug }) => ({ slug })) }
export async function generateMetadata({ params }: Props) {
  const guide = getGuitarGuide((await params).slug)
  if (!guide) notFound()
  return publicPageMetadata(guide.title.sr, guide.description.sr, guidePath(guide.slug))
}

export default async function GuitarGuidePage({ params }: Props) {
  const guide = getGuitarGuide((await params).slug)
  if (!guide) notFound()
  return <article className={styles.page}>
    <Breadcrumbs items={[{ name: "Početna", path: "/" }, { name: "Vodiči za gitaru", path: "/vodici" }, { name: guide.title.sr, path: guidePath(guide.slug) }]} />
    <h1><GuideText text={guide.title} /></h1>
    <p className={styles.intro}><GuideText text={guide.description} /></p>
    <nav className={styles.contents} aria-labelledby="guide-contents">
      <h2 id="guide-contents"><GuideText text={{ sr: "U ovom vodiču", en: "In this guide" }} /></h2>
      <ol>{guide.sections.map(section => <li key={section.id}><a href={"#" + section.id}><GuideText text={section.heading} /></a></li>)}</ol>
    </nav>
    {guide.sections.map(section => <section className={styles.section} key={section.id} id={section.id} aria-labelledby={section.id + "-heading"}>
      <h2 id={section.id + "-heading"}><GuideText text={section.heading} /></h2>
      {section.paragraphs.map((text, index) => <p key={index}><GuideText text={text} /></p>)}
      {section.example && <GuitarGuideExamples kind={section.example} />}
      {section.steps && <ol className={styles.steps}>{section.steps.map((text, index) => <li key={index}><GuideText text={text} /></li>)}</ol>}
    </section>)}
    <section className={styles.section} aria-labelledby="guide-practice">
      <h2 id="guide-practice"><GuideText text={{ sr: "Probaj na sajtu", en: "Try it on the site" }} /></h2>
      <nav className={styles.links} aria-labelledby="guide-practice">{guide.links.map(link => <Link key={link.href} href={link.href} prefetch={false}><GuideText text={link.label} /></Link>)}</nav>
    </section>
    <section className={styles.section} aria-labelledby="guide-next">
      <h2 id="guide-next"><GuideText text={{ sr: "Nastavi učenje", en: "Keep learning" }} /></h2>
      <nav className={styles.links} aria-labelledby="guide-next">{guitarGuides.filter(other => other.slug !== guide.slug).map(other => <Link key={other.slug} href={guidePath(other.slug)} prefetch={false}><GuideText text={other.title} /></Link>)}</nav>
    </section>
    <p className={styles.source}><GuideText text={{ sr: "Za dodatno čitanje o osnovama:", en: "Further reading on the basics:" }} />{" "}<a href={guide.source.href} rel="noopener noreferrer" target="_blank">{guide.source.title}</a></p>
  </article>
}
