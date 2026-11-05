# GitarAkordi

Naziv se piše **GitarAkordi**: jedno veliko **A** povezuje „gitarA“ i „Akordi“. To slovo je zajedničko, ne ponavlja se i ne dodaje mu se malo „a“ ispred.

`lib/brand.ts` sadrži naziv, vektorski oblik zajedničkog slova i obris trzalice. Odabrana varijanta B koristi malu trzalicu sa A uz naziv Gitar + A + kordi. U nazivu je obojeno samo zajedničko A. Čitači ekrana dobijaju ceo naziv, a ukrasni SVG je skriven od njih.

Osnova koristi postojeći Poppins 700. Zajedničko A je zeleno: `#4ade80` u tamnoj temi i `#167238` u svetloj. Zaglavlje ima diskretnu jednobojnu podlogu radi čitljivosti preko gitarskih žica. Uvodni slogan je „Za znalce, neznalice i ostale muzikalice!“.

Ikonice koriste trzalicu sa istim A: `app/icon.svg`, favicon sa veličinama 16/32/48/64 px i Apple ikonica od 180 px. `public/brand/gitarakordi-symbol.svg` je znak sa providnom pozadinom za izvoz. Veliki blok sa ponovljenim logotipom uklonjen je sa početne; njen H1 ostaje dostupan čitačima ekrana i pretraživačima. Slogani se na početnoj prikazuju u traci ispod vrata gitare, uz postojeće kontrole na računaru i ispod sažetog zaglavlja na telefonu. Ostale stranice ne dobijaju dodatnu traku sa sloganima.

Promena naziva obuhvata korisnički interfejs, SEO/WebSite/OpenGraph naziv, PDF oznake i trenutne izveštaje nadzora. Postojeći tehnički ključevi, URL adrese i istorijski izveštaji zadržavaju identitet i kontinuitet podataka.

## Slogani kojima upravlja admin

Admin → **Izgled i slogani** omogućava dodavanje do 50 tekstova, izmenu, promenu redosleda i uključivanje/isključivanje pojedinačnih slogana. Srpski tekst je obavezan; engleski je opcion i unosi ga admin. Nema automatskog AI prevođenja niti objavljivanja predloga. Slogan može imati do 160 znakova. Početna lista sadrži pet vlasnikovih predloga.

Admin bira da li se tekst smenjuje i interval od 6 do 60 sekundi (početno 12). Posetilac može pauzirati smenjivanje ili ručno preći na sledeći slogan. Smenjivanje se zaustavlja u skrivenoj kartici i pri interakciji; uz smanjene animacije ostaje ručno. Skriveni tekstovi zauzimaju istu mrežnu ćeliju da rotacija ne pomera ostatak početne strane.

Podešavanja se učitavaju asinhrono preko javnog `/api/site-branding`, bez blokiranja glavnog HTML-a. Javni odgovor sadrži samo uključene slogane i podešavanja rotacije, bez identiteta administratora, verzije ili dnevnika. Dok čeka odgovor, prikaz ne pokazuje zastareli početni slogan. Pri nedostupnosti koristi ugrađenu početnu listu. Već otvorena strana zadržava učitanu listu; nove izmene dobija pri ponovnom otvaranju/osvežavanju.

`SiteBranding` čuva podešavanja, a `SiteBrandingChange` svaku sačuvanu promenu sa prethodnim/novim stanjem, verzijama, vremenom i administratorom. Transakcija i zaključavanje reda sprečavaju prepisivanje tuđe novije izmene; neuspešan upis dnevnika poništava i izmenu. Istorija je sačuvana za oporavak; u ovoj fazi nema dugmeta za vraćanje u editoru.

SQL je u `prisma/sql/site-branding.sql`. `node scripts/setup-site-branding.cjs --ca <CA>` je pregled, `--check-schema` testira privremenu šemu i poništava je, a `--apply` dodaje samo dve nove tabele i početnu listu. Postojeća podešavanja se ne prepisuju. RLS i ukinuta prava PUBLIC/anon/authenticated važe za obe tabele. `node --test scripts/test-site-branding.cjs` proverava validaciju, ovlašćenja, javni odgovor, sukob verzija i atomarni dnevnik.
