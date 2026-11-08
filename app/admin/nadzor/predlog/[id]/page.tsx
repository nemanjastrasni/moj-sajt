import Link from "next/link"
import { notFound } from "next/navigation"
import { readProposal } from "@/lib/monitoring/actions"
import FindingActions from "../../FindingActions"
export const dynamic="force-dynamic"
export default async function ProposalPage({params}:{params:Promise<{id:string}>}){const p=await readProposal((await params).id);if(!p)notFound();return <section className="admin-page admin-monitor"><h1>Predlog i prethodno stanje</h1><Link className="admin-finding-link" href="/admin/nadzor">Nazad na nadzor</Link><FindingActions findingId={p.findingId} subjectId={p.subjectId} field={p.field==="finding"?undefined:p.field} canDecide={p.field==="finding"} initialRows={[p]} initialOpen disabled/></section>}
