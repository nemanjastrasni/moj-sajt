# Javno čitanje procena bez inicijalizacije parsera

Provera posle deploya `68e5488` potvrdila je dostupnost početne, wiki izvora, javnih kataloga, izvođača, pesme i pretrage (27 GET zahteva, svi HTTP 200). Poslednji Render deploy je korisnik potvrdio i snimkom panela sa oznakom Live. Prva proverena plejlista imala je odgovor od približno 4,8 s, naredna dva 205/300 ms. To nije garantovano hladan start niti merenje CPU naplate. Biblioteka za muzičku analizu bila je deo inicijalizacije i kada su korišćene samo trajne procene.

## Izmena

- `catalog-model.ts` sadrži iste definicije i uslove filtriranja, sa prikaznim podacima iz `difficultyModel`. Stari `catalog.ts` ostaje kompatibilan za pozive koji eksplicitno računaju izvorni sadržaj.
- Javni katalog i čitanje pesama izvođača koriste `assessMissingSongs`. Biblioteka se uvozi tek kada postoje nedostajuće procene; obračun i dalje sledi postojeći algoritam, posle završetka transakcije.
- Prikazni nazivi/opisi i linkovi kataloga više ne uvoze ceo algoritam. Lista izvođača zadržava rezervni obračun za stare pozivaoce, koji se pokreće samo ako nisu dostavili procenu.
- Zajednički `SubmissionError` i provera JSON zahteva izdvojeni su iz validacije muzičkog sadržaja. Jednostavan model podešavanja plejliste tako više ne uvlači parser u klijentski paket. Ista klasa se ponovo izvozi iz starog modula; provera porekla, granica veličine, autorizacija i poruke ostaju iste.
- Nisu menjani TTL, oznake invalidacije, redosled, pripadnost filterima, algoritam procene, šema baze ili tekstovi pesama. Revizija procene ostaje ista.

## Dopuna podataka i provere

Sedam pesama je dodato posle prvog backfill-a, približno 30 sekundi pre commita `68e5488`. Za tih sedam dopunjene su isključivo izvedene procene, uz poređenje sa postojećim parserom i kontrolnu vrednost celokupnog sadržaja/metapodataka pre/posle. Nije primenjen novi SQL setup ili menjana šema. PostgreSQL timestamp bez vremenske zone čitan je kao UTC, u skladu sa Prisma vrednostima; pg podrazumevano tumačenje lokalne zone nije korišćeno za poređenje datuma.

Svih šest postojećih indeksa je validno i spremno. Baza u trenutku provere ima 9.411 pesama i oko 51,4 MB ukupnog prostora. Sam taj obim nije dokaz problema sa opterećenjem. Nema pogrešnih otisaka; završna provera popunjenosti je u pratećem izveštaju.

Svih 803 offline testa je prošlo, uključujući novu proveru granice modula koja prekida test ako redovno javno čitanje inicijalizuje `chord-symbol`. Test pokriva i rezervni obračun kada procena nedostaje. Prolaze i postojeće provere izbora pesama, privatnosti, unosa, grešaka i istog porekla zahteva. Produkcioni build proverava se nad izdvojenim javnim fixture podacima; produkcioni upisi nisu deo build-a ili HTTP provere.

Produkcioni build (Next.js 15.5.15), TypeScript i ciljano lintovanje su prošli. Prema izveštaju build-a, First Load JS za `/plejliste/[id]` smanjen je sa 177 na 154 kB, a za `/profile/plejliste` sa 156 na 133 kB. To su veličine iz build-a, ne brzina korisničke mreže ili dokaz određene CPU uštede. Test granice je deo `npm run test:playlists`.

Ova izmena smanjuje nepotrebnu inicijalizaciju i zavisnosti. Ne dokazuje da je svih 4,8 s posledica parsera i ne uklanja Render Free uspavljivanje. Nakon korisničkog deploya treba ponoviti iste rute i pratiti CPU po 1.000 zahteva i p50/p95 odgovora u uporedivim periodima. U ovom koraku nisu pokretani Git push ili deploy. Rad na tabulaturama je pauziran na zahtev korisnika.
