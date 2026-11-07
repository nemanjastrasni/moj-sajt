# Mobilna brzina — merenja i optimizacija obrade, 7. novembar 2026.

Obuhvaćeni su produkciona početna, pesma, katalog plejlista i stranica izvođača,
kao i dve odvojene lokalne kopije produkcionog build-a za poređenje pre/posle.
Postojeći izgled, kontrole, klasifikacija, tekstovi i akordi nisu prepravljani.
Nije bilo upisa u bazu, promene šeme, DNS-a, hostinga, zavisnosti ili plaćenih API poziva.

## Potvrđen dobitak: manje ponovljenog parsiranja

Svež read-only snapshot sadrži **9.393 pesme** posle odobrenog čišćenja baze.
Obe verzije obrađuju iste podatke, u odvojenim novim Node procesima.
Redosled četiri probe bio je pre/posle/posle/pre; SQL čitanje nije uključeno
u vreme ovog CPU testa. Instrumentacija parser poziva jednaka je u obe verzije.

| Pokazatelj | Pre | Posle |
| --- | ---: | ---: |
| Srednje vreme cele obrade, dve probe | 5.485 ms | 3.174 ms |
| Pojedinačne probe | 5.624 / 5.346 ms | 3.172 / 3.175 ms |
| Pozivi bibliotečkog parsera | 53.214 | 24.208 |
| Pozivi koji su prepoznali akord | 4.227 | 878 |

To je približno **42% manje lokalnog vremena obrade**, odnosno 54,5% manje
poziva biblioteke. Ovaj rezultat ne predstavlja procentualno ubrzanje cele
stranice ili stvarnog telefona. Prvi indeks i dalje zahteva oko 3,2 s u ovom
okruženju, uz posebno čekanje baze i mreže. Postojeći deljeni Next keš
kataloga, njegova invalidacija i trajanje od 60 s ostaju isti.

Tri povezane izmene:

1. Red bez tab karaktera vraća se neizmenjen iz `expandTabs`, umesto prolaska
   kroz callback za svaki karakter. Redovi sa tabovima zadržavaju isti postupak.
2. Prepoznati i odbijeni simboli imaju zasebne ograničene keševe: najviše
   1.024 rezultata akorda i 8.192 odbijena kratka kandidata. Prepuna kolekcija
   izbacuje najstariji unos umesto brisanja celog keša. Duži ulazi od 128
   znakova i dalje prolaze kroz isti parser; rezultat se samo ne zadržava.
   Ni gramatika ni normalizacija nisu menjane. Ovo su tokeni, ne keš celih pesama,
   naloga ili ličnih podešavanja.
3. Red na stranici izvođača računa procenu jednom i koristi je za ikonicu
   i oznaku težine; ranije je računao dva puta. Admin autorizacija i upit za
   status pregleda ostaju izvan tog računanja i ne keširaju se.

Vrednosti za oznake težine izdvojene su u `lib/music/difficultyModel.ts`.
Sama `SongDifficulty` komponenta tako ne inicijalizuje parser. Stari javni
izvozi iz `difficulty.ts` ostaju kompatibilni. Ukupni početni JS paketi ostaju
praktično iste veličine: u proverenim buildovima razlike su od -128 do +75
gzip bajtova po ruti. Dobitak ovog prolaza je u obradi, ne u velikom smanjenju paketa.

## Podudaranje muzičkog i vidljivog rezultata

Za svih 9.393 pesama potpuno se poklapaju:

- procena težine i lista korišćenih akorda;
- ceo rezultat parsiranja glavnog i rezervnog chords sadržaja, uključujući
  tekst, vrste redova, pozicije tokena, bass oznake i tabove;
- normalizacija i transpozicije svih **712 korišćenih simbola** za osam
  pomeraja: -13, -1, 0, 1, 2, 7, 12 i 13.

Provereni su hash-evi kompletnog rezultata za svaku verziju, ne samo brojevi
pesama. Sirovi tekstovi iz read-only snapshot-a ostaju samo u lokalnom
workspace-u; nisu dodati u Git ili javni manifest.

Pregledač je uporedio početnu, pesmu, izvođača i katalog na 320, 390, 820 i
1366 px u obe teme: **32 para prikaza imaju nula različitih bajtova boje piksela**.
Jednaki su tekst, linkovi, geometrija, canonical i robots podaci. Transpozicija
i vraćanje originala rade u obe verzije; nema prelivanja ili JavaScript grešaka.
To su izolovani izmišljeni fixture podaci; proverena je i kompletna stvarna
muzička obrada iz prethodnog odeljka.

