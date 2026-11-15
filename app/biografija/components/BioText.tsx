import GuideText from "@/app/components/GuideText"
import styles from "./BioText.module.css"

export default function BioText({ text }: { text: string }) {
  if (text.length <= 300) return <div className={styles.text}>{text}</div>
  // The full text is present in the first HTML response, with no client fetch.
  const space = text.lastIndexOf(" ", 300)
  const end = space > 150 ? space : 300
  return <div className={styles.text}>
    <span data-biography-preview>{text.slice(0, end)}</span>
    <details className={styles.more}>
      <summary>
        <span className={styles.expand}><GuideText text={{ sr: "Pročitaj više", en: "Read more" }} /></span>
        <span className={styles.collapse}><GuideText text={{ sr: "Sakrij", en: "Show less" }} /></span>
      </summary>
      <span data-biography-rest>{text.slice(end)}</span>
    </details>
  </div>
}
