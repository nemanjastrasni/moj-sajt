# GitarAkordi: pregled brzine i SEO-a, 6. novembar 2026.

Rad je započet sa čistog commita `fad1e8e`. Izmene koda su lokalne i čekaju
Git/deploy vlasnika. Izgled, navigacija, akordi, transpozicija i postojeći tekstovi
nisu prepravljani. Nisu menjani šema baze, indeksi, kredencijali ni konfiguracija
hostinga. Jedini upis u produkcionu bazu bio je odobreno dodavanje nedostajuće
diskografije The Beach Boys, opisano ispod.

## Šta je urađeno

| Izmena | Korist i ograničenje |
| --- | --- |
| Pretraga: do 20 uspešnih upita u memoriji pregledača, najviše 15 sekundi | Povratak na isti upit preskače mrežni zahtev. Greške se ne keširaju; otkazivanja i rok od 10 sekundi ostaju. Nema localStorage-a, deljenja između pregledača ni promene rangiranja. Svež unos može se pojaviti sa najviše 15 sekundi zakašnjenja u već otvorenoj pretrazi. |
| Javni spisak biografija: keš 300 sekundi po kategoriji | Kategorija i njena slova koriste iste male javne kartice. U kešu su samo id, naziv, slug, kategorija i slika. Postojeći admin pozivi koji osvežavaju `seo-sitemap` osvežavaju i ovaj spisak. Skripte van admin panela mogu sačekati TTL. Pojedinačne biografije nisu prepravljane. |
| `SongSheet`: React memoizacija | Promene drugih kontrola više ne iscrtavaju ponovo isti tekst pesme. Promena tonaliteta, veličine, režima prikaza, jezika ili širine i dalje može osvežiti prikaz. Algoritmi akorda nisu menjani. |
| Sitemap: dodat `/public-listening-playlists` | Javni katalog dobija svoj ulaz u sitemap; privatne liste ostaju isključene. |
| Prazne strane javnih muzičkih lista: `noindex, follow` | Potvrđen je prazan, indeksabilan URL `?page=10000`. Prazni rezultati sada nose noindex, uz postojeći canonical i isti prikaz. Metadata i stranica dele jedno čitanje po zahtevu. Podaci poput korisnikovih lajkova nikada se ne čuvaju u trajnom/shared kešu. |
| Merenje: DNS i povezivanje odvojeni od čekanja odgovora | Izveštaj prikazuje `dnsMs`, `connectMs` i `requestWaitMs`. Pregledač dozvoljava samo GET/HEAD; prisustvo i drugi upisi se blokiraju i odvojeno evidentiraju. |

Prilagođene su i Node testne pripreme za postojeće Next.js keširanje, CSS importe
i već uvedenu SEO metadata plejlista. To ne menja ponašanje plejlista u aplikaciji.

## Šta merenja zaista pokazuju

Pregled javnog deploy-a proverio je svih **13 delova sitemap-a**, **11.733 URL-a**
i **21 uzorkovanu stranicu**, kroz 38 GET zahteva. Obuhvaćene provere su prošle
bez upozorenja. To nije pregled svake pojedinačne pesme niti dokaz Google indeksiranja.

Četiri anonimna merenja početne stranice i jedne pesme nisu pokazala JavaScript
greške ili horizontalno prelivanje. Mobilna početna stranica prenela je približno
139 KB slika; desktop oko 307 KB. Ovo uključuje slike koje je pregledač učitao
u blizini vidljivog dela stranice. Obrada slika je već ranije optimizovana.

Prvi hladni pregledač prikazao je oko 9,3 sekunde do prvog bajta, ali dodatna
dijagnostika pokazuje **oko 9,13 sekundi u lokalnom DNS-u**. Čekanje odgovora nakon
slanja zahteva bilo je oko 51 ms; zaseban Node GET početne stranice sa Vercel HIT-om
završen je za oko 230 ms. Ovaj uzorak ne dokazuje da server svim posetiocima
odgovara za 51/230 ms, niti da je sajt uzrok lokalnog DNS kašnjenja.

