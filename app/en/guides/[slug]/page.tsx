import Link from "next/link"
import { notFound } from "next/navigation"
import Breadcrumbs from "@/app/components/Breadcrumbs"
import GuitarGuideExamples from "@/app/components/GuitarGuideExamples"
import { getGuitarGuide, guitarGuides, guidePath } from "@/lib/guitarGuides"
import { localizedHref, translatedRoute, translatedRoutes } from "@/lib/i18n/routes"
import { publicPageMetadata } from "@/lib/seo/metadata"
import styles from "@/app/components/GuitarGuides.module.css"

type Props = { params: Promise<{ slug: string }> }
const routes = translatedRoutes.filter(pair => pair.sr.startsWith("/vodici/"))
function findGuide(slug: string) {
  const pair = translatedRoute("/en/guides/" + slug)
  return pair ? getGuitarGuide(pair.sr.slice("/vodici/".length)) : null
}
export const dynamicParams = false
export function generateStaticParams() { return routes.map(pair => ({ slug: pair.en.split("/").at(-1)! })) }
export async function generateMetadata({ params }: Props) {
  const { slug } = await params, guide = findGuide(slug)
  if (!guide) notFound()
  return publicPageMetadata(guide.title.en, guide.description.en, localizedHref(guidePath(guide.slug), "en"))
}
export default async function EnglishGuidePage({ params }: Props) {
  const guide = findGuide((await params).slug)
  if (!guide) notFound()
  const path = localizedHref(guidePath(guide.slug), "en")
  return <article className={styles.page}>
    <Breadcrumbs label="Page path" items={[{ name: "Home", path: "/en" }, { name: "Guitar guides", path: "/en/guides" }, { name: guide.title.en, path }]} />
    <h1>{guide.title.en}</h1><p className={styles.intro}>{guide.description.en}</p>
    <nav className={styles.contents} aria-labelledby="guide-contents"><h2 id="guide-contents">In this guide</h2><ol>{guide.sections.map(section => <li key={section.id}><a href={"#" + section.id}>{section.heading.en}</a></li>)}</ol></nav>
    {guide.sections.map(section => <section id={section.id} key={section.id} className={styles.section}>
      <h2>{section.heading.en}</h2>{section.paragraphs.map((text, index) => <p key={index}>{text.en}</p>)}
      {section.example && <GuitarGuideExamples kind={section.example} />}
      {section.steps && <ol className={styles.steps}>{section.steps.map((text, index) => <li key={index}>{text.en}</li>)}</ol>}
    </section>)}
    <section className={styles.section} aria-labelledby="guide-practice"><h2 id="guide-practice">Try it on the site</h2><nav className={styles.links} aria-labelledby="guide-practice">{guide.links.map(link => <Link key={link.href} href={localizedHref(link.href, "en")} prefetch={false}>{link.label.en}</Link>)}</nav></section>
    <section className={styles.section} aria-labelledby="guide-next"><h2 id="guide-next">Keep learning</h2><nav className={styles.links} aria-labelledby="guide-next">{guitarGuides.filter(other => other.slug !== guide.slug).map(other => <Link key={other.slug} href={localizedHref(guidePath(other.slug), "en")} prefetch={false}>{other.title.en}</Link>)}</nav></section>
    {guide.source && <p className={styles.source}>Further reading on the basics: <a href={guide.source.href} rel="noopener noreferrer" target="_blank">{guide.source.title}</a></p>}
  </article>
}
