# GitarAkordi

Naziv se piše **GitarAkordi**: jedno veliko **A** povezuje „gitarA“ i „Akordi“. To slovo je zajedničko, ne ponavlja se i ne dodaje mu se malo „a“ ispred.

Logo u zaglavlju je `public/brand/gitarakordi-guitar.svg`, prema vlasnikovom predlogu od 7. novembra 2026: beli obris gitare, beli kosi „Gitar“, narandžasti „Akordi“ i narandžasti potez ispod naziva. Sufiks `.com` nije deo logotipa. Slova su vektorske putanje, pa nisu potrebni dodatni fontovi. `BrandLogo` koristi lokalni SVG sa eksplicitnim dimenzijama i alternativnim tekstom iz `SITE_NAME`; nema generisanja slike u pregledaču.

Boje su bela i narandžasta `#ff8509`. Tamna podloga ispod logotipa čuva čitljivost u obe teme. Prema naknadnom zahtevu vlasnika, logo je sada jedino u `HeaderSearch`, levo od pretrage iznad vrata gitare. Na računaru je 210 × 84 px i prelazi približno 28 px preko vrata; prazan prvi razmak između žica ostavlja meni ispod logotipa dostupan. Pretraga ima rezervisan prostor da se ne sudara sa logotipom na užim računarima. Na telefonu je logo manji uz polje za pretragu, a traka sa dugmadima ispod zadržava 56 px. Klik na logo vodi na početnu. Slogani i njihove admin kontrole ostaju zasebni od logotipa. Uvodni slogan je „Za znalce, neznalice i ostale muzikalice!“.

SVG je ručno rekonstruisan prema referenci, sa slovima Arial Bold Italic pretvorenim u putanje; nije automatski isečak slike. Veličina je 3.883 bajta, bez ugrađenih bitmapa, skripti i spoljnih resursa. Pregledač je proverio početnu i kontakt stranu na širinama 320, 390, 600, 767, 768, 820, 1024 i 1366 px u obe teme: bez prelivanja ili sudaranja sa pretragom/menijem, sa jednom instancom logotipa, poljem za pretragu širokim najmanje 160 px i očuvanom sticky trakom. Meni i ručno menjanje slogana rade, bez JavaScript grešaka. Izolovani Next produkcioni build sa test podacima prolazi. Sama zamena pozicije logotipa ne menja bazu; zasebne odobrene korekcije podataka opisane su u izveštaju `catalog-repairs-2026-11-07.md`.

Ikonice koriste trzalicu sa istim A: `app/icon.svg`, favicon sa veličinama 16/32/48/64 px i Apple ikonica od 180 px. `public/brand/gitarakordi-symbol.svg` je znak sa providnom pozadinom za izvoz. Veliki blok sa ponovljenim logotipom uklonjen je sa početne; njen H1 ostaje dostupan čitačima ekrana i pretraživačima. Slogani se na početnoj prikazuju u traci ispod vrata gitare, uz postojeće kontrole na računaru i ispod sažetog zaglavlja na telefonu. Ostale stranice ne dobijaju dodatnu traku sa sloganima.

Promena naziva obuhvata korisnički interfejs, SEO/WebSite/OpenGraph naziv, PDF oznake i trenutne izveštaje nadzora. Postojeći tehnički ključevi, URL adrese i istorijski izveštaji zadržavaju identitet i kontinuitet podataka.

## Slogani kojima upravlja admin

Admin → **Izgled i slogani** omogućava dodavanje do 50 tekstova, izmenu, promenu redosleda i uključivanje/isključivanje pojedinačnih slogana. Srpski tekst je obavezan; engleski je opcion i unosi ga admin. Nema automatskog AI prevođenja niti objavljivanja predloga. Slogan može imati do 160 znakova. Početna lista sadrži pet vlasnikovih predloga.

Admin bira da li se tekst smenjuje i interval od 6 do 60 sekundi (početno 12). Posetilac može pauzirati smenjivanje ili ručno preći na sledeći slogan. Smenjivanje se zaustavlja u skrivenoj kartici i pri interakciji; uz smanjene animacije ostaje ručno. Skriveni tekstovi zauzimaju istu mrežnu ćeliju da rotacija ne pomera ostatak početne strane.

Podešavanja se učitavaju asinhrono preko javnog `/api/site-branding`, bez blokiranja glavnog HTML-a. Javni odgovor sadrži samo uključene slogane i podešavanja rotacije, bez identiteta administratora, verzije ili dnevnika. Dok čeka odgovor, prikaz ne pokazuje zastareli početni slogan. Pri nedostupnosti koristi ugrađenu početnu listu. Već otvorena strana zadržava učitanu listu; nove izmene dobija pri ponovnom otvaranju/osvežavanju.

`SiteBranding` čuva podešavanja, a `SiteBrandingChange` svaku sačuvanu promenu sa prethodnim/novim stanjem, verzijama, vremenom i administratorom. Transakcija i zaključavanje reda sprečavaju prepisivanje tuđe novije izmene; neuspešan upis dnevnika poništava i izmenu. Istorija je sačuvana za oporavak; u ovoj fazi nema dugmeta za vraćanje u editoru.

SQL je u `prisma/sql/site-branding.sql`. `node scripts/setup-site-branding.cjs --ca <CA>` je pregled, `--check-schema` testira privremenu šemu i poništava je, a `--apply` dodaje samo dve nove tabele i početnu listu. Postojeća podešavanja se ne prepisuju. RLS i ukinuta prava PUBLIC/anon/authenticated važe za obe tabele. `node --test scripts/test-site-branding.cjs` proverava validaciju, ovlašćenja, javni odgovor, sukob verzija i atomarni dnevnik.
