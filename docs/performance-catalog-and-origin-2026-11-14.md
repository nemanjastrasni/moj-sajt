# Katalog, indeksi i Render origin: 14. novembar 2026.

## Javne procene kataloga

`lib/playlists/catalog-assessments.json` sadrži ID javne pesme, SHA-256 otisak para lyrics/chords i postojeću procenu težine/akorda. Tekstovi pesama i podaci korisnika nisu u tom fajlu. Fajl se učitava samo na serveru.

Hladna priprema kataloga prvo čita javne metapodatke i otiske sadržaja. Podudarni zapisi koriste pripremljenu procenu. Samo nove ili izmenjene pesme zahtevaju čitanje tekstova i sveže računanje. Metapodaci i tekstovi izmena čitaju se kroz RepeatableRead transakciju; CPU obrada je posle završetka transakcije. Time izmena između dva čitanja ne može spojiti otisak jedne verzije sa tekstom druge.

Naslovi, kategorije, izvođači, popularnost i redosled ostaju iz aktuelne baze. Brisanje pesme uklanja je iz naredne pripreme čak i ako njen stari ID postoji u fajlu. Sve postojeće oznake za administrativno poništavanje keša i TTL od 1.800 sekundi su zadržani. SQL izmene van aplikacije i dalje zahtevaju redovno osvežavanje ili odgovarajuću aplikacionu invalidaciju.

Pripremljeni skup ima 9.394 pesme. Provera nad stvarnim javnim korpusom potvrdila je jednake procene, članstvo u svim katalozima i redosled za svaki zapis. Za buduće izmene računanje automatski prelazi na postojeći algoritam čim se otisak ne podudara.

## Obnavljanje i provera fajla

`npm run build` prvo proverava da pripremljene procene odgovaraju izvornom parseru i zaključanoj verziji chord-symbol biblioteke. Promena parsera zahteva ponovno generisanje, kako stare procene ne bi promenile značenje. Ova provera pri build-u ne pristupa bazi. Revizija algoritma deo je serverskog ključa keša.

```powershell
npm run catalog:snapshot:check
```

Posle izmene algoritma ili većeg uvoza javnih pesama:

```powershell
npm run catalog:snapshot:generate -- --ca C:\putanja\supabase-ca.crt
```

Skript koristi postojeći DATABASE_URL, READ ONLY transakciju i verifikovan TLS. Rezultat se čuva u navedenom JSON fajlu projekta; zatim ga treba uključiti u Git. Za osvežavanje se ne menjaju podaci ili šema baze. Neiskorišćeni stari zapisi ne mogu vratiti obrisanu pesmu u katalog. Mala razlika između fajla i baze rešava se runtime proverom otisaka, pa nije potrebno generisati fajl posle svake pojedinačne izmene.

## Indeksi za početnu i top liste

Pripremljen je i u postojećoj povezanoj Supabase bazi primenjen sledeći dodatni par:

- `Song_home_popular_idx`: `(popularity DESC, id ASC)`.
- `Song_home_latest_idx`: `("createdAt" DESC NULLS LAST, id DESC)`.

Primena koristi CREATE INDEX CONCURRENTLY, lock_timeout od 3 sekunde i statement_timeout od 60 sekundi. Ne ažurira redove. Zauzeće je oko 1 MiB zajedno. Skript proverava validnost, kolone i NULL redosled; ekvivalentne indekse sa drugim imenima zadržava. Ne briše ili popravlja sporan postojeći indeks automatski.

Provera bez izmena:

```powershell
npm run home:indexes -- --ca C:\putanja\supabase-ca.crt
```

Za drugu bazu, nakon provere njene konfiguracije, eksplicitna primena:

```powershell
npm run home:indexes -- --apply --ca C:\putanja\supabase-ca.crt
```

Na proveravanoj bazi stvarni planovi pre/posle: popularne 8,486 → 0,093 ms; najnovije 8,554 → 0,076 ms. To je vreme SQL izvršavanja u tom uzorku, a ne vreme kompletnog otvaranja stranice. Postojeći search indeksi ostaju isti.

## Poreklo zahteva iza proxy-ja

