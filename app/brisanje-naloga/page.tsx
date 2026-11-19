import Link from "next/link"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { PUBLIC_CONTACT_EMAIL, PUBLIC_OPERATOR_NAME } from "@/lib/site-contact"
import { ACCOUNT_DELETION_MAILTO, ACCOUNT_DELETION_SUBJECT } from "@/lib/account-deletion"

export const metadata = publicPageMetadata("Brisanje naloga i podataka", "Kako zatražiti trajno brisanje GitarAkordi naloga i povezanih ličnih podataka, bez prijave i ponovne instalacije aplikacije.", "/brisanje-naloga")

export default function AccountDeletionPage() {
  return <article className="mx-auto max-w-3xl py-8 leading-relaxed" lang="sr-Latn">
    <h1 className="mb-4 text-2xl font-bold">Brisanje GitarAkordi naloga i podataka</h1>
    <p>Zahtev možeš poslati bez prijave na sajt ili instaliranja aplikacije. Zahteve obrađuje {PUBLIC_OPERATOR_NAME}, urednik sajta GitarAkordi.</p>
    <a href={ACCOUNT_DELETION_MAILTO} className="ui-button ui-button-danger my-5">Otvori mejl za zahtev za brisanje</a>
    <p className="text-sm">Dugme otvara tvoju aplikaciju za mejl sa pripremljenom porukom. Dopuni adresu naloga i pošalji poruku. Sam klik ne šalje zahtev i ne briše nalog.</p>
    <section className="mt-7" aria-labelledby="deletion-steps">
      <h2 id="deletion-steps" className="mb-3 text-xl font-semibold">Kako da pošalješ zahtev</h2>
      <ol className="list-decimal space-y-3 pl-6">
        <li>Pošalji poruku sa email adrese koju koristiš za GitarAkordi nalog na <a className="break-all underline" href={ACCOUNT_DELETION_MAILTO}>{PUBLIC_CONTACT_EMAIL}</a>.</li>
        <li>Naslov poruke: <strong>{ACCOUNT_DELETION_SUBJECT}</strong>. U poruci navedi da želiš trajno brisanje naloga i povezanih ličnih podataka.</li>
        <li>Sačekaj odgovor radi potvrde vlasništva i obrade zahteva. Ako više nemaš pristup adresi naloga, opiši to u poruci; brisanje sledi tek posle provere vlasništva.</li>
      </ol>
      <p className="mt-4">Ako se aplikacija za mejl ne otvori, adresu i naslov iznad prekopiraj u svoj mejl servis. Ne šalji lozinku, JMBG, podatke kartice ili skenirane lične dokumente.</p>
    </section>
    <section className="mt-7">
      <h2 className="mb-3 text-xl font-semibold">Šta obuhvata brisanje</h2>
      <p>Zahtev obuhvata nalog, podatke profila i prijave, povezivanje sa Google nalogom, omiljene pesme, tvoje plejliste i muzičke liste, lična podešavanja lista, oznake sviđanja i podatke dobrovoljne statistike. Javni sadržaj koji si slao i prijave grešaka pregledaju se radi uklanjanja povezanih ličnih podataka.</p>
      <p className="mt-3">Brisanje je trajno. Gubiš pristup nalogu i listama, uključujući deljene liste koje pripadaju nalogu. Tvoj Google nalog i snimci na YouTube-u ostaju pod tvojom kontrolom kod tih servisa.</p>
    </section>
    <section className="mt-7">
      <h2 className="mb-3 text-xl font-semibold">Obrada i eventualno zadržavanje</h2>
      <p>Zahtev se obrađuje ručno, posle provere vlasništva. Odgovorom potvrđujemo prijem, potrebne korake i završetak obrade. Ako neki podatak mora da ostane ograničeno sačuvan radi bezbednosti ili pravne obaveze, objašnjavamo koji podatak, zbog čega i koliko dugo. Proveravaju se i rezervne kopije i podaci kod pružalaca usluga; odjava ili blokiranje naloga ne zamenjuju brisanje.</p>
    </section>
    <section className="mt-7">
      <h2 className="mb-3 text-xl font-semibold">Offline kopije na uređajima</h2>
      <p>Pre brisanja otvori „Pesme bez interneta“ na svakom uređaju na kom si čuvao liste i ukloni kopije ili obriši podatke sajta u pregledaču. Server ne može daljinski ukloniti kopiju sa uređaja koji nije povezan na internet. To nije uslov za slanje zahteva za brisanje naloga.</p>
      <a href="/offline" className="ui-button mt-3">Upravljaj offline kopijama</a>
    </section>
    <p className="mt-7"><Link href="/privatnost" className="underline">Politika privatnosti</Link>{" · "}<Link href="/kontakt" className="underline">Kontakt</Link></p>
  </article>
}
