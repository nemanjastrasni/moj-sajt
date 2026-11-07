# GitarAkordi: katalog plejlista i završene dopune, 7. novembar 2026.

Osnova je commit `ceb6473`. U ovom prolazu menja se serverska obrada kataloga;
izgled, korisničke funkcije, redosled, procena težine, broj stavki po strani i
pravila pristupa ostaju isti. Nisu menjani DB šema, indeksi ili hosting.

## Katalog više ne obrađuje iste pesme za svaku stranu i filter

Ranije je `catalogPage` imao zaseban keš za svaki slug, kategoriju, stranicu i
nivo veštine. Svaka nova kombinacija ponovo je čitala sve relevantne tekstove i
računala procene težine. Metadata i prikaz mogli su paralelno pokrenuti isti
hladan upit dva puta.

Sada jedna kategorija deli obrađene javne kartice između stranica i filtera.
Svaka pesma se klasifikuje postojećim `estimateDifficulty` i `matchesCatalog`
funkcijama; oni nisu prepravljani. SQL izbor polja, kategorije i sortiranje
ostaju isti. Snapshot čuva poredak koji je vratila baza, bez novog JS sortiranja.

- Trajni Next keš traje 60 sekundi i koristi postojeći `playlist-catalog` tag.
  Postojeće admin izmene već invalidiraju taj tag.
- Keš sadrži samo javne metapodatke, nivo i pripadnost javnim filterima.
  Tekstovi, chords sadržaj, nalozi, omiljene, capo i lična podešavanja nisu u njemu.
- Metapodaci su gzip kompresovani na serveru da stanu u data-cache budžet.
  Dekodiraju se jednom po RSC zahtevu, a pregledač dobija istih najviše 50 kartica.
  Nema nove biblioteke za instaliranje niti prenosa gzip indeksa u pregledač.
- React request cache deli rezultat između metadata i prikaza. Mapa nedovršenih
  izračunavanja spaja istovremene hladne zahteve, pa ne pokreću isti posao više
  puta na jednom server procesu. Završeni podaci ne ostaju u tom memorijskom kešu;
  važe uobičajeni Next TTL i admin invalidacija.
- Lični nivo veštine i dalje se čita iz trenutnog naloga van trajnog keša.
  Promena veštine ne zahteva ponovno parsiranje javnih pesama.
- Greška ne postaje uspešan prazan katalog; sledeći zahtev može ponoviti čitanje.

## Merenja i ograničenja

Read-only izvoz **9.421 postojećih pesama** imao je približno 15,95 MB ulaznih
podataka sa tekstovima. Jedno provereno-TLS SQL čitanje za ovaj lokalni izvoz
trajalo je oko 1,45 s; to nije merenje Prisma veze u produkciji.

Upoređene su neizmenjena prethodna i nova serverska funkcija, u odvojenim Node
procesima, nad istim snapshot-om i za osam različitih pregleda:

| Pokazatelj | Pre | Posle |
| --- | ---: | ---: |
| Čitanja izvora | 8 | 3 |
| Pojedinačne procene pesama | 65.229 | 18.124 |
| Ukupna lokalna obrada prve sekvence | 36,47 s | 10,02 s |
| Sledeća strana istog svežeg kataloga u sekvenci | 5,47 s | 20 ms |

**Svih osam rezultata se potpuno poklapa**: iste pesme, redosled, nivoi,
ukupni brojevi i paginacija. Tri čitanja posle odgovaraju različitim opsezima:
sve kategorije, zabavne i narodne. Snapshot za sve kategorije zauzeo je oko
538 KB u formatu koji se čuva u kešu; zabavne oko 331 KB, narodne oko 133 KB.

Ovo nije obećanje da je čitav sajt 3,6 puta brži. Prvi potpuno hladan indeks
i dalje zahteva obradu: oko 5,4 s u ovom testu, uz dodatno čekanje baze u stvarnom
zahtevu. Ponavljanje već ranije zagrejane identične stranice bilo je gotovo
trenutno u starom modelu; novi model ima cenu dekodiranja indeksa. Osam toplih
poziva u lokalnom modelu trajalo je oko 124 ms ukupno. Udaljeni Vercel cache,
mreža, uređaj, renderovanje i stvarni INP nisu deo tog broja. Meriti ponovo nakon
deploy-a; kod se ne objavljuje automatski.

Dva izolovana produkciona fixture build-a proverila su stvarni Next/RSC tok:
**sedam pregleda napravilo je 14 čitanja pre i 3 posle**. Hladna metadata i
prikaz ranije su pokretali dva upita za isti pregled; sada dele jedan. Tekst,
linkovi, canonical i noindex ponašanje svih sedam stranica ostali su isti.
Pregled stvarnih Next cache fajlova potvrđuje javne metapodatke bez tekstova
pesama ili naloga. To su izmišljeni fixture podaci, ne produkciona Prisma veza.

