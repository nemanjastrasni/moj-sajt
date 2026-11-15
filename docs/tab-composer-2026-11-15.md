# Olakšani unos tabulatura

Raniji mobilni prikaz je završen u `mobile-tablature-2026-11-14.md`. Ova izmena dodaje dogovoreno pomagalo za unos u administratorske forme **Nova pesma / Uredi pesmu**, grupni unos i korisničke predloge, uključujući administratorski pregled predloga.

## Upotreba

1. Postavi kursor u red posle kojeg želiš tab, pa klikni **Dodaj tabulaturu**.
2. Izaberi opseg pragova i klikni odgovarajuću žicu i prag. **0** je prazna žica. Podrazumevano se prelazi na sledeći korak.
3. Za istovremene note uključi **Više nota u istom koraku**. Korak možeš izabrati iz menija ili promeniti strelicama. Ponovni klik na istu notu u izabranom koraku uklanja tu notu; **Obriši korak** uklanja note samo iz tog koraka.
4. Novi koraci se automatski dodaju po osam pri unosu nota; možeš ih dodati i dugmetom, do 64 u jednom bloku. Posle 64. koraka unos se zaustavlja dok ne izabereš korak za izmenu ili ubaciš blok. Pogledaj šestoredni zapis i klikni **Ubaci tabulaturu**.
5. Proveri postojeći **Pregled rasporeda**, pa posebno sačuvaj pesmu ili pošalji predlog.

Standardni štim je E A D G B e; prva, najtanja e žica je na vrhu. Pomagalo pokriva pragove 0–24, redosled nota i simultane note u istom koraku. Koraci nisu notne vrednosti trajanja; izvorni tekst ostaje dostupan za ručno uređivanje.

## Očuvanje teksta i prikaz

Format je uobičajeni ASCII tab sa šest žica i zajedničkim kolonama. Prazne žice, prag 0 i višecifreni pragovi ostaju poravnati. Unos pravi tekstualni blok koji postojeći parser i mobilni prikaz prepoznaju. Ne menja se parser muzičke procene niti revizija trajnih procena; nema migracije ili backfill-a.

Tab se dodaje ispod celog reda u kojem se nalazio kraj izbora/kursor, sa praznim redovima između susednog sadržaja. Izabrani tekst se ne briše i reči se ne prekidaju umetanjem u sredinu reda. Browser normalizuje krajeve redova u textarea polju kao kod uobičajenog ručnog uređivanja. Umetanje poštuje limite od 100.000 znakova u adminu i 40.000 u korisničkom predlogu. Greška dužine čuva prethodni sadržaj i nacrt taba; zastareo snimak teksta ne prepisuje novije izmene.

Zatvaranje ili Escape zadržava nacrt sastavljenog taba dok je ista forma otvorena. Posle uspešnog ubacivanja nacrt se prazni za sledeći blok, a fokus se vraća u polje teksta. Grupni unos vezuje pomagalo za tačno izabranu pesmu.

Na telefonu pet pragova staje u širinu dijaloga, uz izbor opsega. Pregled koristi jedan `pre` i zajednički horizontalni kontejner za svih šest žica; postojeći javni „Prilagodi ekranu“ prikaz ostaje nepromenjen. Komponenta za sastavljanje se učitava tek pri prvom otvaranju; nema serverskih zahteva tokom sastavljanja.

## Korisnički predlozi

Prethodna validacija je zahtevala akorde i tekst za svaki predlog. Sada prihvata i potpun, prepoznatljiv standardni šestoredni tab sa bar jednom notom. Prazni, nepotpuni i neispravno poređani sistemi ne predstavljaju prečicu za validaciju. Provere kategorije, naziva, kontrolnih znakova, HTML-a, linkova, dužine redova i ukupnog teksta ostaju pre ove grane.

Predlog ostaje `pending` do odluke administratora. I dalje važe aktivan nalog, ista origin pravila, ograničenje pet predloga dnevno, zaštita od dupliranja, provera administratorske uloge, transakcije i redovan obračun procene prilikom objave. Samo ubacivanje taba u nacrt ne šalje i ne čuva pesmu.

## Provere

`npm run test:tab-composer` pokriva poravnanje, prazne žice, višecifrene pragove, nepromenljivost nacrta, opsege, čuvanje postojećeg teksta, dužinski limit, kompatibilnost parsera i validaciju/pending/odobravanje predloga.

Browser provera koristi produkcioni Next build sa izolovanim fixture podacima i stvarnim administratorskim i korisničkim formama. Pokriva odloženo učitavanje, klikove na pragove, simultane note, otkazivanje, ubacivanje, pregled šest žica zajedno, grupni unos, odbijanje predugačkog teksta i izričito slanje tab-only predloga. Odgovor za slanje predloga je simuliran; produkciona baza nije korišćena. Širine 320/390/844 px služe za proveru CSS rasporeda; to nije fizička provera svih mobilnih uređaja.
