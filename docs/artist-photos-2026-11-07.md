# Fotografije izvođača — 7. novembar 2026.

Pripremljeno je **176 novih fotografskih zapisa za postojeće profile**:
64 u kategoriji domace, 21 narodne i 91 strane. Manifest sada ima 271 zapis,
prethodno 95. Dodato je 166 novih fizičkih WebP fajlova, ukupno 13.725.016
bajtova (oko 13,1 MiB). Neki alias profili dele istu sliku; nisu spajani.

Primeri: Gibonni, Belan Neno, Stefanovski Vlatko, Severina, Rambo Amadeus,
Nina Badrić, Bon Jovi, Radiohead, Sting, John Lennon, Jimi Hendrix,
Aretha Franklin i The Rolling Stones. Postojeći nazivi profila su sačuvani.

## Izbor i izvori

Provereno je 340 kandidata u dva ograničena prolaza, prema već povezanom
ArtistWikiProfile identitetu i novoj Wikidata proveri imena i muzičkog tipa.
Korišćeni su P18 i sveži Wikimedia Commons metapodaci o autoru, licenci,
izvornoj stranici i ograničenjima. HTTPS i host provere ostale su uključene.

Za 131 kandidata nije bilo P18 fotografije; 23 je ostalo na proveri licence
ili kvaliteta. Od 186 kandidata sa pripremljenim prikazom 176 je prihvaćeno
posle dodatnih provera i pregleda devet kontaktnih listova.

Četiri dodatna kandidata nisu preneta u javni paket:

- Dedić Arsen i Gustafi: autor u Commons metapodacima je naveden kao
  pretpostavljen; ostavljeno za zaseban pregled izvora.
- 4 Non Blondes: ponuđeni snimak Sare Gilbert i Linde Perry ne prikazuje bend.
- Imagination: široka zajednička TV fotografija sadrži više izvođača;
  ostavljeno za izbor jasnije fotografije grupe.

Dve ranije, neobjavljene pogrešne veze dodate su u trajne holds:

- Boa: stari kandidat Q232449 je korejska pevačica BoA; postojeći profil je
  hrvatski bend, sa wiki identitetom Q4272071.
- Valentino: stari kandidat Q129709789 je drugi muzičar; ovaj profil i
  njegovi naslovi pripadaju sarajevskoj pop-rok grupi.

Te fotografije nisu dodate na sajt. Biografije, pesme i nazivi nisu menjani.

## Alias imena i granice alata

`discoverPhoto` čuva pravi Wikidata naziv i odvojen dokaz o podudarnom aliasu
ili obrnutom redosledu imena. Tako Gibonni može biti vezan za Zlatana
Stipišića Gibonni, a Belan Neno za Nena Belana bez preimenovanja profila.
Publisher prihvata dokaz samo uz jednako traženo Artist ime, Wikidata ID
i podudarno ime iz iste entity evidencije. Provere još praznog image polja,
ID-ja, slug-a, kategorije, autora, ograničenja i checksum-a ostaju iste.

Granica publisher manifesta podignuta je sa 200 na 500 zapisa radi rasta
kolekcije; veći manifest se odbija pre verifikacije/upisa. Provera serviranih
fajlova i kredita pre bilo kakvog DB upisa i dalje je obavezna.

## Očuvanje podataka i prikaz

Sačuvano je prethodnih 95 manifest zapisa i njihove slike. Svežim čitanjem
potvrđeno je da su sva 1.231 Artist zapisa foto-audita nepromenjena,
uključujući svih 149 nepraznih image polja. **Nije bilo DB upisa** ili promene šeme.

Postojeći `getArtistImage` fallback povezuje novih 176 fotografija sa još
praznim poljima. Za svaki novi zapis ponovo su potvrđeni živi Artist identitet,
ArtistWikiProfile Wikidata ID i rezultat renderera. Sa novim manifestom
326 profila ima podešen izvor slike, uključujući ranije udaljene URL-ove koji
nisu u ovom koraku ponovo ocenjivani. Još 905 profila nema podešenu fotografiju.

Slike su WebP do 960 × 960 px, bez uvećavanja ili destruktivnog kropovanja,
sa očuvanim proporcijama. Stranica ne preuzima celu zbirku: ostaju postojeći
izbor galerije, prioritet za vidljive fotografije i lazy loading ostalih.

Autori, Commons URL-ovi, licence, dimenzije, checksum-i i opis tehničke obrade
su u `public/artist-photos/manifest.json`. Postojeći `/foto-izvori` i kredit
ispod fotografije objavljuju te podatke. Slike zadržavaju pojedinačne navedene
licence, umesto opšte licence koda.

## Provere i objavljivanje

- **687/687 testova**, ciljani ESLint i čist produkcioni build prolaze.
- Odvojeni build sa izolovanim podacima proverio je postojeće ArtistHeader,
  ArtistMosaic i PhotoCredits komponente; test ruta nije dodata u projekat.
- 24 provere: tri kategorije, četiri širine (320/390/820/1366) i obe teme;
  zaglavlja i svih 12 sličica po galeriji učitani su bez prelivanja ili JS grešaka.
- Lokalno su potvrđeni HTTP checksum-i svih 174 različitih URL-ova iz novih
  176 zapisa, uključujući ranije deljene fajlove.
- Stranica izvora ima 271 članak, ispravan hash manifesta i sve nove anchor
  linkove; nema prelivanja na četiri proverene širine.

Paket je lokalno spreman za vlasnikov Git/push/deploy i još nije objavljen.
Posle deploya prikaz radi bez dodatnog DB publisher koraka, kao kod prethodne
Paul Simon fotografije. Naknadno popunjavanje DB image polja za druge
potrošače ostaje moguće tek posle verifikacije objavljenih fajlova i kredita.

Privatni izveštaji su `reports/artist-images/additions-2026-11-07/` i
`additions-2026-11-07-prior/`. Dokazi su u workspace
`outputs/artist-photos-2026-11-07/`. Staged kandidati nisu u Gitu. Povratak
ovog koraka je vraćanje commita javnih fajlova i manifesta; nema DB izmena za vraćanje.
