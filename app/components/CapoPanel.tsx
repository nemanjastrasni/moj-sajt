"use client"
import { useEffect, useId } from "react"
import { Minus, Plus, RotateCcw, Sparkles } from "lucide-react"
import { MAX_CAPO } from "@/lib/chords/capoDisplay"
import type { SongCapo } from "./useSongCapo"
import { useI18n } from "./UiText"
import styles from "./CapoControl.module.css"

export default function CapoPanel({capo,disabled=false}:{capo:SongCapo;disabled?:boolean}){
  const {t}=useI18n(),id=useId(),{prepare}=capo
  useEffect(()=>{void prepare()},[prepare])
  if(capo.recommendationPhase==="loading"||capo.recommendationPhase==="idle")return <p role="status">{t("Učitavam capo preporuke...")}</p>
  if(capo.recommendationPhase==="error")return <div role="alert"><p>{t("Capo preporuke nisu dostupne. Pokušaj ponovo.")}</p><button type="button" className="ui-button" onClick={()=>void capo.prepare(!capo.active)}>{t("Pokusaj ponovo")}</button></div>
  const recommended=capo.options[0],current=capo.options.find(option=>option.fret===capo.fret),available=!disabled&&Boolean(recommended)
  return <section id={id} className={styles.panel} aria-label={t("Capo hvatovi")}>
      <div className={styles.controls}>
        <button type="button" className={styles.icon} aria-label={t("Spusti capo")} title={t("Spusti capo")} disabled={!available || capo.fret <= 0} onClick={() => capo.select(capo.fret - 1)}><Minus /></button>
        <label className={styles.fret}>{t("Prag")}<select aria-label={t("Capo prag")} value={capo.fret} disabled={!available} onChange={event => capo.select(Number(event.target.value))}>{Array.from({ length: MAX_CAPO + 1 }, (_, fret) => <option key={fret} value={fret}>{fret === 0 ? t("Bez capoa") : fret}</option>)}</select></label>
        <button type="button" className={styles.icon} aria-label={t("Podigni capo")} title={t("Podigni capo")} disabled={!available || capo.fret >= MAX_CAPO} onClick={() => capo.select(capo.fret + 1)}><Plus /></button>
        <button type="button" className={styles.icon} aria-label={t("Izvorni hvatovi")} title={t("Izvorni hvatovi")} disabled={!capo.active} onClick={() => capo.select(null)}><RotateCcw /></button>
      </div>
      <div className={styles.suggestion}>
        <button type="button" className={styles.button} disabled={!available} onClick={() => recommended && capo.select(recommended.fret)}><Sparkles aria-hidden="true" />{t("Preporuka")}{recommended && <strong>{recommended.fret === 0 ? t("Bez capoa") : `Capo ${recommended.fret}`}</strong>}</button>
        {current && <span className={styles.meta}>{t("Otvoreni hvatovi")}: {current.easy}/{current.total}</span>}
      </div>
      {capo.active && current && <>
        <p className={styles.status} role="status">{t("Isti zvucni tonalitet")}{capo.fret > 0 ? ` · Capo ${capo.fret}` : ` · ${t("Bez capoa")}`}</p>
        <div className={styles.chords} translate="no">{current.chords.map(chord => <span key={chord}>{chord}</span>)}</div>
      </>}
      {capo.source.ambiguous ? <p role="alert" className={styles.warning}>{t("Oznaka capoa u izvornom zapisu nije jasna. Preporuka nije dostupna.")}</p> : !recommended ? <p className={styles.meta}>{t("Nema prepoznatih akorda za capo preporuku.")}</p> : null}
      {capo.active && capo.source.hasTabs && <p className={styles.warning}>{t("Tabulatura ostaje u izvornom zapisu.")}</p>}
    </section>
}
