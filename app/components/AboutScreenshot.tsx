"use client"
import Image from "next/image"
import { useI18n } from "./UiText"
import styles from "./AboutScreenshot.module.css"
const images = {
  playlist: { src: "/guide/plejlista.png", width: 1120, height: 536, alt: "Prikaz plejliste i njenih kontrola" },
  capo: { src: "/guide/tonalitet-capo.png", width: 1120, height: 810, alt: "Prikaz tonaliteta, capoa i navigacije kroz plejlistu" },
  music: { src: "/guide/moja-muzika.png", width: 1120, height: 491, alt: "Prikaz li\u010dnih muzi\u010dkih lista" },
}
export default function AboutScreenshot({ kind }: { kind: keyof typeof images }) {
  const { t } = useI18n(), image = images[kind]
  return <figure className={styles.figure}>
    <a href={image.src} target="_blank" rel="noopener" title={t("Uve\u0107aj prikaz")}><Image src={image.src} width={image.width} height={image.height} alt={t(image.alt)} sizes="(max-width: 880px) 100vw, 800px" unoptimized /></a>
    <figcaption>{t("Primer prikaza sa probnim podacima.")}</figcaption>
  </figure>
}
