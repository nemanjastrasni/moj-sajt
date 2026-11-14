# Trajne muzičke procene — 14. novembar 2026.

## Ponašanje

`Song.musicAssessment` je nullable JSONB sa revizijom algoritma, SHA-256 otiskom izvornog para lyrics/chords, težinom i jedinstvenim akordima. Broj akorda i pripadnost otvorenim akordima izvode se iz sačuvanog spiska. Stara `difficulty` kolona sa istorijskim/podrazumevanim vrednostima ostaje netaknuta. Algoritam procene nije promenjen.

Administrativni unos, izmena, odobravanje predloga, CSV import i odobrene popravke sadržaja upisuju procenu u istoj transakciji sa pesmom. Neuspeh upisa procene poništava celu transakciju. Izmena samo naslova/kategorije/izvođača zadržava postojeću aktuelnu procenu; popularnost i pregledi ne pokreću računanje. Metadata-only izmena starog zapisa bez aktuelne procene popunjava je jednom.

PostgreSQL trigger proverava oblik i otisak. Izmena lyrics/chords kroz stari program ili direktni SQL poništava nepodudarajuću procenu, umesto da ostavi zastarelu vrednost. NULL i prazan chords imaju različite otiske. Proveren je isti UTF-8 otisak u Node/PostgreSQL, uključujući dijakritike i emoji.

Javni katalog i liste pesama izvođača čitaju sačuvanu procenu bez tekstova i bez ponovnog parsiranja. Samo zapisi bez procene ili sa drugom revizijom algoritma traže izvorni tekst i rezervni obračun posle RepeatableRead transakcije. Čitanje ne upisuje ništa u bazu. Za veći spoljašnji import treba pokrenuti backfill, da rezervni obračun ne ostane redovan posao.

Katalog zadržava keš od 1.800 s i `playlist-catalog` invalidaciju nakon uspešnog administrativnog unosa/izmene/brisanja/odobravanja; izvođači imaju svoj keš od 300 s. Promena algoritma menja i ključeve keša. Direktni SQL i CLI nemaju pristup Next kešu: sadržaj postaje vidljiv po isteku postojećeg keša ili posle eksplicitne aplikacione invalidacije/restarta/deploya. Sam trigger ne prazni CDN/Next keš. Ako postojeća invalidacija u aplikaciji zakaže posle commit-a, čitanje može zadržati stari keš do TTL-a; upis se ne prijavljuje kao neuspešan.

## Primena i održavanje

U trenutno povezanoj Supabase bazi dodatna kolona i trigger su već postavljeni. Popunjene su 9.404 procene; svaka je ponovo upoređena sa postojećim parserom. Nema pogrešnih/nedostajućih otisaka. Sačuvana je kontrolna vrednost poslovnog sadržaja svih pesama pre/posle, bez promene teksta, akorda, ID-jeva, URL-ova, kategorija, izvođača, datuma i stare difficulty kolone. Nije urađen deploy aplikacije.

SQL setup je odvojen od Prisma generisanja. Na drugoj bazi prvo pregledati konfiguraciju, pa eksplicitno pokrenuti:

```powershell
npm run songs:assessments -- --apply --backup C:\backup\music-assessment-before.json --ca C:\putanja\supabase-ca.crt
```

Setup dodaje nullable kolonu bez podrazumevane vrednosti i postavlja trigger u kratkoj transakciji (`lock_timeout=3s`). Backfill obrađuje samo nedostajuće/zastarele procene u grupama od 200, uz proveru aktuelnog izvornog otiska pri upisu. Ne prepisuje paralelno promenjeni tekst. Ako se postupak prekine, može se ponoviti sa novom putanjom za backup. Backup sadrži samo ID-jeve i prethodne procene; ne sadrži pesme/naloge. Ne uključivati lokalni backup u Git.

Provera postojeće baze bez upisa (nakon prvog setup-a):

```powershell
npm run songs:assessments -- --ca C:\putanja\supabase-ca.crt
```

`pending=0` znači da svaki zapis ima procenu tekuće revizije. Za promenu parsera:

```powershell
node scripts/song-assessments.cjs --refresh-version
npm run songs:assessments -- --apply --backup C:\backup\music-assessment-next.json --ca C:\putanja\supabase-ca.crt
npm run build
```

`--refresh-version` menja samo mali lokalni fajl revizije; ne pristupa bazi. Build proverava reviziju offline, generiše Prisma klijent i pokreće Next build. Stari `scripts/updateDifficulty.ts` sada prosleđuje iste eksplicitne opcije ovoj alatki; bez `--apply` ne menja podatke.

Bezbedan povratak aplikacije na prethodni commit može ostaviti novu kolonu i trigger u bazi. Stari kod ih ignoriše, a trigger poništava procene pri izmenama iz starog koda. Ne brisati kolonu dok nova verzija aplikacije radi. Vraćanje starih procena obično nije potrebno jer su izvedeni podaci; pri ručnom vraćanju trigger odbija zastareli otisak tako što postavlja NULL.

## Provere i merenje

- Instalirane verzije: Next.js 15.5.15 i Prisma 6.19.3. TypeScript, ciljano lintovanje i produkcioni Next build su prošli. Build koristi izolovane javne fixture podatke, bez produkcionih naloga i pristupnih podataka.
- Svih 799 offline testova je prošlo. Dodatno je prošlo 28 PostgreSQL provera u privremenoj šemi, sve poništene ROLLBACK-om. Ponovljiva opt-in provera: `npm run test:song-assessments-db -- --ca C:\putanja\supabase-ca.crt`.
- HTTP nad lokalnim produkcionim build-om potvrđuje novo članstvo u težini odmah posle administrativne invalidacije; deset toplih zahteva nema dodatnih čitanja kataloga ni dekompresija. Privatna lista: vlasnik 200/no-store, anoniman i drugi korisnik 404.
- Sve stranice svih javnih filtera/kategorija nad stvarnom bazom daju isti rezultat i redosled pre/posle. Novi put čita nula izvornih tekstova kada su procene popunjene.
- Jedno lokalno poređenje: hladna priprema indeksa 1.039 → 633 ms; lokalni CPU 454 → 172 ms. Stari snapshot je morao da parsira 10 novih pesama; novi put nijednu. Novi skup metapodataka je veći (3,76 MB naspram 2,31 MB), ali ne računa izvorne otiske pri svakom osvežavanju. Ovo nije procenat uštede Vercel/Render računa niti obećano vreme svakog zahteva.

Posle korisničkog deploya proveriti unos i izmenu jedne pesme, filtere težine i listu izvođača. Uporediti jednake periode i sličan broj zahteva: CPU po 1.000 zahteva, vreme odgovora p50/p95, greške, hladne zahteve i osvežavanje posle isteka keša. Na Render Free ostaje uspavljivanje instance; čuvanje procene ne uklanja to čekanje.
