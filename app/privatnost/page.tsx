import Link from "next/link"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { CONTACT_MAILTO, PUBLIC_CONTACT_EMAIL, PUBLIC_OPERATOR_NAME } from "@/lib/site-contact"

export const metadata = publicPageMetadata("Politika privatnosti", "Kako GitarAkordi obrađuje podatke naloga, plejlista, dobrovoljne statistike i offline kopija i kako možeš zatražiti brisanje.", "/privatnost")

const sections = [
  {
    title: "Nalog i podaci koje unosiš",
    paragraphs: [
      "Za nalog čuvamo identifikator, ime, email adresu, datum registracije i podatke potrebne za prijavu i bezbednost naloga. Lozinka se čuva kao heš, a ne kao čitljiv tekst. Ako izabereš Google prijavu, obrađujemo ime, email, profilnu sliku i podatke povezivanja koje Google prosledi za tu prijavu. Tvoju Google lozinku ne dobijamo.",
      "Profil može sadržati fotografiju ili avatar, biografiju, grad, državu, podatke o rođenju i nivo sviranja koje uneseš. Opcione podatke ne moraš unositi. Podaci naloga koriste se za prijavu, rad tvojih funkcija, podršku i zaštitu sajta.",
    ],
  },
  {
    title: "Plejliste i doprinosi sajtu",
    paragraphs: [
      "Čuvamo tvoje omiljene pesme, plejliste, redosled pesama, podešavanja tonaliteta i capoa, muzičke liste sa YouTube linkovima i oznake sviđanja. To omogućava da svoje liste koristiš na različitim uređajima. Liste koje označiš kao javne i njihov sadržaj dostupni su drugim posetiocima; privatne liste nisu namenjene javnom prikazu.",
      "Ako pošalješ predlog pesme, prijavu greške ili poruku podršci, obrađujemo sadržaj i podatke potrebne da odgovorimo i uredimo sajt. Prihvaćen sadržaj pesama može biti javno objavljen. Slobodan tekst prijava i poruka može sadržati lične podatke, zato unesi samo ono što je potrebno za zahtev.",
    ],
  },
  {
    title: "Prisustvo i dobrovoljna statistika",
    paragraphs: [
      "Brojač prisutnih koristi nasumičan identifikator posetioca u kolačiću ga_visitor, sa trajanjem od 30 minuta, i poslednje javljanje sajtu. Kod prijavljenih posetilaca zapis se povezuje sa nalogom. Administrator vidi nedavno prisutne naloge; javno se prikazuju samo brojevi. Kada hosting pouzdano dostavi oznaku države posete, kratkotrajni zapis može sadržati i tu približnu državu. Ova funkcija ne čuva GPS lokaciju ili istoriju kretanja.",
      "Zapisi prisustva stariji od deset minuta čiste se tokom narednih zahteva za pregled prisustva. Bez novih zahteva fizičko brisanje može sačekati; zastareli zapisi ne ulaze u broj trenutno prisutnih.",
      "Dodatno merenje povratka i korišćenja plejlista podrazumevano je isključeno. Možeš ga uključiti ili isključiti na profilu. Beleže se ID naloga, dan aktivnosti, odluka o uključivanju i dnevne oznake korišćenja pesme iz plejliste, režima sviranja ili muzike. U tu statistiku ne upisujemo nazive ili identifikatore pesama i lista, istoriju pretrage ili IP adresu. Podaci su povezani sa nalogom; administrator vidi zbirni izveštaj.",
      "Statistika koristi poslednjih 90 UTC kalendarskih dana. Stariji dnevni zapisi čiste se pri narednom merenju ili izradi izveštaja. Isključivanje na profilu briše dotadašnje dnevne zapise i početak perioda merenja; odluka o isključivanju ostaje uz nalog. Ostale funkcije rade i bez uključivanja ove statistike.",
    ],
  },
  {
    title: "Podaci na uređaju i rad bez interneta",
    paragraphs: [
      "Kolačići prijave održavaju sesiju i štite tok prijavljivanja. Pregledač lokalno pamti i podešavanja kao što su tema, jezik i prikaz pesama. Ako izabereš čuvanje za offline, pesme iz odabrane liste i njena preuzeta podešavanja čuvaju se u memoriji pregledača na tom uređaju, a service worker čuva javne fajlove potrebne za otvaranje offline prikaza.",
      "Offline kopije nisu šifrovani sef: neko ko ima pristup istom uređaju i profilu pregledača može ih otvoriti. U odeljku „Pesme bez interneta“ možeš obrisati kopije; odjava i prelazak na drugi nalog uklanjaju sačuvane offline liste na tom pregledaču. Brisanje naloga na serveru samo po sebi ne može daljinski ukloniti kopiju sa uređaja koji nema internet. Kopije i ostale lokalne podatke možeš ukloniti i brisanjem podataka sajta u podešavanjima pregledača.",
    ],
  },
  {
    title: "Mikrofon i spoljni servisi",
    paragraphs: [
      "Štimer traži dozvolu za mikrofon tek kada ga pokreneš. Zvuk se obrađuje na uređaju radi određivanja tona; ova funkcija ga ne snima niti šalje našem serveru. Mikrofon možeš zaustaviti u štimeru i opozvati dozvolu u podešavanjima uređaja ili pregledača.",
      "Za posluživanje sajta koristimo Render, a za bazu podataka Supabase/PostgreSQL. Hosting i mrežni servisi pri obradi zahteva dobijaju tehničke podatke kao što su IP adresa, podaci pregledača i tražena adresa. Njihovi tehnički dnevnici i rezervne kopije imaju zasebna podešavanja čuvanja; rokove iz dobrovoljne statistike ne treba poistovećivati sa tim dnevnicima.",
      "Izbor Google prijave ili učitavanje YouTube plejera uspostavlja vezu sa Google/YouTube servisima. Oni mogu obrađivati tehničke podatke, kolačiće i podatke o reprodukciji prema svojim pravilima. Linkovi ka spoljnim sajtovima takođe vode na servise sa sopstvenim pravilima privatnosti.",
    ],
  },
  {
    title: "Čuvanje, prava i brisanje podataka",
    paragraphs: [
      "Podaci naloga i sačuvanih lista ostaju dok koristiš nalog, dok ih sam ne ukloniš tamo gde postoji ta opcija ili dok se ne obradi zahtev za brisanje. Predlozi, prijave i prepiska ne brišu se automatski po roku statistike. Pri zahtevu za brisanje pregledaju se i povezani zapisi i slobodan tekst koji može sadržati tvoje lične podatke.",
      "Možeš zatražiti pristup, ispravku ili brisanje ličnih podataka i objašnjenje njihove obrade preko kontakta ispod. Za brisanje celog naloga koristi posebno objašnjen postupak. Pre postupanja proveravamo da zahtev dolazi od vlasnika naloga. Ako neki podatak mora ograničeno da se zadrži radi bezbednosti ili pravne obaveze, u odgovoru navodimo podatak, razlog i period zadržavanja. Obrada zahteva obuhvata i proveru rezervnih kopija i podataka kod pružalaca usluga.",
    ],
  },
]

