"use client"

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react"
import { Download, Check } from "lucide-react"
import { createInstallController, type InstallPromptEvent, type InstallStatus } from "@/lib/pwa/install"
import GuideText from "./GuideText"

const InstallContext = createContext<ReturnType<typeof createInstallController> | null>(null)
const serverSnapshot = (): InstallStatus => "unavailable"
const subscribeUnavailable = () => () => {}

export function AppInstallProvider({ children }: { children: React.ReactNode }) {
  const [controller] = useState(createInstallController)
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)")
    const minimal = window.matchMedia("(display-mode: minimal-ui)")
    const check = () => {
      if (standalone.matches || minimal.matches || (navigator as Navigator & { standalone?: boolean }).standalone) controller.installed()
    }
    const capture = (event: Event) => controller.capture(event as InstallPromptEvent)
    const installed = () => controller.installed()
    check()
    window.addEventListener("beforeinstallprompt", capture)
    window.addEventListener("appinstalled", installed)
    standalone.addEventListener("change", check)
    minimal.addEventListener("change", check)
    return () => {
      window.removeEventListener("beforeinstallprompt", capture)
      window.removeEventListener("appinstalled", installed)
      standalone.removeEventListener("change", check)
      minimal.removeEventListener("change", check)
    }
  }, [controller])
  return <InstallContext.Provider value={controller}>{children}</InstallContext.Provider>
}

export default function AppInstall() {
  const controller = useContext(InstallContext)
  const status = useSyncExternalStore(controller?.subscribe ?? subscribeUnavailable, controller?.getSnapshot ?? serverSnapshot, serverSnapshot)
  return <div aria-live="polite" data-app-install={status}>
    {(status === "ready" || status === "prompting") && <button type="button" className="ui-button" disabled={status === "prompting"} onClick={() => { void controller?.install() }}>
      <Download aria-hidden="true" size={18} />
      <GuideText text={status === "prompting" ? { sr: "Sačekaj potvrdu pregledača…", en: "Waiting for the browser…" } : { sr: "Instaliraj GitaraAkordi", en: "Install GitaraAkordi" }} />
    </button>}
    {status === "installed" && <p><Check aria-hidden="true" size={18} className="inline" /> <GuideText text={{ sr: "GitaraAkordi je otvoren kao aplikacija ili je instalacija potvrđena na ovom uređaju.", en: "GitaraAkordi is running as an app or installation has been confirmed on this device." }} /></p>}
    {status === "accepted" && <p><GuideText text={{ sr: "Zahtev je prihvaćen. Pregledač dovršava instalaciju.", en: "Request accepted. Your browser is completing installation." }} /></p>}
    {(status === "unavailable" || status === "dismissed") && <p><GuideText text={{ sr: "Ako nema dugmeta za instalaciju, koristi meni pregledača prema uputstvu ispod. Ako je aplikacija već dodata, otvori je preko ikonice.", en: "If no install button is shown, use your browser menu as explained below. If you already added the app, open its icon." }} /></p>}
    {status === "error" && <p><GuideText text={{ sr: "Instalacija nije pokrenuta. Pokušaj preko menija pregledača prema uputstvu ispod.", en: "Installation did not start. Try your browser menu as explained below." }} /></p>}
  </div>
}
