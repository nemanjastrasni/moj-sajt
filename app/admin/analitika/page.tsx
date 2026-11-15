import { readEngagement } from "@/lib/engagement/server"
import EngagementSummary from "./summary"

export const dynamic = "force-dynamic"
export default async function Page() {
  const result = await readEngagement()
  return <section className="admin-page"><h1>Analiza korišćenja</h1>{result.available ? <EngagementSummary report={result.report} /> : <p role="alert">Analitika trenutno nije dostupna. Ako je ovo prvo uključivanje, potrebno je izvršiti pripremljeni SQL za analitiku. Nedostupni podaci nisu prikazani kao nule.</p>}</section>
}
