# Odobrene korekcije kataloga i nova pozicija logotipa

Vlasnik je u četu 7. novembra 2026. odobrio popravku 29 linkova i ostale
korekcije iz prethodnog pregleda. Nova pozicija logotipa pripremljena je za
vizuelni pregled; nije samostalno commitovana, pushovana ili objavljena.

## Šta je završeno u produkcionoj bazi

- Dvadeset prethodno nekategorisanih izvođača dobilo je kategoriju `strane`,
  prema postojećim kategorijama njihove 23 pesme. ID-jevi i slugovi su sačuvani.
- Šest Song kategorija usklađeno je sa već postojećom Artist kategorijom.
  Sačuvane su njihove ranije radeće kanonske adrese.
- Prikazani naziv promenjen je u **Van der Graaf Generator**; ID, slug,
  11 pesama i postojeća ArtistWikiProfile evidencija nisu menjani.
- Uklonjen je isključivo prazan Metallica Song zapis
  `cmqnov33q0008k0049eywvauo` i njegova jedna SongReview evidencija.
  Oboje su sačuvani u rezervnoj kopiji. Drugih referenci nije bilo.

To je 29 pojedinačnih SQL operacija: 21 Artist izmena, šest Song izmena,
jedan SongReview i jedan Song delete. Tekstovi, akordi, biografije,
diskografije i slike postojećih zapisa nisu prepisivani.

Svež nezavisan pregled nakon transakcije: **9.420 pesama, 1.232 izvođača,
nula neslaganja Song/Artist kategorija**. Svih 29 popravljenih kanonskih
adresa provereno je na produkciji: HTTP 200. Od tih pesama, za 23 je
oživela ista ranije neispravna adresa; za ostalih šest katalog sada gradi
već postojeću radeću adresu. Njihovih šest starih pogrešnih adresa dobiće
308 tek posle objavljivanja pripremljenih redirect pravila.

Mogući dodatni alias profili The Cranberries/Cranberries i The White
Stripes/White Stripes nisu spajani ili brisani. Njihov pregled nije dokazao
jednakost sadržaja; popunjena je samo odobrena nedostajuća kategorija.

## Šta je spremno, ali čeka deploy

`lib/seo/legacy-redirects.json` sadrži 36 tačnih trajnih preusmerenja:
27 Rus song adresa, tri artist/info/bio adrese i šest pogrešnih kategorija.
Next ih učitava kroz `next.config.ts`. Sva pravila proverena su u stvarnom
lokalnom produkcionom Next buildu: HTTP 308, očekivana destinacija,
očuvani `playlist` i `play` parametri, bez petlji.

**Svih 27 Rus Miroslav duplikata i njihov Artist još postoje u produkciji.**
Posle deploya treba izvršiti završni korak, za koji je odobrenje već dato.
Brisanje pre deploya napravilo bi mrtve stare linkove. Skripta je stvarno
proverila trenutnu produkciju i odbila taj korak pre povezivanja na bazu,
jer još nema 308 preusmerenja.

Završni korak ponovo proverava originalnu jednakost naslova, teksta i akorda,
sve stvarne strane ključeve iz PostgreSQL kataloga, nove izvore ili sadržaj
Artist profila i 27 jednoznačnih parova. Bilo kakva nova referenca ili
ručna izmena zaustavlja brisanje. Čuva se Miroslav Rus i svih njegovih 27
postojećih Song ID-jeva. Nazivi sa v2 nisu potrebni za identične parove.
Ako se stanje ne promeni, rezultat će biti 9.393 pesme i 1.231 izvođač.

## Dnevnik i vraćanje izmena

Lokalni privatni dnevnici su pod ignorisanim `reports/song-repairs/`;
nisu u Gitu i ne prikazuju se javno. Sadrže ceo izvorni red za svaku
izmenu/brisanje, odobreni opseg, hash plana, nameru i ishod transakcije.
Ne sadrže pristupne ključeve. Nije dodavana nova tabela ili DB konfiguracija.

Prvi primenjeni korak:

`reports/song-repairs/catalog-apply-2026-11-07T18-03-09-414Z/`

Za povratak koristiti **`before-postgres-timestamps.json`** iz tog direktorijuma.
Originalni `before.json`, `intent.json` i `result.json` ostaju sačuvani.
Prvobitni pg parser pretvarao je timestamp bez zone u JS Date; proba vraćanja
duplikata otkrila je vremenski pomak i transakcija je poništena. Novi parser
čuva tačan PostgreSQL tekst, uključujući preciznost. Dopunjena rezervna kopija
prvog koraka proverena je prema svim živim nepromenjenim redovima i stvarnim
timestamp(3) kolonama; original nije prepisan. Njena kompletna obnova i ponovna
primena proverene su unutar poništene transakcije.

`scripts/catalog-maintenance.cjs` podržava:

- `--mode plan --phase core|dedupe`: samo read-only plan, bez upisa.
- `--mode check --manifest <plan.json>`: primena i kompletna obnova u istoj
  transakciji, uz završni ROLLBACK i proveru svih Artist/Song redova.
- `--mode apply --manifest <plan.json>`: rezervna kopija pre upisa,
  zaključavanje, kontrola zastarelog plana, ograničene izmene i transakcija.
- `--mode rollback --manifest <before.json>`: samo potvrđen primenjeni dnevnik;
  odbija prepisivanje bilo kog novijeg stanja zahvaćenih zapisa.

Za bazu se koristi postojeći TLS proveren DATABASE_URL i `--ca <putanja>`
ili `ARTIST_IMAGES_CA`. Ključeve ne prosleđivati kroz komandnu liniju.
Kod dedupe primene, pre otvaranja transakcije zahteva se da sva preusmerenja
na stvarnom HTTPS produkcionom originu vraćaju 308 na očekivanu istu domenu,
sa očuvanim query parametrima, i da odredišta vraćaju 200. `--origin` je
opcion; koristi se SITE_URL ili postojeća produkciona domena.

Posle deploya napraviti **nov** dedupe plan i upotrebiti putanju koju komanda
ispiše. Ako plan zastari ili nastane nova veza, ne forsirati brisanje.

```powershell
node scripts/catalog-maintenance.cjs --mode plan --phase dedupe --ca <CA-putanja>
node scripts/catalog-maintenance.cjs --mode apply --manifest <novi-plan.json> --ca <CA-putanja>
```

Git revert ne vraća bazu. Za rollback koristiti ovaj dnevnik; nakon eventualne
obnove duplih profila zasebno odlučiti o povlačenju statičkih preusmerenja.

## Provere i prikaz

- Svi postojeći testovi i nove provere održavanja prolaze.
- Proverena primena i povratak oba DB koraka; probne transakcije poništene.
- Nezavisno potvrđeni primenjeni redovi, brojači i 29 HTTP 200 adresa.
- Proizvodni Next build sa izolovanim test podacima, TypeScript i ESLint.
- Nova pozicija logotipa: 32 kombinacije dve stranice, osam širina i dve teme;
  bez prelivanja, dodira sa pretragom ili nedostupnog prvog menija.
- Na telefonu ostaje kompaktan logo uz pretragu, a meni se otvara/zatvara;
  slogan i sticky pretraga rade. Na računaru logo prelazi preko prvog praznog
  razmaka vrata gitare. Jedan logo ostaje i na unutrašnjim stranicama.

Tehnička pravila redirect odgovora proverena su i prema
[zvaničnoj Next dokumentaciji](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects).
