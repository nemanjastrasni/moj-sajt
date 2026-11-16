# Potpuno jednake pesme — 16. novembar 2026.

## Nalaz i trenutno stanje

U bazi je provereno **299 parova** kod istog izvođača. Naslov, tekst, akordi i
kategorija poređeni su bez normalizacije, kao i svi ostali podaci u redu osim
ID-ja, sluga, datuma nastanka i broja pregleda. Hash služi za pronalaženje
kandidata; stvarni stringovi se takođe porede. Različiti izvođači, obrade,
različite verzije, Unicode zapisi, razmaci, null/prazni akordi i nepotpuni
zapisi ne smatraju se istim.

Plan je `scripts/data/exact-song-duplicates-2026-11-16.json`. Sadrži javne
identitete, adrese i kontrolne vrednosti, bez tekstova pesama ili korisničkih
podataka. `lib/seo/exact-song-redirects.json` sadrži 299 odgovarajućih 308
preusmeravanja koja Next.js učitava pri buildu.

**Čišćenje je završeno 16. novembra 2026.** Posle potvrde svih 299 već
objavljenih preusmeravanja, svežeg šifrovanog backupa i ponovnog poređenja
sadržaja uklonjeno je 299 duplikata u jednoj uspešno potvrđenoj transakciji.
Broj pesama je smanjen sa **9.411 na 9.112**. Nije pokrenut novi deploy.

Završna nezavisna provera baze potvrđuje svih 299 zadržanih ID-jeva, jednake
kontrolne vrednosti sadržaja i metapodataka, odsustvo svih uklonjenih ID-jeva,
tri sačuvane veze iz plejlista i nula stavki plejlista bez postojeće pesme.
Ponovljena HTTP provera uzorka starih URL-ova posle brisanja potvrđuje 308,
ciljeve sa statusom 200 i očuvanje query parametara. Privatni dnevnik
originalnih redova i potvrda COMMIT-a čuvaju se izvan repozitorijuma.

Posle čišćenja proveren je i javni sitemap: svih 10 datoteka za pesme vraća
200, sadrže ukupno 9.111 jedinstvenih URL-ova, svih 299 zadržanih ciljeva i
nijedan od 299 uklonjenih izvora. Jedna nepotpuna pesma ostaje isključena
postojećim uredničkim pravilom, zato se broj URL-ova razlikuje od broja
redova u bazi.

Tri para imaju jedan zapis u plejlisti. Taj ID ostaje, zajedno sa stavkom
plejliste, redosledom, transpozicijom i capom. Ne prebacuju se niti brišu
korisničke veze. Ako oba zapisa imaju veze, par se preskače. Proveravaju se
svi stvarni strani ključevi ka tabeli Song, uključujući buduće relacije, i
ID-jevi u AdminContentProposal (posebno istorija spajanja izvođača).

Prednost pri izboru zapisa koji ostaje imaju postojeće veze, zatim ranije
proveren canonical cilj, broj pregleda i kraći slug. Brojači na zadržanom
zapisu ostaju nepromenjeni; uklonjeni red sa svojim brojačem čuva se u
privatnom dnevniku. Ovo čišćenje nije garant boljeg Google rangiranja.

## Provera pre brisanja

- Prošao je build sa Next.js **15.5.15**, u odvojenom direktorijumu sa javnim
  test podacima, bez produkcionih kredencijala.
- Svih 299 preusmeravanja provereno je HTTP zahtevima prema tom buildu.
  Vraćaju 308 i čuvaju parametre plejlista, plejera, transpozicije i capoa.
- Na postojećoj bazi izvršena je provera 299 brisanja u jednoj transakciji,
  koja je zatim **u celosti poništena**. Nije izvršen COMMIT.
- Posebni testovi koriste ugrađeni PostgreSQL (PGlite) i proveravaju nove
  reference, ON DELETE CASCADE, očuvanje podešavanja i rollback.
- Napravljen je šifrovani backup public šeme: autentifikacija, checksum i
  čitljivost pg_dump arhive su provereni. Potpun lokalni restore tog backupa
  nije potvrđen jer lokalna PostgreSQL instalacija nema sve potrebne alate.
  Backup nije kopiran na drugo mesto. Ključ se čuva odvojeno i ne ide u Git.

