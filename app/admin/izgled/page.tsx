import { readAdminBranding } from "@/lib/branding/server"
import BrandingEditor from "./BrandingEditor"

export const dynamic = "force-dynamic"
export default async function AppearancePage() {
  const state = await readAdminBranding()
  return <section className="admin-page">
    <h1>Izgled i slogani</h1>
    <p className="admin-muted">Ovde uređuješ tekst ispod logotipa. Uključeni slogani prikazuju se redom. Promene važe za sve posetioce kada izabereš „Sačuvaj slogane“.</p>
    {!state.available && <p role="alert">Podešavanja trenutno nisu dostupna. Potrebno je pripremiti tabele za slogane ili proveriti vezu sa bazom. Čuvanje je onemogućeno.</p>}
    <BrandingEditor initial={state} />
  </section>
}
