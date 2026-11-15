# Povratak korisnika i korišćenje plejlista

## Šta je dodato

`/admin/analitika` prikazuje različite aktivne naloge za 7/30 UTC dana, naloge aktivne bar dva dana u poslednjih sedam, korišćenje pesme iz plejliste, režima sviranja plejliste i potvrđenu reprodukciju YouTube plejera. Dnevna tabela ima 14 dana. Periodi uključuju današnji, još nezavršen dan. Administrator vidi zbirne rezultate, ne identitete ili sadržaj privatnih lista.

Merenje je **isključeno dok prijavljeni korisnik ne uključi saglasnost na profilu**. Gosti, administratori i blokirani nalozi se ne mere. Broj uključenih od svih podobnih naloga jasno je prikazan: ovo je samoselektovani uzorak, ne ukupan saobraćaj, fizičke osobe ili broj Google pretraga. Ne služi za SEO pozicije. Postojeći presence brojač ostaje odvojen.

Povratak je aktivnost u danima 7–13 nakon prve zabeležene aktivnosti tog perioda saglasnosti. U uzorak ulaze početni dani od danas−41 do danas−14 (28 završenih kohorti), bez nepotpuno posmatranih naloga. To nisu nužno nove registracije. Procenat se prikazuje tek za bar pet sazrelih naloga; početni rezultati mogu nastati posle 14 dana. Ranija istorija nije rekonstruisana. Gašenje i ponovno uključivanje započinje novi period posmatranja.

Rast naloga i lista za 30 dana je odvojena statistika iz postojećih zapisa svih neblokiranih korisničkih naloga. Administratorski i obrisani zapisi su izostavljeni. To nije broj svih istorijskih kreiranja: obrisane liste se više ne broje. Predlog ne čuva dodatne nazive ili sadržaj lista.

## Privatnost i zaštita pristupa

Tri nove SQL tabele: `EngagementConfig`, `EngagementConsent`, `EngagementDaily`. Nema promene postojećih pesama, izvođača, plejlista i naloga. Dnevni red je vezan za ID naloga i datum; beleže se četiri logičke zastavice, bez niza događaja, preciznog vremena akcije, IP adrese, identifikatora/naziva pesme ili liste, URL-ova i pretraga. Prva aktivnost, vreme odluke i saglasnost potrebni su za period merenja. To su podaci vezani za nalog, **ne anonimni podaci**.

Saglasnost može da se povuče na profilu: transakcija isključuje beleženje, briše sve dnevne redove tog naloga i njegov prvi dan. Zapis odluke ostaje uz nalog. Brisanje naloga kaskadno briše saglasnost i dnevne redove. Zaključavanje reda saglasnosti usklađuje upis i povlačenje odluke; upis ponovo proverava aktivnu saglasnost i trenutni status naloga u SQL-u. Agregati filtriraju i trenutno blokirane/admin naloge. Keš zbirnog pregleda invalidira se nakon promene odluke; na više izolovanih instanci preostali keš može trajati do 60 sekundi. Identiteti i sirovi redovi ne ulaze u taj keš.

Koriste se samo poslednjih 90 UTC kalendarskih dana (danas i prethodnih 89); stariji dnevni redovi isključeni su iz svih upita i čiste se najviše jednom na sat po procesu prilikom narednog merenja ili admin obračuna. **Nema pozadinskog raspoređivača: bez zahteva fizičko brisanje može sačekati sledeći zahtev.** Ako bude potreban strogi rok fizičkog brisanja i tokom potpune neaktivnosti, dodati poseban dnevni posao. Ova izmena ne proširuje obaveštenje o privatnosti na eventualne druge servise sajta.

Novi API-ji zahtevaju svežu proveru naloga, isti origin za izmene, JSON i malo telo zahteva. ID naloga se uzima iz serverske sesije. Za događaje koji se odnose na plejlistu server proverava javnost/vlasništvo i pripadnost pesme listi. Identifikatori se koriste samo za proveru, ne čuvaju se u analitici. Sve administrativne provere izvršavaju se izvan keša. RLS i ukidanje prava `PUBLIC`, `anon`, `authenticated` zatvaraju direktan pristup novim tabelama; serverska konekcija mora biti vlasnik tabela ili pouzdana rola sa potrebnim ovlašćenjima/bypass RLS. SQL ne pravi javne politike.

