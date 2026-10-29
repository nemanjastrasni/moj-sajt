"use client"
import { RefreshCw } from "lucide-react"
import { useI18n } from "@/app/components/UiText"
export default function MusicError({reset}:{reset:()=>void}){const {t}=useI18n();return <section className="py-8"><h1 className="mb-4 text-2xl font-bold">{t("Muzika trenutno nije dostupna. Pokusaj ponovo.")}</h1><button type="button" className="ui-button" onClick={reset}><RefreshCw aria-hidden="true" />{t("Pokusaj ponovo")}</button></section>}
