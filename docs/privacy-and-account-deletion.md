# Privatnost i zahtev za brisanje naloga

Dodato 19.11.2026. Bez migracije, produkcionog brisanja, novog API-ja ili dodatne analitike.

## Javne adrese i ulazi

- Politika privatnosti: `https://www.gitarakordi.com/privatnost`.
- Zahtev za brisanje: `https://www.gitarakordi.com/brisanje-naloga`.
- Profil ima posebno označen odeljak za trajno brisanje naloga i podataka.
- Registracija i prijava imaju obaveštenje sa linkom ka politici, uključujući Google tok prijave. To nije obavezna saglasnost za dobrovoljnu analitiku; njena postojeća odvojena kontrola na profilu ostaje isključena dok je korisnik sam ne uključi.
- Obe javne stranice povezane su iz footera i kontakta, dostupne bez prijave i instaliranja aplikacije. Ne učitavaju podatke naloga.

## Šta dugme stvarno radi

Otvara korisnikov mejl program sa adresom javnog kontakta i pripremljenim naslovom i tekstom. Ne šalje mejl sa servera, ne kreira zapis zahteva u bazi i ne prikazuje lažnu potvrdu prijema ili brisanja. Stranica izričito traži da korisnik dopuni email naloga i pošalje poruku. I adresa i naslov vidljivi su za ručno kopiranje ako mailto ne radi. Lozinke, tokeni i podaci profila ne ulaze u link.

**Ovo je ručni kanal za zahtev, a ne automatski proces brisanja.** Vlasnik sajta mora da prati javni kontakt i zaista obradi zahteve. Ne označavati u Play Console da postoji automatsko brisanje. Google dopušta stranicu sa adresom podrške kao način slanja zahteva; to ne zamenjuje obavezu stvarnog brisanja povezanih podataka.

## Postupak urednika po prijemu zahteva

1. Potvrditi prijem i objasniti naredne korake i očekivano vreme obrade. Proveriti vlasništvo odgovorom na registrovanu adresu; ne verovati samo adresi napisanoj u telu poruke. Za nedostupnu adresu sprovesti dodatnu razumnu proveru, bez traženja lozinke ili objavljivanja podataka naloga. Ne izvršavati zahtev samo zato što je neko naveo tuđi email.
2. Identifikovati tačno jedan nalog. Pre brisanja napraviti konkretan pregled podataka i proveriti aktuelnu šemu i spoljne reference. Ova izmena namerno ne dodaje opštu SQL komandu koja bi naslepo uklanjala produkcione podatke.
3. Obuhvatiti lične plejliste i njihove redove/podešavanja, omiljene, sopstvene muzičke liste/stavke i sviđanja. `Favorite`, `Playlist` i `ListeningPlaylist` nemaju svi kaskadno brisanje korisnika. `PlaylistSongSetting.userId` je običan tekst. Ne obrisati zajedničku `Song` tabelu zato što se zapis nalazi u korisnikovoj listi.
4. Obuhvatiti `Account` (uključujući eventualne OAuth tokene), `Session`, identifikatore/tokene verifikacije tog emaila, profil i sam nalog. Proveriti potrebne korake kod pružalaca usluga. Brisanje GitarAkordi povezivanja ne briše korisnikov Google nalog ili YouTube snimke. JWT sesija se pri narednoj proveri poredi sa postojećim nalogom; to ne uklanja već preuzete kopije sa uređaja bez mreže.
5. Obuhvatiti `EngagementConsent`, `EngagementDaily` i `online_presence`. Engagement tabele postoje izvan Prisma modela i imaju kaskadu prema korisniku; proveriti važeću bazu. Presence i drugi tekstualni identifikatori zahtevaju zasebnu proveru.
6. Pregledati `SongSubmission`, `SongReport` i slobodan tekst: opis, beleške i snapshot mogu sadržati lične podatke i posle `SET NULL` nad `userId`. Proveriti i `reviewerId`, `SongReview.reviewedById`, administratorske predloge, revizije i ostale sirove SQL tabele ako je nalog imao uredničku ulogu. Ne predstavljati NULL strani ključ kao potpunu anonimizaciju. Za eventualno ograničeno zadržavanje dokumentovati konkretan opravdan razlog i rok, a ne zadržavati podatke podrazumevano zauvek.
7. Proveriti podatke u podršci, fajlovima, logovima, keševima i rezervnim kopijama. Zabeležiti postupak kojim se sprečava vraćanje obrisanog naloga pri obnovi kopije. Korisniku objasniti stvarna ograničenja i period eventualnog zadržavanja. Ne obećavati trenutni nestanak iz svih backup-a ako to sistem ne omogućava.
8. Proveriti rezultat i potvrditi završetak korisniku. Evidenciju obrade svesti na minimum i odrediti njen rok čuvanja. Blokiranje ili odjava nisu ispunjenje zahteva za brisanje.

## Šta još treba potvrditi pre javnog Play izdanja

- Vlasnik treba da proveri da javna kontakt adresa prima zahteve i da može redovno da ih obrađuje. Sam mailto ne pruža dokaz isporuke.
- Utvrditi i dokumentovati konkretne rokove čuvanja tehničkih logova, backup-a i prepiske prema stvarnim Render/Supabase i lokalnim podešavanjima. Iz koda se ti rokovi ne mogu pouzdano utvrditi; politika ne izmišlja univerzalan broj dana.
- Javna politika opisuje provereno ponašanje aplikacije, ali ova implementacija nije pravna potvrda usklađenosti. Proveriti kompletnost pravnog obaveštenja i stvarne postupke rukovaoca za tržišta na kojima je aplikacija dostupna. Data safety popuniti prema stvarnom ponašanju i svim uključenim servisima, uključujući Google prijavu i YouTube.
- Posle deploy-a proveriti obe javne adrese bez prijave. Tek tada ih uneti u odgovarajuća Play Console polja. Naziv aplikacije/urednika u Play listingu mora odgovarati tim stranicama.
- Offline service worker može prikazivati staru javnu školjku dok korisnik online ne osveži offline kopiju. Brisanje naloga na serveru ne može na silu obrisati podatke na nepovezanom uređaju; korisnik ima lokalno brisanje na `/offline` i preko podešavanja pregledača.

Izvori za Play zahteve: [User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en), [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en). Pravila proverena 19.11.2026.

## Provera implementacije

- Cela lokalna regresiona provera: 948 testova, 946 uspešno, dva preskočena testa koja zahtevaju poseban SQL testni modul, bez padova. Produkcioni SQL CLI testovi nisu pokretani.
- Produkcioni Next build i TypeScript uspešni u odvojenoj kopiji koda sa sintetičkom Prisma bazom; nema veze sa produkcionom bazom. Targeted ESLint svih sedam promenjenih TS/TSX fajlova i Git whitespace provera prošli.
- Chromium: 40 kombinacija stranice, širine i teme za privatnost, brisanje, registraciju, prijavu i kontakt (320/390/844/1366 px, svetla/tamna tema). Bez horizontalnog prelivanja i JavaScript izuzetaka. Posebno proveren profil prijavljenog test naloga na 390 px.
- Javne stranice odgovaraju bez prijave; link otvara pripremljeni mailto sa fiksnim primaocem, bez ličnih podataka naloga. Nije slat stvarni mejl. Proveren vidljiv rezervni postupak za ručno slanje i veze iz registracije, prijave, profila i footera.
- Provera je lokalna, u browseru; ne predstavlja Play pregled, Android AAB test, potvrdu dostave mejla ili potvrdu pravne usklađenosti. Nisu izvršeni deploy ili produkciona brisanja.
