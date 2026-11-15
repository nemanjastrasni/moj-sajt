import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { SubmissionError } from "@/lib/submissions/validation"

export function mergeFailure(error: unknown) {
  if (error instanceof SubmissionError) return NextResponse.json({ error: error.message }, { status: error.status })
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null
  const databaseCode = error instanceof Prisma.PrismaClientKnownRequestError && typeof error.meta?.code === "string" ? error.meta.code : null
  // Never log SQL, connection strings, content, actor details or request bodies.
  console.error("[artist-merge] request failed", { code, databaseCode, type: error instanceof Error ? error.name : "unknown" })
  const message = code === "P2028" || code === "P2024"
    ? "Baza je zauzeta ili je zahtev istekao. Sačekaj nekoliko sekundi i ponovo otvori pregled. Proveri listu pre ponovne potvrde spajanja."
    : code === "P2010" && databaseCode === "23514"
      ? "Pravila baze još ne podržavaju evidenciju spajanja. Potrebna je nadogradnja administrativne evidencije. Ništa nije spojeno."
      : "Pregled ili spajanje trenutno nisu dostupni. Osveži listu i pokušaj ponovo. Ako se ponovi, proveri grešku [artist-merge] u Render logovima."
  return NextResponse.json({ error: message }, { status: 503 })
}
