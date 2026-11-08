# GitarAkordi

Naziv se piše **GitarAkordi**: veliko **A** povezuje „gitarA“ i „Akordi“. Od 8. novembra 2026, prema vlasnikovoj odobrenoj slici „GitarAkordi.com logo sa gitarom.png“, vizuelni logo uključuje i **.com**. Tekstualni naziv sajta ostaje GitarAkordi; zamena logotipa ne menja domene, canonical URL adrese ili tehničke ključeve.

Logo ima obris gitare i bela kosa slova, sivi nastavak .com, zeleno A i zeleni potez. Akcenat je **#64ff00**. Konture iz dostavljene slike prenete su u vektorske putanje, sa izostavljenim praznim crnim rubovima i pojednostavljenjem ivica. Ovo je vektorska obrada reference, ne ugrađeni PNG. Geometrija iz `lib/brand-artwork.ts` zajednička je zaglavlju i PDF generatoru. `lib/brand.ts` definiše naziv, vizuelni naziv GitarAkordi.com, akcenat i znak trzalice. A u trzalici potiče iz iste reference.

`BrandLogo` prikazuje jedan pristupačno označen SVG, bez dodatnih fontova, rasterskog učitavanja ili JavaScript obrade slike. U tamnoj temi slova ostaju bela; u svetloj postaju tamna uz isti zeleni akcenat. Statične verzije sa providnom pozadinom dostupne su kao `public/brand/gitarakordi-guitar.svg` i `public/brand/gitarakordi-guitar-light.svg` (oko 10,5 KB po verziji). SVG-ovi nemaju skripte, ugrađene slike ili spoljne resurse.

Logo je jedino u `HeaderSearch`, levo od pretrage, na svakoj stranici. Na računaru je širok 240 px unutar trake visoke 96 px, bez prelaska preko vrata gitare. Raniji prazni prvi red vrata gitare više nije potreban. Na telefonu traka ostaje visoka 56 px, a logo je širok od 112 do 140 px, sa dodirnom površinom visokom najmanje 44 px. Pretraga zadržava raspoloživu širinu i sticky ponašanje. Klik na logo vodi na početnu.

Ikonice koriste trzalicu sa kosim A i istom zelenom bojom: `app/icon.svg`, `app/favicon.ico` (16/32/48/64 px), `app/apple-icon.png` (180 px), kao i `public/brand/gitarakordi-symbol.svg` za zaseban znak. Cela adresa se ne sabija u favicon, gde bi postala nečitljiva.

Sve PDF putanje koriste isti `lib/songbook/pdf.ts`: pojedinačne pesme, lična pesmarica i liste za sviranje. Logo se vektorski ugrađuje jednom po dokumentu i ponovo koristi na naslovnici pesmarice (260 pt) i u podnožju svake strane (96 pt). Za beli papir slova i gitara su tamni, a akcenat zelen; nema crnog pravougaonika. Creator metadata glasi GitarAkordi.com. Mesto za brojeve stranica i postojeća oblast za tekst/akorde ostaju očuvani. Ranije preuzeti PDF-ovi se ne menjaju: potrebno je ponovo preuzimanje posle objave.

Provera izmene: 112 relevantnih testova, ESLint za izmenjene TypeScript komponente i izolovani Next produkcioni build sa probnim podacima i lokalno keširanim Poppins fontovima. Vizuelno su pregledani PDF pojedinačne pesme, naslovnica i sadržaj pesmarice, kao i nastavci duže pesme. Pregled zaglavlja obuhvata širine 320, 390, 600, 767, 768, 820, 1024 i 1366 px u obe teme, na početnoj i kontakt strani. Produkciona baza se ne koristi u QA kopiji. Nema izmene baze, automatskog commita, push-a ili deploy-a.

Veliki ponovljeni logo na početnoj ostaje uklonjen. Njena H1 oznaka ostaje dostupna čitačima ekrana i pretraživačima. Slogani i njihove admin kontrole ostaju zasebni i opisani su ispod.

## Slogani kojima upravlja admin

Admin → **Izgled i slogani** omogućava dodavanje do 50 tekstova, izmenu, promenu redosleda i uključivanje/isključivanje pojedinačnih slogana. Srpski tekst je obavezan; engleski je opcion i unosi ga admin. Nema automatskog AI prevođenja niti objavljivanja predloga. Slogan može imati do 160 znakova. Početna lista sadrži pet vlasnikovih predloga.

Admin bira da li se tekst smenjuje i interval od 6 do 60 sekundi (početno 12). Posetilac može pauzirati smenjivanje ili ručno preći na sledeći slogan. Smenjivanje se zaustavlja u skrivenoj kartici i pri interakciji; uz smanjene animacije ostaje ručno. Skriveni tekstovi zauzimaju istu mrežnu ćeliju da rotacija ne pomera ostatak početne strane.

Podešavanja se učitavaju asinhrono preko javnog `/api/site-branding`, bez blokiranja glavnog HTML-a. Javni odgovor sadrži samo uključene slogane i podešavanja rotacije, bez identiteta administratora, verzije ili dnevnika. Dok čeka odgovor, prikaz ne pokazuje zastareli početni slogan. Pri nedostupnosti koristi ugrađenu početnu listu. Već otvorena strana zadržava učitanu listu; nove izmene dobija pri ponovnom otvaranju/osvežavanju.

`SiteBranding` čuva podešavanja, a `SiteBrandingChange` svaku sačuvanu promenu sa prethodnim/novim stanjem, verzijama, vremenom i administratorom. Transakcija i zaključavanje reda sprečavaju prepisivanje tuđe novije izmene; neuspešan upis dnevnika poništava i izmenu. Istorija je sačuvana za oporavak; u ovoj fazi nema dugmeta za vraćanje u editoru.

SQL je u `prisma/sql/site-branding.sql`. `node scripts/setup-site-branding.cjs --ca <CA>` je pregled, `--check-schema` testira privremenu šemu i poništava je, a `--apply` dodaje samo dve nove tabele i početnu listu. Postojeća podešavanja se ne prepisuju. RLS i ukinuta prava PUBLIC/anon/authenticated važe za obe tabele. `node --test scripts/test-site-branding.cjs` proverava validaciju, ovlašćenja, javni odgovor, sukob verzija i atomarni dnevnik.
