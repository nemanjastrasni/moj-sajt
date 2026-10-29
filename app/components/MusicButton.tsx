"use client"
import { Headphones } from "lucide-react"
import { useMusic } from "./MusicContext"
import { useI18n } from "./UiText"
export default function MusicButton(){const {openChooser}=useMusic(),{t}=useI18n();return <button type="button" className="ui-button" onClick={openChooser}><Headphones aria-hidden="true" />{t("Slusaj uz biografiju")}</button>}
