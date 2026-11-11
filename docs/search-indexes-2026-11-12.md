# Indeksi i upit za bržu pretragu

Provera produkcione baze potvrdila je postojeće B-tree indekse `Artist_slug_key`, `Song_artistId_slug_key` i indekse veza izvođača. Oni već pokrivaju otvaranje izvođača po oznaci i pronalaženje pesama po izvođaču; nisu dodavani duplikati tih indeksa.

Dodati su `pg_trgm` i četiri GIN indeksa: `Song_search_title_trgm_idx`, `Song_search_slug_trgm_idx`, `Artist_search_name_trgm_idx` i `Artist_search_slug_trgm_idx`. Indeksi naslova i imena koriste istu normalizaciju malih slova, kvačica i `đ → dj` kao search. Indeksi su napravljeni odvojeno pomoću `CREATE INDEX CONCURRENTLY`; postojeći podaci i osnovni indeksi nisu menjani. Naknadna provera potvrdila je da su sva četiri indeksa spremna i važeća.

Novi upit najpre nalazi kandidate unutar svake tabele, spaja kandidate naslova/oznake pesme sa kandidatima imena/oznake izvođača, pa preseca rezultate za pojedinačne reči. Time `OR` više ne povezuje filtere različitih tabela i planer može koristiti trigram indekse. Ostaju isti redosled prioriteta, granica od 12 rezultata i javna polja. Konstantni delovi izraza normalizacije nalaze se u SQL tekstu kako bi se izraz podudarao sa indeksom i kod generičkih pripremljenih planova; korisnički tekst i dalje se prosleđuje isključivo kao SQL parametar sa escape-ovanim LIKE znacima.

U istom read-only snapshotu upoređeno je 12 probnih upita starog i novog SQL-a. Rezultati i njihov redosled bili su potpuno isti. Merenje od 12. novembra: `Zemlja` oko 68 ms → 0,45 ms izvršavanja u bazi, `Zana` oko 80 ms → 1,47 ms, `Željko` oko 89 ms → 3,65 ms. Vremena variraju; ovo nisu vremena celog HTTP zahteva niti prikaza na telefonu. Kratke pretrage od dva znaka kao `ac` imaju manje koristi od trigram indeksa; u proveri oko 75 ms → 56 ms. Nisu povećavane minimalna dužina upita niti menjana pravila pretrage.

## Provera i održavanje

Prošlo je 43 ciljane provere, TypeScript i produkcioni Next build u odvojenoj kopiji sa testnim javnim podacima. Read-only `EXPLAIN ANALYZE` nad stvarnom bazom potvrdio je korišćenje sva četiri nova trigram indeksa. Provera varijanti `Zeljko/Željko`, `Djordje/Đorđe`, `Saban/Šaban` i `Ruzo/Ružo` potvrdila je iste rezultate.

- `npm run test:search-indexes`: testovi search ponašanja, bezbednog parametrizovanja, čitanja bez upisa, ponovnog pokretanja setup-a, ekvivalentnih indeksa i odbijanja neispravnog ili konfliktnog indeksa.
- `npm run search:indexes -- --ca PUTANJA_DO_CA`: pregled postojećih/nedostajućih indeksa, bez upisa.
- `npm run search:indexes -- --apply --ca PUTANJA_DO_CA`: dodaje samo nedostajuće indekse, svaki zasebno i uz proveru spremnosti. Ne briše automatski neispravne indekse niti postojeće druge indekse.
- `npm run search:check-db -- --plans --ca PUTANJA_DO_CA`: read-only provera kvačica, rezultata i stvarnih planova upita.

SQL je u `prisma/sql/search-performance.sql`. Za ovu bazu setup je već izvršen; nije potrebno ponovo ručno praviti indekse. Potrebno je objaviti novi kod da bi sajt koristio novi upit. Skripta podržava i već postojeći `pg_trgm` u drugoj šemi; SQL datoteka koristi uobičajenu Supabase šemu `extensions`. Indeksi izraza nisu predstavljeni kao obični Prisma `@@index`; ne zamenjivati ih takvim deklaracijama niti pokretati reset baze.
