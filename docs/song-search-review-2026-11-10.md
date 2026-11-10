# Provereni fragment, duplikat i ekvivalentne oznake akorda

Datum: 10. novembar 2026.

## Odluke vezane za tačnu verziju zapisa

`lib/seo/song-search-review-rules.json` sadrži dva ručno proverena slučaja, sa ID-jem, naslovom, putanjom, identitetom izvođača i SHA-256 otiskom originalnih polja lyrics/chords. Ne sadrži tekstove pesama ili podatke o korisnicima. Ovo nije heuristika koja proglašava svaku kratku pesmu nepotpunom ili spaja slične naslove.

- Fragment `Zombie — The Cranberries` ima 34 znaka. Ostaje dostupan na istoj adresi i sa istim ID-jem, dobija jasnu napomenu i noindex/follow. Kada se potvrdi i neizmenjena verzija potpunijeg zapisa `Zombie — Cranberries` od 1.698 znakova, prikazuje se veza do nje. Ako cilj nije dostupan ili se promenio, nema neproverenog linka. Sam fragment se ne prepisuje sadržajem drugog zapisa.
- Dva zapisa `Bela Ladja — Đorđe Balašević` imaju istovetna polja lyrics/chords. Prednost za canonical dobija putanja `balasevic-djordje-bela-ladja`, čiji zapis već ima jednu vezu iz plejliste. Drugi zapis zadržava svoj URL, ID, prikaz i kontekst plejlista. Nema preusmerenja ili spajanja redova baze. Canonical je signal Google-u, ne garancija njegovog izbora.
- Ako se izvorna verzija promeni, pravilo prestaje da važi. Kod duplikata se proverava i verzija cilja; promenjen ili obrisan cilj vraća samostalni canonical izvora. Poznati fragment ostaje označen kao nepotpun i kada privremeno ne možemo proveriti alternativu.

Metadata i prikaz proveravaju cilj samo za ove konkretne, još važeće slučajeve. Obične stranice pesama ne dobijaju novi upit bazi. Neuspeh opcionog čitanja alternative ne ruši inače dostupnu pesmu.

## Sitemap

Brojanje pesama i izbor stranica koriste isti spisak izuzetaka. Iz sitemap-a se izostavljaju samo potvrđeni fragment i aktivni duplikat. Spisak se dobija čitanjem četiri konkretna javna zapisa, kešira najviše 300 sekundi i koristi postojeću oznaku `seo-sitemap`. Ispravljen izvor ili promenjen cilj ponovo se razmatra najkasnije po isteku keša ili postojećoj invalidaciji. Redovne sitemap stranice i dalje čitaju samo slug i javnu putanju izvođača; tekstovi se ne dodaju u XML.

Greška neophodnog čitanja sitemap-a vraća postojeći retryable 503 umesto nepotpunog uspešnog XML-a.

## Dijagrami

Izbor slike najpre zadržava postojeće direktno mapiranje. Kada ono ne postoji, koristi kanonske nazive iz već instaliranog `chord-symbol` renderer-a uz `simplify: none`. Kandidat se prihvata tek kada parser potvrdi isti osnovni ton, sve intervale i slash bas. Izvorna oznaka akorda i njen prikaz pri transpoziciji ostaju isti.

Na pregledanom uzorku od 50 pesama vraćena su dva postojeća dijagrama u pesmi `Lost`: `F#msus4` koristi odgovarajući sus dijagram, a `F#m(add6)` odgovarajući m6 dijagram. Svih 865 ranije uspešnih direktnih mapiranja ostalo je isto. Nema masovnog generisanja ili zamene slika.

Za `Am6add9(no5)` postojeći dijagram `Am69` i dalje se odbija: dodao bi kvintu koja je u izvornom zapisu izričito izostavljena. Za taj simbol je potreban poseban provereni dijagram.

## Provere i objavljivanje

Prošlo je 138 odabranih testova, TypeScript i produkcioni build u izdvojenoj QA kopiji sa bazom u memoriji. Regresije proveravaju zastarele verzije, nedostupan cilj, pad opcionog čitanja, noindex, canonical, sitemap i očuvanje izvornog ID-ja/konteksta plejlista. Poseban pregled 865 postojećih mapiranja nije našao promene.

Produkcijska baza pregledana je u REPEATABLE READ / READ ONLY transakciji. Nema upisa, brisanja, migracije ili automatskog označavanja pesama kao muzički potvrđenih. YouTube plejer nije deo izmene. Objavljivanje ide kroz postojeći GitHub/Vercel postupak vlasnika.
