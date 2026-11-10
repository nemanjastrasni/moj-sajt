# Brže otvaranje izvođača i alati na klik

Javni imenik izvođača sada deli Next Data Cache između kategorije i slova. Keš traje 300 sekundi, a administrativna izmena ili objava pesme poništava oznake `public-artist-index` i `public-artist-songs`. Prvo čitanje popunjava keš; paralelna hladna čitanja u istom procesu dele posao. Keš ne sadrži naloge, prava, recenzije ni administrativne podatke.

Spisak pesama izvođača računa procenu težine prilikom popunjavanja keša. Sačuvane kartice imaju samo podatke za spisak i procenu, bez tekstova pesama. Prava i administrativne oznake i dalje se proveravaju odvojeno. Dodata je poruka učitavanja tokom navigacije.

Capo preporuke, paneli štimera i metronoma, izbor plejliste, prijava greške, tutorijal, režim za sviranje, dijagrami i PDF učitavaju svoj dodatni kod tek kada se zatraže. Osnovne kontrole i prikaz prethodno sačuvanog capoa ostaju dostupni bez računanja preporuka. Zatvaranje capoa odbacuje preporuke i poništava nedovršeni zahtev; izabrani prag ostaje. Pregledač može zadržati već preuzet JavaScript u svom kešu. Mikrofon i audio se pokreću isključivo njihovim dugmetom za pokretanje; aktivan minimizovani metronom nastavlja da radi do zaustavljanja ili zatvaranja.

Članstvo pesme u plejlistama proverava se pri otvaranju izbora, bez pozadinskog učitavanja svih korisničkih plejlista pri svakoj pesmi. Posle prvog otvaranja ili dodavanja ažurira se zvezdica. Tutorijal dobija samo javni video ID i naslov iz serverskog upita za pesmu; iframe nastaje na klik. Reprodukcija u rubrici Moja muzika nije menjana.

## Provera

- TypeScript i produkcioni Next build prolaze. Build je u odvojenoj kopiji sa testnim javnim podacima, bez pristupa produkcionoj bazi.
- 298 ciljanih testova prolazi, uključujući postojeće testove capoa, PDF-a, plejlista, audio alata, dozvola i SEO ponašanja.
- Novi `npm run test:mobile-speed` proverava odloženi proračun, deduplikaciju, otkazivanje i ponovni pokušaj, kao i granice i tačnost javnog keša.
- First Load JS stranice pesme: približno 209 kB pre, 194 kB posle. Manifest potvrđuje da paneli, PDF klijent i capo preporuke nisu u početnim paketima stranice.
- Osam uzastopnih otvaranja dva slova na zagrejanom kešu: nula dodatnih upita za javni imenik ili spisak pesama. Lokalna vremena sa testnom bazom nisu dokaz brzine produkcionog sajta.
- Chromium prikaz: širine 320, 390 i 1366 px; bez horizontalnog prelivanja dokumenta. Provereni spisak slova, izvođač, prelazak na pesmu, capo izbor/reset/zatvaranje, tutorijal, režim za sviranje, štimer i pokretanje/zaustavljanje metronoma. Prvo otvaranje pesme nema iframe ni otvorene dijaloge.

Nisu testirani pravi Android uređaj ni Safari na iPhoneu. Cilj od 500 ms treba proveriti posle objave, odvojeno za hladno otvaranje i navigaciju sa zagrejanim kešom. Hladni zahtev i dalje uključuje rad baze; podaci izvođača i dozvole nisu trajno keširani ovom izmenom. Nisu potrebne migracije baze, novi paketi niti promena hosting plana.