Uporedivi browser testovi dva izolovana produkciona build-a potvrdili su:

- sekvenca pretraga „prva / druga / prva“: **3 zahteva pre, 2 posle**;
- otvaranje i zatvaranje podešavanja: **2 ponovna iscrtavanja teksta pre, 0 posle**;
- HTML prikaza pesme ostaje isti; promena tonaliteta i vraćanje originala rade;
- full screen i izbor muzičke liste rade;
- početna stranica na 320, 390, 820 i 1366 px ima jedan H1 i nema prelivanja;
- javne kategorije/slova biografija daju iste naslove, kartice i canonical adrese;
- stvarni Next data-cache sadrži samo mali javni DTO spiska biografija.

Ovi testovi koriste izmišljene podatke u posebnoj kopiji projekta. Ne predstavljaju
test svih interakcija sa produkcionom bazom. Prethodno zabeležena lokalna Windows
Prisma TLS smetnja nije rešavana isključivanjem provere sertifikata.

Završne provere: **663/663 Node testa**, TypeScript, ciljani ESLint i čist
produkcioni build stvarnog aplikacionog koda prošli su. Poseban produkcioni
fixture build potvrđuje noindex za praznu stranu/filter, ispravan canonical za
Top 20, novi sitemap ulaz i checksum/vidljive kredite Paul Simon fotografije.
Snimci početne stranice pre i posle na sva četiri proverena ekrana imaju
**nula različitih piksela** u upoređenim viewport snimcima. Time nisu provereni
svi uređaji ili svaki mogući korisnički tok.

Ne tvrdim da je početni JavaScript paket znatno manji ili da je LCP/INP poboljšan
za određeni procenat. Potvrđeno je manje ponovljenog rada i zahteva. Terenske
Core Web Vitals podatke i rezultate stvarnih telefona tek treba prikupiti.
U lokalnom poređenju početni home JavaScript porastao je sa 174.227 na
174.462 gzip bajta, odnosno za 235 bajtova, uz isti broj fajlova. To je mali
trošak dodatne logike keša; dobitak ovog kruga je u ponovljenim radnjama i
manjem opterećenju baze, a ne u smanjivanju prvog paketa.

## Dopune sadržaja