## Šta je pokazalo produkciono merenje

Profil: 390 × 844, traženo mrežno ograničenje 1,6 Mbps / 150 ms i CPU 4×,
anoniman novi kontekst po strani. Blokirani su svi zahtevi osim GET/HEAD,
uključujući prisustvo; YouTube nije pokretan. Ovo nije Lighthouse rezultat,
terenski Core Web Vitals niti merenje stvarnog INP-a.

Standardni Chrome DNS je u prvoj seriji četiri navigacije svaki put zauzeo
približno 9,1 s. Samo čekanje odgovora nakon povezivanja bilo je oko 46–55 ms.
Zato je druga serija koristila IPv4 koji je vratio sistemski resolver, uz
zadržan HTTPS hostname/SNI i proveru TLS-a. Nije menjana konfiguracija računara
ili sajta. Apsolutna vremena te dve serije nisu direktno uporediva.

Poslednja kontrolisana produkciona serija, pre objavljivanja novog koda:

| Strana | Prvi bajt | Kraj prijema HTML-a | LCP |
| --- | ---: | ---: | ---: |
| Početna | 153 ms | 322 ms | 984 ms |
| Pesma Zane | 180 ms | 2.455 ms | 3.104 ms |
| Katalog do četiri akorda | 134 ms | 703 ms | 1.228 ms |
| Zana — izvođač | 182 ms | 2.980 ms | 3.552 ms |

Prvi raniji pristup katalogu u ovoj sesiji imao je LCP oko **13,4 s**;
ponovljeni pristup, još uvek istom starom produkcionom kodu, oko 1,2 s.
To pokazuje važnost stanja keša, a nije dokaz da je lokalna izmena već
ubrzala produkciju. Kratak TTFB sam ne opisuje završetak streamovanog HTML-a.

Zabeleženi click/do-paint intervali kontrola bili su uglavnom 50–100 ms,
a Event Timing trajanja u poslednjoj produkcionoj seriji najviše 40–56 ms
za isprobane interakcije. Pretraga „zana“, uključujući kucanje i debounce,
trajala je oko 1,85 s; sledeća strana kataloga oko 0,80 s. Poređenje lokalnih
malih fixture stranica nije pokazalo ubedljivu promenu brzine ovih dugmadi.
Za njih nije dokazan procentualni dobitak. Lokalni search/auth odgovori su
mockovani jer fixture baza ne sadrži normalized SQL pretragu; produkcioni nisu.

CLS produkcionih uzoraka je 0–0,017. Dugačak test primer tablature u fixture
pesmi ima isti CLS oko 0,15 pre i posle, prilikom početnog prelamanja. To nije
nova regresija; nije menjan izgled ili način prelamanja da bi metrika izgledala bolje.

## Alat i kalibracija

`scripts/measure-site.cjs` sada podešava mrežu, CPU i cache kroz Puppeteer API,
a dodatni CDP klijent koristi za posmatranje. Dodat je `responseEndMs`, da se
odvoje prvi bajt i završetak prijema odgovora.

Kontrola iste WebP slike od 53.532 bajta izmerila je približno 14 ms bez
ograničenja, 694 ms kroz prethodni CDP pristup i 431 ms kroz Puppeteer API.
Oba načina su usporavala prenos; prvobitni zaključak da stari pristup ne radi,
izveden samo iz kratkog TTFB-a, odbačen je. Te pojedinačne kontrolne probe
potvrđuju primenu ograničenja, a ne tačno ponašanje svakog mobilnog operatera.

## Završna provera i sledeći korak

**684/684 testa**, TypeScript, ciljani ESLint i čist produkcioni build stvarnog
aplikacionog koda prolaze. Odvojeni produkcioni fixture build potvrđuje isti
prikaz. Šest novih regresionih testova pokriva odvojene granice keševa,
dugačke ulaze, samostalan prikaz oznake i jedno računanje po artist redu.

Posle vlasnikovog Git/push/deploy koraka ponoviti produkcionu seriju, posebno
prvi i ponovljeni pristup katalogu. Kod nije samostalno objavljen. Vredi dalje
profilisati razliku između prvog bajta i završetka HTML-a pesme/izvođača.
Veća sledeća mogućnost za katalog je unapred pripremljena procena uz pouzdano
otkrivanje izmena pesme; promena baze ili novi poslovi nisu deo ovog koraka.

Dokazi: lokalni `outputs/mobile-speed-2026-11-07/` u workspace-u, uključujući
`processing-final-comparison.json`, `mobile-production-throttled.json`,
`throttle-calibration.json`, `layout/checks.json` i `tests.log`.
