# Diskografije i aktuelno stanje nalaza

## Unos i prikaz

Zajednički parser prikaza prepoznaje naslove grupa Albumi/Studijski albumi, Singlovi/Singl-ploče, Kompilacije i Live/Koncertni albumi. Naslov grupe više nije red izdanja bez godine. Dodat je tip `single`; stari tipovi i postojeći JSON metapodaci ostaju podržani.

Podržani su `1977 — Naziv`, `1977. Naziv`, `Naziv (1977)`, `Naziv — 1977.` i `Naziv (Izdavač, 1977)`. Izdavač se prikazuje ispod naslova, uz godinu u postojećoj levoj koloni. Poznati izdavači u zasebnoj zagradi ispred godine takođe se izdvajaju. Godine u samom nazivu albuma i napomene koje nisu izdavači ne uklanjaju se. Dvosmisleni datumi se ne izmišljaju.

Naslov celine neposredno pre naslova vrste izdanja ostaje zasebna celina. Tako Bajagin unos zadržava „Riblja čorba“ i „Bajaga i instruktori“. Kombinovani naslov „Kompilacije, koncertni albumi i mini-albumi“ čuva se kao zajednička grupa, bez nagađanja vrste svakog izdanja.

U editoru se postojeće liste stringova prikazuju kao redovi za jednostavno dopunjavanje. Strukturirani JSON ostaje JSON, uključujući dodatne izvore, licence, revizije i druga polja. Dodat je pregled pre čuvanja koji koristi istu tabelu kao javni profil. Čuvanje i dalje prolazi kroz istu autorizaciju, provere porekla zahteva i kontrolni zbir aktuelnog zapisa.

Ovo je promena prikaza postojećih vrednosti, bez migracije ili direktnog ažuriranja produkcionih diskografija. Wiki izvori se i dalje proveravaju prema originalnoj sirovoj vrednosti, a ne prema prikaznoj normalizaciji.

## Nadzor i odluke

Nalaz „podatak nedostaje“ automatski postaje rešen kada trenutno polje ima sadržaj. Za diskografiju se traži barem jedno stvarno izdanje; sami naslovi grupa nisu dovoljni. Time se ne potvrđuje muzička ili biografska tačnost.

Promenjena biografija sa ranijim nalazom pogrešne teme ostaje za ručnu proveru. Administrator može označiti baš trenutnu verziju kao rešenu ili odbaciti nalaz. Odluka čuva otisak pregledanog polja i identiteta zapisa u postojećem JSON dnevniku. Ako je sadržaj promenjen od prikaza do klika, transakcija odbija zastarelu odluku. Kasnija izmena sadržaja ponovo čini staru odluku istorijskom. Stare odluke bez novog otiska važe samo za nepromenjeni prvobitni nalaz.

Podrazumevani prikaz prikazuje otvorene nalaze. Završeni/rešeni nalaze se u zasebnom filteru sa oznakom i sačuvanim ranijim dokazima. Aktuelni brojevi popunjenosti uzimaju se iz sadašnje baze; brojevi tehničkih problema pesama jasno ostaju vezani za prvobitni audit.

Posle ručnog čuvanja izvođača poništavaju se oba keša (`admin-content-backlog`, `admin-catalog-review`) i stranica nadzora. Autorizacija se proverava pri svakom čitanju, van zajedničkog keša. Ako invalidacija zakaže, ostaje postojeći TTL od najviše pet minuta; neuspešna invalidacija ne prijavljuje uspešno sačuvan sadržaj kao neuspešan upis. Direktni SQL/CLI ne šalje aplikacionu invalidaciju.

## Provere

- 821 offline test je prošao. Posebni testovi pokrivaju grupe izdanja, godine/izdavače, zadržavanje JSON metapodataka, status popunjenog polja, ručne odluke vezane za verziju i invalidaciju posle čuvanja.
- 20 PostgreSQL regresionih slučajeva prošlo je u zasebnoj šemi unutar transakcije, u potpunosti vraćene ROLLBACK-om. Produkcioni izvođači i pesme nisu upisivani. Uključena je odluka posle ručne ispravke i odbijanje zastarelog otiska.
- TypeScript, ciljano lintovanje i Next.js 15.5.15 produkcioni build su prošli. Build koristi izolovane javne fixture podatke, bez produkcionih naloga.
- Chromium provera na širini 390 px potvrđuje grupisanje sva četiri korisnička primera i sve godine; Leb i sol ima 16 izdvojenih izdavača. Divlje Jagode: 13 studijskih izdanja, 3 kompilacije, 4 singla. Šaban Šaulić: 32 albuma i 22 singla. Brojevi opisuju trenutno unesene podatke; nisu nezavisna potvrda potpune diskografije.
- Lokalni produkcioni tok proverava unos sa četiri grupe, pregled pre čuvanja, stvarno administrativno čuvanje u fixture-u i prvi naredni zahtev: nalaz postaje rešen i broj nedostajućih diskografija odmah se ažurira. Istorija ostaje dostupna, anonimni zahtev je odbijen sa 401 i nema JavaScript izuzetaka.

Nisu pokrenuti commit, push ili deploy. Spajanje izvođača Lexington/Lexington Band nije deo ove izmene i čeka sledeći korak. Posle deploya postojeće diskografije treba proveriti bez ponovnog unošenja; zatim proveriti i jedan novi ručni unos i ažuriranje statusa nadzora.