Browser provere obuhvatile su 320, 390, 820 i 1366 px, obe teme, ukupno 16
prikaza pre/posle. Nema prelivanja ili JavaScript grešaka, prelazak sa druge
na prvu stranu radi, a poređenja celih snimaka daju **nula različitih bajtova
boje piksela** u svih osam parova.

Provere: **670/670 testova**, TypeScript, ciljani ESLint i čist produkcioni
build stvarnog aplikacionog koda su prošli. `npm run test:playlists` sada uključuje
i sedam novih regresionih provera keša. `package.json` menja samo test komandu;
zavisnosti i lockfile nisu menjani.

## Paul Simon — završeno u produkciji

Izvori i fotografija iz commita `ceb6473` prethodno su provereni na javnom sajtu.
Zaštićeni uvoz zatim je popunio samo prazna bio/discography polja umetnika
`cmvvgkdvp0000js07o8ee6sk2`: **415 znakova biografije i 15 studijskih albuma**.
Poređenje svih 1.232 izvođača potvrđuje promenu samo ta dva polja. Postojeća
fotografija iz manifesta, ostali podaci i pesme nisu menjani.

Javna [Paul Simon stranica](https://moj-sajt-rho.vercel.app/biografija/strane/paul-simon)
vraća 200, prikazuje 15 albuma, fotografiju i dva pinovana source linka.
Potvrđeni brojevi u bazi su 1.102 neprazne bio vrednosti i 518 diskografija.

Backup i dnevnik: `reports/artist-wiki/apply-2026-11-07T13-54-30-728Z/`.
Za povratak proveriti da su vrednosti još jednake upisanim hash-evima i vratiti
samo odobrena polja; ne vraćati čitav Artist red preko kasnijih ručnih izmena.
Git revert ne vraća ovu DB dopunu. Novi Git/deploy potreban je za optimizaciju
kataloga i dokumentaciju, ne za već objavljeni Paul Simon sadržaj.

## Podaci koji čekaju potvrdu

[Poseban pregled sa ID-jevima svih 27 parova](data-review-2026-11-07.md) opisuje:

1. Potpuno prazan Metallica zapis sa jednom povezanom review evidencijom.
2. Potvrđenih 27 identičnih parova kod Miroslav Rus / Rus Miroslav, bez
   zavisnih zapisa; predlog spajanja uključuje očuvanje starih URL-ova.
3. Potvrđen naziv grupe Van der Graaf Generator; predlog menja samo prikazano
   ime i čuva postojeće ID-jeve, slug, pesme i wiki evidenciju.
4. Trideset ranijih neslaganja kategorije pesme i izvođača: 29 naslovljenih
   pesama ima potvrđen 404 na adresi iz kataloga, a preostala je prazan Metallica
   zapis. Dvadeset izvođača nema kategoriju (23 pesme); šest drugih pesama ima
   različitu popunjenu kategoriju. Odgovarajućih šest Artist-category URL-ova
   vraća 200. Otkrivena su i dva dodatna moguća alias profila: Cranberries i
   White Stripes. Kategorije i ti profili nisu menjani. Ovaj problem treba
   rešavati pre daljeg kozmetičkog SEO doterivanja.

Te korekcije nisu izvršene. Pre svakog eventualnog brisanja/spajanja ponoviti
proveru referenci i hash-eva, napraviti backup i dobiti potvrdu vlasnika.

## Objavljivanje i naredna provera

Commitovati proverene izmene i sačekati Vercel deploy. Zatim proveriti prvi i
ponovljeni pristup katalogu, sledeću stranu, različite kategorije, prazan izbor,
kanonske adrese i lični izbor prema trenutnoj veštini. Nije dodat novi servis,
plaćena pretplata ili OpenAI API poziv. Stvarna potrošnja postojećeg hostinga
zavisi od saobraćaja; u ovoj proveri nisu mereni produkcioni troškovi keša.

Ako potpuno hladan pristup ostane problem, sledeća opcija je unapred obrađena
procena po pesmi uz zaseban plan za bazu i invalidaciju. Ta promena šeme/poslova
nije deo ovog prolaza. Postojeća lokalna Windows Prisma TLS smetnja ostaje;
nije isključena provera sertifikata da bi testovi izgledali uspešno.

Dokazi su u lokalnom `outputs/catalog-performance-2026-11-07/` folderu.
Snapshot sa tekstovima za benchmark nije javni dokument i nije dodat u Git.

Reference: [Next data cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache),
[React request cache](https://react.dev/reference/react/cache).