`lib/auth/origin.cjs` koristi konfigurisani NEXTAUTH_URL, zatim SITE_URL, a u odsustvu konfiguracije stvarni Request URL. Ne koristi prosleđene Host/X-Forwarded-* vrednosti za odobravanje porekla. Strani domeni i sec-fetch-site=cross-site se odbijaju. Zahtevi bez Origin zadržavaju postojeće ponašanje uz redovne provere naloga i prava.

Zajednička provera primenjuje se na administrativne izmene, predloge pesama/plejliste, prijave problema i heartbeat. Render zahtevi sa internim localhost URL-om prihvataju pravilno podešen javni HTTPS origin. Presence cookie dobija Secure prema tom pouzdanom javnom origin-u.

NEXTAUTH_URL u produkciji treba da ostane `https://www.gitarakordi.com`. Ovim izmenama environment podešavanja nisu menjana. Preview i lokalna okruženja treba da imaju svoj javni URL ako podržavaju mutacije.

## Prisustvo i predučitavanje

Vidljiv tab šalje heartbeat na 60 sekundi umesto 30. Aktivni prozor ostaje dva minuta, a promena naloga i povratak na vidljiv tab i dalje pokreću proveru. HTTP putanje više ne pokušavaju CREATE TABLE/CREATE INDEX. Provisioning ostaje u postojećoj komandi `presence:setup` i treba ga izvršiti pre prve upotrebe na potpuno novoj bazi.

Čišćenje starih presence redova deli istovremeni posao i radi najviše jednom u minutu po procesu. Brojači i dalje koriste SQL vremenski odsek, pa preostali stari redovi ne povećavaju broj online korisnika. Neuspešno čišćenje nije označeno kao uspešno i sledeći pokušaj može ponoviti posao.

Footer linkovi do foto i wiki izvora imaju prefetch=false. Otvaranje linkova radi kao ranije; veliki dokumenti ne preuzimaju se samo zato što je footer ušao u vidno polje.

## Provera i granice merenja

- 340 relevantnih testova prošlo je nakon prilagođavanja test fixture baze novim metapodatkovnim čitanjima i eksplicitnom javnom test origin-u.
- TypeScript nad izmenjenim projektom i Next.js 15.5.15 produkcioni build sa izolovanom in-memory fixture bazom prolaze. Build nije koristio produkcione kredencijale.
- Lokalni HTTP scenariji: deset toplih zahteva ne ponavlja čitanje kataloga ili raspakivanje; administrativna invalidacija prikazuje izmenu sledećim zahtevom. Vlasnik privatne liste dobija 200, anonimni i drugi nalog 404, uključujući anonimni zahtev odmah posle vlasnika. Vlasnikov HTML ostaje private/no-store.
- Wiki TTL i administrativna invalidacija ostali su ispravni u istom lokalnom HTTP testu.
- Provera 192 klijentska JS chunk-a nije pronašla otisak iz serverskog fajla procena; pripremljeni skup nije dodat klijentskom paketu.
- Lokalni početni profil starog koda: oko 4.000 ms CPU za hladan katalog. Novi profil: oko 94–265 ms lokalnog CPU-a u ponovljenim uzorcima, uz očuvanje svih 9.394 rezultata. U zasebnom instrumentiranom uzorku hladan poziv trajao je oko 0,68–0,97 s i uključivao dodatni EXPLAIN audit; prvi raniji novi uzorak sa sporijom mrežom trajao je 2,71 s. To nisu Render/Vercel CPU merenja i ne garantuju istu mrežnu latenciju.
- Nova metapodatkovna provera otisaka zahteva dodatni SQL rad; izmereno je oko 171 ms za kompletan javni skup, bez privremenog sortiranja na disku. Odgovor sa metapodacima je oko 2,31 MB, u poređenju sa oko 15,91 MB ranijih redova sa tekstovima. Taj posao se i dalje deli serverskim kešom od 30 minuta.

Objava koda nije pokrenuta. Posle odobrene objave treba proveriti stvarne hladne/toplije zahteve na Renderu, uspešno čuvanje biografije i online brojač, te CPU/RAM grafikon. Vercel Active CPU ušteda može se izmeriti tek kada ta verzija radi na Vercelu.
