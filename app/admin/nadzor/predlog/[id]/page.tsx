import Link from "next/link"
import { notFound } from "next/navigation"
import { readProposal } from "@/lib/monitoring/actions"
import FindingActions from "../../FindingActions"
export const dynamic = "force-dynamic"
export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await readProposal((await params).id)
  if (!p) notFound()
  if (p.operation === "merge") return <section className="admin-page admin-monitor"><h1>Evidencija spajanja izvođača</h1><Link className="admin-finding-link" href="/admin/nadzor">Nazad na nadzor</Link><p>{p.data.note}</p><p>Oznaka spajanja: <code>{p.id}</code></p><p>Ovaj zapis čuva prethodne podatke i veze za proveru. Nema automatskog poništavanja spajanja.</p><details><summary>Prethodni podaci, izvori i prenete pesme</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(p.data, null, 2)}</pre></details></section>
  return <section className="admin-page admin-monitor"><h1>Predlog i prethodno stanje</h1><Link className="admin-finding-link" href="/admin/nadzor">Nazad na nadzor</Link><FindingActions findingId={p.findingId} subjectId={p.subjectId} field={p.field === "finding" ? undefined : p.field} canDecide={p.field === "finding"} initialRows={[p]} initialOpen disabled /></section>
}
