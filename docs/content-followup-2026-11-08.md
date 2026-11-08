# Nastavak dopune sadržaja — 8. novembar 2026.

## Upisano u bazu

Popunjena su isključivo prethodno prazna polja. Biografija i diskografija grupe **Suncokret** dodate su na postojeći profil **Suncokreti**: identitet Q432722 potvrđen je pesmama „Moje bube“ i „Prvi sneg“. Naziv profila nije menjan.

| Izvođač | Dodata izdanja | Izbor izvora |
| --- | ---: | --- |
| Del Arno Band | 7 | 4 studijska, 1 koncertno, 2 kompilacije; [en Wikipedia, revizija 1380337768](https://en.wikipedia.org/w/index.php?oldid=1380337768) |
| Indira Radic | 16 | Samo studijski albumi; [bs Wikipedia, revizija 3836464](https://bs.wikipedia.org/w/index.php?oldid=3836464) |
| Miroslav Škoro | 11 | Samo studijski albumi; [hr Wikipedia, revizija 7572007](https://hr.wikipedia.org/w/index.php?oldid=7572007) |
| Doris Dragovic | 25 | 14 studijskih, 3 koncertna, 8 kompilacija; izostavljena prva dva izdanja grupe More; [en Wikipedia, revizija 1376704972](https://en.wikipedia.org/w/index.php?oldid=1376704972) |
| Gipsy Kings | 14 | 13 studijskih i 1 koncertno; [en Wikipedia, revizija 1382164504](https://en.wikipedia.org/w/index.php?oldid=1382164504) |
| Suncokreti | 1 | „Моје бубе“, 1977; tip zadržan kao opšti album; [sr Wikipedia, revizija 30861011](https://sr.wikipedia.org/w/index.php?oldid=30861011) |

Ukupno: **1 biografija, 6 diskografija, 74 izdanja**. Ovo su proverene odabrane liste, ne tvrdnja da su sve diskografije potpune. Pinned Wikipedia izvori i hash vrednosti upisani su u `ArtistWikiProfile` u istoj transakciji kao sadržaj; licence i atribucija ostaju prikazane preko postojećeg sistema izvora.

Sve 1.231 Artist stavke upoređene su pre i posle: promenjeno je tačno sedam odobrenih praznih polja. Sačuvani su svi ostali podaci izvođača. Hash poređenje svih 9.393 zapisa pesama (uključujući nazive, putanje, veze sa izvođačima, tekstove i akorde) i cele tabele SongReview potvrđuje da nisu menjani. Provereno je i svih sedam novih izvornih kredita.

Privatna rezervna kopija: `C:\Users\dimit\Documents\Codex\2026-10-31\da\outputs\content-followup-2026-11-08\database-additions-2026-11-08T11-38-05-077Z`. Sadrži prethodne Artist vrednosti, prethodne izvorne profile, nameru transakcije, rezultat i verifikaciju. Vraćanje zahteva proveru da posle ove dopune nije bilo ručnih izmena; Git ne vraća sadržaj baze.

## Fotografije spremne za objavu

Dodato je **7 lokalnih WebP fotografija** sa autorom, licencom, izvorom i kontrolnim zbirom u `public/artist-photos/manifest.json`:

- Bajaga — Miomir Magdevski, CC BY-SA 4.0.
- U 2 — Remy, CC BY 4.0.
- George Michael — University of Houston Digital Library, Public domain; uključen i traženi kredit „Courtesy of Special Collections, University of Houston Libraries.“
- Frank Sinatra — Columbia Pictures Corporation, Public domain.
- John Mayer — Thatcommonkid, CC BY-SA 4.0.
- Nils Lofgren — Martin Olbrich, CC BY-SA 2.5.
- Robert Johnson — autoportret, Public domain.

Sve fotografije su vizuelno pregledane. Ranije objavljene slike i njihovi krediti ostaju neizmenjeni. U bazi nisu upisivane slike: postojeći prikaz koristi lokalni katalog nakon deploya. Kandidati Justin Bieber, Anastacia i Lost Frequencies nisu objavljeni jer ih postojeći strogi filter zadržava zbog metapodatka `personality`. Fotografija spomenika grupi Smak je odbačena kao neodgovarajući portret benda.

Posle deploya katalog će povezivati **523 od 1.231 izvođača sa fotografijom (oko 42,5%)**; lokalni manifest sadrži 468 zapisa. Broj povezanih fotografija obuhvata i ranije ručno upisane URL-ove i nije nova potvrda dostupnosti svakog spoljnog URL-a. Pokrivenost od 75% još nije dostignuta.

## Sprečene greške i admin nalazi

Parser sada odbija metapodatke kao što je „Released: April 22“ kada bi završili u nazivu albuma. Takođe zadržava za pregled zapis sa više različitih godina u istim zagradama, umesto da godinu reizdanja proglasi godinom prvog izdanja. Dodati su regresioni testovi za oba stvarna formata izvora.

Automatski uvoz diskografija Zvonka Bogdana i Miše Kovača zadržan je u `scripts/wiki-discography-holds.json`: prvi izvor koristi nepodržane kartice i sadrži naslov koji treba dodatno proveriti; drugi meša reizdanja, ponovljene naslove i vrste izdanja. Te liste nisu upisane.

U **Admin → Nadzor sajta** osvežen je pregled stanja i izbor 60 konkretnih nalaza. Kartice za Zvonka Bogdana i Mišu Kovača jasno kažu da problem potiče iz pripreme izvora i da diskografija nije objavljena; kartica fotografije grupe Smak opisuje pronađeni spomenik. Svaka kartica vodi na konkretan profil i editor. Datum provere pesama ostaje datum prethodnog odvojenog audita, ne datum ove dopune.

Osam ranije prijavljenih pogrešnih biografija, postojeći tekstovi pesama, akordi i oznake pregleda ostaju sačuvani za vlasnikovu odluku. Podaci o prisustvu biografije nisu ocena tačnosti njenog sadržaja.

Poslednji provereni GitHub Actions run [42475868857](https://github.com/nemanjastrasni/moj-sajt/actions/runs/42475868857), commit `4657f19`, uspešno je završio javne provere i korak objavljivanja validiranih detalja za admin panel. Direktno čitanje javnog annotations API-ja iz lokalnog okruženja završilo je timeoutom; prijavljeni admin ekran u produkciji nije testiran u ovoj turi.

## Provere

- Svih **111 regresionih testova** za parser, dopunu i atribuciju, katalog biografija, fotografije i admin nalaze prošlo je posle konačnih izmena podataka.
- Provera novih lokalnih slika i očuvanja prethodnih **461 manifest zapisa** prošla je, kao i dodatne provere na stvarnom preuzetom HTML-u Zvonka Bogdana i Miše Kovača.
- **40 provera prikaza admin panela** (pet oblasti, četiri širine, dve teme) prošlo je bez horizontalnog prelivanja i JavaScript grešaka. Korišćen je izolovani SSR prikaz stvarnih komponenti i preslikanih podataka, bez prijave u produkcioni admin.
- Ciljani ESLint i `git diff --check` prošli su. Novi puni produkcioni build nije pokretan; nema izmena TypeScript komponenti ili javnog rasporeda.
- Nema izmena javnog rasporeda stranica, schema migracija, commitovanja, pushovanja ni deploya u ovoj turi. Za fotografije, osvežene admin nalaze i zaštite parsera potreban je Git/deploy; dopune praznih polja baze već su izvršene.
