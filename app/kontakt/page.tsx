import type { Metadata } from "next"
import Link from "next/link"
import { Mail } from "lucide-react"
import UiText from "@/app/components/UiText"
import { CONTACT_MAILTO, PUBLIC_CONTACT_EMAIL, PUBLIC_OPERATOR_NAME } from "@/lib/site-contact"

export const metadata: Metadata = { title: "Kontakt" }

export default function KontaktPage() {
  return (
    <section className="mx-auto max-w-3xl py-10 leading-relaxed">
      <h1 className="mb-6 text-2xl font-bold"><UiText text="Kontakt" /></h1>
      <p><UiText text="Sajt vodi" /> <span translate="no">{PUBLIC_OPERATOR_NAME}</span>.</p>
      <p><UiText text="Fizicko lice, Srbija." /></p>
      <p className="mt-3"><UiText text="Za pitanja o sajtu, ispravke sadrzaja i zahteve u vezi sa nalogom pisi na:" /></p>
      <a href={CONTACT_MAILTO} className="my-5 inline-flex max-w-full items-center gap-2 text-sm text-blue-500 underline underline-offset-2">
        <Mail size={18} className="shrink-0" aria-hidden="true" />
        <span className="break-all">{PUBLIC_CONTACT_EMAIL}</span>
      </a>
      <p className="text-sm text-gray-400"><UiText text="Ne salji JMBG, lozinke, podatke kartice ili skenirane licne dokumente." /></p>
      <div className="mt-8 border-t border-gray-700 pt-6">
        <h2 className="mb-3 text-lg font-semibold"><UiText text="Sporan sadrzaj" /></h2>
        <p><UiText text="Za prijavu povrede autorskih prava ili privatnosti navedi tacan link i opis problema." /></p>
        <Link href="/prijava-povrede" className="mt-3 inline-block text-blue-500 underline"><UiText text="Prijava povrede prava" /></Link>
        <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/foto-izvori" className="underline"><UiText text="Izvori fotografija" /></Link>
          <Link href="/wiki-izvori" className="underline"><UiText text="Izvori biografija i diskografija" /></Link>
        </p>
      </div>
    </section>
  )
}
