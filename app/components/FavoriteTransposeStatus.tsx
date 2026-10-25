"use client"

import { Check, LoaderCircle, RefreshCw } from "lucide-react"
import { useI18n } from "./UiText"
import styles from "./FavoriteTransposeStatus.module.css"

export default function FavoriteTransposeStatus({ phase, error, reload }: { phase: string; error: string; reload: () => Promise<void> }) {
  const { t } = useI18n()
  if (error) return <div role="alert" className={styles.error}><p>{t(error)}</p><button type="button" className={styles.retry} onClick={() => void reload()}><RefreshCw />{t("Ucitaj sacuvani tonalitet")}</button></div>
  if (phase === "loading" || phase === "saving" || phase === "updating") return <span role="status" className={styles.status}><LoaderCircle className="animate-spin" />{t(phase === "loading" ? "Proveravam favorite..." : phase === "saving" ? "Cuvam tonalitet..." : "Cuvam...")}</span>
  if (phase === "saved") return <span role="status" className={styles.status}><Check />{t("Tonalitet sacuvan u favoritima.")}</span>
  return null
}