**The Beach Boys — objavljeno u bazi:** dodato je 29 studijskih albuma u prethodno
prazno polje. Vrednosti se potpuno poklapaju sa već objavljenim kreditima i
[pinovanom Wikipedia revizijom](https://en.wikipedia.org/w/index.php?oldid=1381574679).
Ponovo su pročitani izvor i baza; poređenje svih 1.232 izvođača potvrđuje promenu
samo tog jednog polja. Nisu menjani ostali podaci izvođača ili pesme. Javni URL
vraća HTTP 200, prikazuje 29 albuma i vidljiv izvor.

Rezervna kopija i dnevnik: `reports/artist-wiki/apply-2026-11-06T18-28-48-611Z/`.
`before.json`, `intent.json` i `result.json` razlikuju stanje pre i završen upis.
Za eventualno vraćanje treba najpre proveriti da polje još sadrži upisani hash;
ne vraćati celu bazu preko kasnijih ručnih izmena.

**Paul Simon — pripremljeno za sledeći deploy:** potvrđen je muzičar
[Wikidata Q4028](https://www.wikidata.org/wiki/Q4028), uz proveru članka umesto
pogađanja između imenjaka. Pripremljena je kratka biografija od 415 znakova i
15 solo studijskih albuma. Postojeća polja su prazna. Dodati su pinovani izvori
u javni manifest; sadržaj još nije upisan u bazu jer novi izvori moraju prvo
biti dostupni na objavljenom sajtu.

Pripremljena je i fotografija 960 × 959 px: Matthew Straubmuller (imatty35),
[CC BY 2.0, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Paul_Simon_at_the_9-30_Club_(b).jpg).
WebP, checksum, autor, licenca, izvor i opis obrade nalaze se u photo manifestu.
Postojeći renderer prikazuje ovu proverenu fotografiju nakon deploy-a dok je
image polje prazno; dodatni upis image URL-a u bazu nije potreban.

Plan i pregled sadržaja su u lokalnom, Git-ignorisanom folderu
`reports/artist-wiki/additions-2026-11-06/`. Posle potvrđenog deploy-a izvora,
postojeći zaštićeni alat može završiti odobrenu dopunu:

```powershell
npm run artists:wiki -- apply --report reports/artist-wiki/additions-2026-11-06/report.json --ca "C:\Users\dimit\Documents\Codex\2026-10-31\da\work\supabase-ca.crt" --base-url https://moj-sajt-rho.vercel.app --apply
```

Alat proverava deploy, identitet, stare vrednosti i hash izvora, pravi rezervnu
kopiju i preskače podatke koje je neko u međuvremenu promenio. Ovu komandu ne
pokretati pre deploy-a novih izvora. Git revert sam po sebi ne vraća DB dopunu.

## Prijavljeno za odluku vlasnika — bez ispravki podataka

| Nalaz | Šta je provereno / šta ostaje neizvesno |
| --- | --- |
| Metallica: zapis `cmqnov33q0008k0049eywvauo` | Naslov i slug su prazni. Read-only SQL provera to potvrđuje i namerno vraća neuspešan izlazni kod. Zapis nije menjan ili obrisan. |
| Miroslav Rus / Rus Miroslav | Postoje dva zapisa, svaki sa 27 pesama. Moguće je dupliranje; identitet i poklapanje pesama nisu ovim dokazani. Nije bilo spajanja. |
| Van der Graaf Generatora | Naziv deluje kao padežni oblik; proveriti nameru unosa i identitet pre promene imena ili SEO adresa. |
| Kratke biografije | 26 postojećih bio vrednosti ima manje od 200 znakova. To je razlog za pregled, ne dokaz pogrešnog sadržaja. |
| Diskografije na čekanju | Postoji 20 ranijih identity-bound zabrana automatskog uvoza, zbog mešanja tipova izdanja, godina ili sumnjivih naslova. Zabrane nisu uklonjene. |
| Izbor Wikipedia izvora | Automatski izbor može stati na regionalnom članku sa 28 albuma i preskočiti engleski sa 29. To je ograničenje potpunosti. Postojeće liste i parser nisu prepravljani. Za The Beach Boys korišćen je posebno proveren postojeći 29-album source hash. |

Pre dopune je bilo 1.232 izvođača, 1.101 neprazno bio polje i 516 diskografija.
Posle jedine dopune ima 517 diskografija; 131 puno bio polje i 715 diskografija
ostaju prazni po kriterijumu audita. To nisu sve nužno osobe/bendovi sa dostupnim
Wikipedia člankom. U bazi je 149 nepraznih image vrednosti; manifest sadrži
95 lokalnih fotografija, uključujući jednu novu koja čeka deploy. Ti brojevi se
preklapaju i ne treba ih sabirati kao broj fotografisanih izvođača.

## Preporuke i funkcije za sledeći rad

Ocena koristi 1–10 je inženjerska procena prioriteta, ne obećani SEO rezultat.

| Prioritet / korist | Mesto | Predlog |
| --- | --- | --- |
| Visok / 10 | Domen, `SITE_URL`, Search Console | Posle izbora i povezivanja domena uskladiti canonical, trajna preusmerenja, autentifikacione URL-ove i monitor; poslati sitemap i proveriti stvarne razloge neindeksiranja. DNS i nalog nisu menjani. |
| Visok / 9 | Merenje stvarnih mobilnih poseta | Prikupiti LCP, INP i CLS uz osnovne podatke o uređaju/mreži. Trenutni sintetički test ne meri stvarni INP. Pre uvođenja nove telemetrije dogovoriti obim, privatnost i trošak. |
| Visok / 9 | `catalogPage` u playlist katalogu | Hladan upit čita lyrics svih pesama kategorije i računa težinu pre filtriranja/paginacije; zasebni filteri/strane mogu ponavljati posao. Izmeriti SQL/CPU i razmotriti deljenje keša malih javnih procena. Ne keširati pune tekstove ili naloge. Eventualne DB indekse/šemu posebno odobriti. |
| Visok / 8 | `letterArtists`, kategorija pesama | Čitaju širi skup izvođača i povezanih pesama nego što jedno slovo prikazuje. Proveriti plan upita i količinu podataka, pa suziti DTO/filtriranje uz očuvanje dueta, brojeva i slova DŽ/LJ/NJ. |
| Srednji / 8 | `LatestSongs`, `PopularSongs` | Trenutne veze stižu kroz client fetch posle hidratacije. Proveriti server-renderovane, keširane male liste sa streaming-om, uz merenje uticaja na TTFB. Ne pretvarati brzu statičku početnu stranicu u sporu stranicu koja čeka bazu. |
| Srednji / 7 | `TunerButton`, `MetronomeButton` | Razdvajanje skrivenih panela može smanjiti početni kod, ali treba uporediti ukupan paket i prvo otvaranje. Očuvati inicijalizaciju zvuka unutar korisnikovog klika, dozvolu za mikrofon, fokus, zatvaranje i oporavak pri grešci učitavanja. |
| Srednji / 6 | `useChordVariants` | Proveriti korist build manifesta postojećih varijanti umesto više HEAD zahteva pri otvaranju hvatova. Imena/harmoniju akorda i postojeće slike ne menjati usput. |
| Visok / 9 | Noćni nadzor | Dodati dokazivo read-only provere praznih naslova/slugova i stanje sadržaja, kroz poseban DB nalog najmanjih privilegija. Trenutni HTTP monitor to ne može otkriti u neuzorkovanim zapisima. Nisu dodavani DB ključevi u Actions. |
| Visok / 9 | Rezervne kopije i povratak | Pre ozbiljnijih automatskih izmena obezbediti redovan backup van računara i uspešan probni restore. Postojeća dokumentacija navodi da potpun probni restore još nije potvrđen. |
| Srednji / 7 | Admin obaveštenja | Panel trenutno vodi do GitHub izveštaja. Stalni inbox, slanje poruka i automatsko objavljivanje izmena bili bi nove funkcije i čekaju poseban dogovor. |

## Cloud nadzor i objavljivanje

Potvrđen je stvarni [zakazani GitHub Actions run](https://github.com/nemanjastrasni/moj-sajt/actions/runs/42216267308)
na commitu `fad1e8e`, završen uspešno 6. novembra. Konfiguracija traži 04:23 UTC;
ovaj run je zabeležen u 12:15 UTC. Raspored u ovom uzorku nije bio precizan.
Uspešan AI korak sam po sebi ne dokazuje plaćen API poziv: skripta može završiti
bez njega kada analiza nije potrebna. Lokalni pregled nije pozivao OpenAI API.

Nisu dodati plaćena usluga, nova pretplata ili novi tajni ključ. Računar je
potreban za lokalni Codex rad; postojeći GitHub nadzor radi i kada je računar
isključen. [Zvanično objašnjenje lokalnih automatizacija](https://learn.chatgpt.com/docs/automations?surface=app).

Nove izmene koda treba commitovati i objaviti, zatim proveriti prazan javni
katalog (`noindex, follow`), normalan katalog, novi sitemap ulaz, fotografiju,
izvore i pretragu. Tek tada primeniti pripremljenu Paul Simon bio/discography
dopunu i ponovo pročitati bazu. Obične admin izmene već osvežavaju postojeće
tagove; direktni skript upisi mogu sačekati petominutni TTL spiskova/statistika.

Reference: [Google sitemap smernice](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[React memo](https://react.dev/reference/react/memo),
[Next.js keširanje](https://nextjs.org/docs/app/guides/caching-without-cache-components).

Lokalni dokazi, snimci ekrana, merenja i dnevnik provera sačuvani su u radnom
folderu `outputs/speed-seo-2026-11-06/`, van javnog repozitorijuma. Nijedan
connection string, privatni korisnički podatak ili API ključ nije deo izveštaja.
