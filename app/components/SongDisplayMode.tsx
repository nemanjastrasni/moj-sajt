"use client"
import { useI18n } from "./UiText"
import styles from "./SongDisplayMode.module.css"
export default function SongDisplayMode({ lyricsOnly, change }: { lyricsOnly: boolean; change: (value: boolean) => void }) {
  const { t } = useI18n()
  return <div role="group" aria-label={t("Prikaz pesme")} className={styles.modes}>
    <button type="button" aria-pressed={!lyricsOnly} onClick={() => change(false)}>{t("Tekst i akordi")}</button>
    <button type="button" aria-pressed={lyricsOnly} onClick={() => change(true)}>{t("Samo tekst")}</button>
  </div>
}