export default function PrivacyPage() {
  return <article className="mx-auto max-w-3xl py-8 leading-relaxed" lang="sr-Latn">
    <h1 className="mb-3 text-2xl font-bold">Politika privatnosti — GitarAkordi</h1>
    <p className="text-sm text-gray-400">Poslednja izmena: 19. novembar 2026.</p>
    <p className="mt-4">Ovo obaveštenje važi za sajt GitarAkordi i njegovu aplikaciju za telefon, uključujući offline funkcije. Sajt vodi {PUBLIC_OPERATOR_NAME}, fizičko lice iz Srbije.</p>
    <p className="mt-3">Kontakt za privatnost: <a href={CONTACT_MAILTO} className="break-all underline">{PUBLIC_CONTACT_EMAIL}</a>.</p>
    <Link href="/brisanje-naloga" className="ui-button mt-5">Zatraži brisanje naloga i podataka</Link>
    {sections.map(section => <section key={section.title} className="mt-8">
      <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
      {section.paragraphs.map(paragraph => <p key={paragraph.slice(0, 40)} className="mt-3">{paragraph}</p>)}
    </section>)}
    <p className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
      <Link href="/profile" className="underline">Profil i dobrovoljna statistika</Link>
      <a href="/offline" className="underline">Upravljaj offline kopijama</a>
      <a href="https://policies.google.com/privacy?hl=sr" className="underline">Google politika privatnosti</a>
      <Link href="/kontakt" className="underline">Kontakt</Link>
    </p>
  </article>
}