## Redosled primene

Ovaj redosled je već izvršen. Ne pokretati isti plan ponovo: izvori su
uklonjeni, pa ponovni check/apply treba da stane sa `MISSING_RECORD`.

1. Pregledati i commitovati ovaj kod, pa korisnik pokreće deploy.
2. Dok se čišćenje ne završi ne menjati ovih 299 parova. Stalna
   preusmeravanja važe od deploya, i pre brisanja izvornog reda.
3. Napraviti svež šifrovani backup skriptom `scripts/application-backup.cjs`.
   Koristiti lokacije izvan repozitorijuma, odvojen ključ i proveren CA.
4. Ponovo proveriti sadržaj i veze:

   ```powershell
   node scripts/exact-song-duplicates.cjs --mode check --plan scripts/data/exact-song-duplicates-2026-11-16.json --ca C:/putanja/supabase-ca.crt
   ```

   Ovaj režim proverava DELETE i strane ključeve, ali poništava transakciju.
5. Primeniti odobreno čišćenje:

   ```powershell
   node scripts/exact-song-duplicates.cjs --mode apply --plan scripts/data/exact-song-duplicates-2026-11-16.json --ca C:/putanja/supabase-ca.crt --backup C:/privatni-backup/application-DATUM.gakbackup --key C:/odvojeni-kljucevi/application-backup.key --journal C:/privatni-dnevnici/exact-songs-DATUM
   ```

   Skripta pre transakcije proverava **svih 299 javnih izvora i ciljeva**:
   izvor mora vratiti 308 na očekivani URL sa sačuvanim query parametrima,
   cilj mora vratiti 200. Backup mora biti autentifikovan, iz iste baze i
   napravljen pre manje od jednog sata. Nema automatskog pokretanja u buildu,
   deployu, instalaciji ili aplikaciji.

   Transakcija zaključava obuhvaćene pesme i izvođače, blokira nove izmene
   admin istorije dok proverava reference, ponovo poredi stvarni sadržaj i
   sve zavisnosti, zapisuje privatni dnevnik sa originalnim redovima pa briše
   samo izvore. Promenjen sadržaj ili nova veza zaustavljaju celu turu.
   Proverava se da ciljni redovi i postojeće reference ostanu nepromenjeni.
6. Proveriti broj pesama, stare URL-ove, pretragu, sitemap i tri postojeće
   stavke plejlista. Potvrđeno je 9.112 zapisa nakon uspešnog brisanja 299
   duplikata iz prethodnih 9.411. Javni keševi se osvežavaju po postojećem
   TTL-u; privremeni stari link u keširanoj listi i dalje radi preko 308.

Ako skripta prijavi neizvestan COMMIT ili nedostaje `result.json`, prvo
proveriti bazu i `before.json`; ne ponavljati apply naslepo. Ako se sadržaj
promenio, pregledati novi plan i odgovarajuća preusmeravanja pre novog deploya.

## Povratak uklonjenih redova

```powershell
node scripts/exact-song-duplicates.cjs --mode rollback --plan scripts/data/exact-song-duplicates-2026-11-16.json --ca C:/putanja/supabase-ca.crt --journal C:/privatni-dnevnici/exact-songs-DATUM
```

Povratak zahteva potvrđen dnevnik primene i odbija da prepiše ponovo
iskorišćen ID, slug ili kasnije promenjen ciljni zapis (uključujući preglede).
Vraća originalne redove, null vrednosti i PostgreSQL timestamp tekst bez
zaokruživanja. U takvoj situaciji potrebno je posebno pregledati konflikt.
Preusmeravanja ostaju aktivna dok se namerno ne uklone novim deployem.

## Testovi

```powershell
node --test scripts/test-exact-song-duplicates.cjs scripts/test-catalog-maintenance.cjs
```

Za PostgreSQL integracioni test postaviti `DEDUPE_PGLITE_MODULE` na lokalnu
instalaciju paketa `@electric-sql/pglite`. Bez tog paketa SQL test je označen
kao preskočen, ostali testovi se izvršavaju. Produkciona baza se za te testove
ne koristi.