## Opterećenje i ograničenja

Uključeni browser šalje najviše jedan uspešan događaj po vrsti/danu dok je aplikacija otvorena; nema analitičkog heartbeat zahteva. Više uređaja ili ponovno učitavanje deduplikuje primarni ključ `(userId, day)` i uslovni upsert. Najviše jedan dnevni red po uključenom nalogu. Neočekivani ponovljeni zahtevi ne povećavaju brojače. Prva aktivnost nastaje pri vidljivom prikazu/navigaciji ili povratku/fizičkoj interakciji; netaknut otvoren tab ne stvara naredne dnevne posete automatski. Nije dokaz celodnevnog korišćenja, slušanja cele pesme ili odsustva svih botova.

Posle učitavanja sesije neadministratorski nalozi jednom proveravaju podešavanje (ponovo na izričit zahtev ili promenu naloga). Gosti ne šalju analitičke zahteve. Sastavljanje/sviranje ne čeka analitiku; greška se ne prikazuje kao greška pesme ili plejera. Podešavanje ima posebno upozorenje i retry. Pregled je keširan 60 sekundi; datum upita je vidljiv. Greška baze ili nedostajući setup prikazuje „nedostupno“, a ne nule. Novi SQL koristi indekse primarnog ključa i datuma, bez punog čitanja tekstova pesama.

## Uključivanje pre deploya

1. U Supabase **SQL Editor** nalepi i izvrši ceo `prisma/sql/engagement.sql` (pripremljena je i identična kopija u izlaznim artefaktima). Skripta je transakciona i idempotentna, dodaje samo tri tabele i indeks; nema retroaktivnog uvoza ili uključivanja naloga. Postojeća konekcija servera mora moći da čita/piše te privatne tabele.
2. Tek potom commit/push i sačekaj Render Live. Kod ne izvršava DDL iz HTTP zahteva i ne uključuje automatski saglasnosti. Ako se kod postavi ranije, ostale funkcije rade, a podešavanje/analitika prijavljuju nedostupnost.
3. Kao običan korisnik otvori Profil: podrazumevano isključeno. Uključi, koristi pesmu iz svoje plejliste, sviranje i muziku. Kao admin otvori `/admin/analitika`; najkasnije posle isteka 60 s proveri zbirne brojeve. Ponovljen klik i drugi uređaj istog naloga ne stvaraju drugog korisnika. Isključi merenje: sledeći obračun izostavlja taj nalog. Administrator se nikada ne računa kao test korisnik.
4. Za SEO potom posebno proveriti Search Console indeksiranje, impresije, upite i pozicije. Analitika naloga neće sama povećati rangiranje.

SQL je održavan eksplicitnim skriptom, kao postojeći presence SQL; Prisma modeli i generisani klijent nisu menjani. Ne koristiti neproveren `db push` ili automatsko uklanjanje tabela. `scripts/harden-database-access.cjs` prepoznaje nove tabele.

## Validacija

`npm run test:engagement` proverava autorizaciju, origin/veličinu tela, dozvole, podrazumevano gašenje, upis sa saglasnošću, povlačenje, greške, keš i privatnost izlaza. Opt-in integracioni test `test:engagement-db` koristi PGlite preko `ENGAGEMENT_PGLITE_MODULE` (putanja do zasebno instaliranog `@electric-sql/pglite`), bez produkcionih kredencijala i bez nove runtime zavisnosti aplikacije. Pokriva izvršavanje setup-a dva puta, RLS/prava, stvarne SQL upise, deduplikaciju, vremenske granice, isključivanje blokiranih/admin naloga, sazrele kohorte, brisanje starih redova i kaskadno brisanje naloga. Nije test opterećenja produkcione baze niti višekonekcijske konkurentnosti na Supabase-u.
