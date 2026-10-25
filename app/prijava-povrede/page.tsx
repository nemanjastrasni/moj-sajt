import type { Metadata } from "next"
import Link from "next/link"
import { Mail } from "lucide-react"
import UiText from "@/app/components/UiText"
import { PUBLIC_CONTACT_EMAIL, RIGHTS_REPORT_MAILTO } from "@/lib/site-contact"

export const metadata: Metadata = { title: "Prijava povrede prava" }

export default function RightsReportPage() {
  return (
    <section className="mx-auto max-w-3xl py-10 leading-relaxed">
      <h1 className="mb-6 text-2xl font-bold"><UiText text="Prijava povrede prava" /></h1>
      <p><UiText text="Ako smatras da sadrzaj na sajtu povredjuje tvoja autorska prava ili privatnost, posalji prijavu emailom." /></p>
      <a href={RIGHTS_REPORT_MAILTO} className="my-5 inline-flex max-w-full items-center gap-2 text-sm text-blue-500 underline underline-offset-2">
        <Mail size={18} className="shrink-0" aria-hidden="true" />
        <span className="break-all">{PUBLIC_CONTACT_EMAIL}</span>
      </a>
      <h2 className="mb-3 mt-3 text-lg font-semibold"><UiText text="Sta navesti u prijavi" /></h2>
      <ol className="list-decimal space-y-3 pl-6">
        <li><UiText text="Tacan URL svake sporne stranice ili slike i opis dela na koje se prijava odnosi." /></li>
        <li><UiText text="Opis povrede i razlog zbog kojeg smatras da je sadrzaj sporan." /></li>
        <li><UiText text="Za autorska prava: ime ili naziv nosioca prava i tvoja uloga ili ovlascenje da postupas u njegovo ime." /></li>
        <li><UiText text="Link ka izvornom delu ili drugi relevantan dokaz, ako ga imas." /></li>
        <li><UiText text="Sta trazis: uklanjanje, ispravku navoda, dopunu izvora ili drugu radnju, uz email za odgovor." /></li>
      </ol>
      <p className="mt-6"><UiText text="Prijavu cemo pregledati i po potrebi zatraziti dodatne informacije. Prijava nije automatska odluka o tome ko ima prava na sadrzaj." /></p>
      <p className="mt-4 text-sm text-gray-400"><UiText text="Posalji samo podatke neophodne za prijavu. Ne salji JMBG, lozinke, podatke kartice ili kopije licnih dokumenata." /></p>
      <Link href="/kontakt" className="mt-6 inline-block text-blue-500 underline"><UiText text="Kontakt" /></Link>
    </section>
  )
}
