# Produkcija, brzina i SEO — 9. novembar 2026.

Proverena produkcija: https://moj-sajt-rho.vercel.app. Bez upisa u bazu,
promene konfiguracije naloga, automatskog commita, pusha ili deploya.

## Dostupnost i SEO

- Read-only monitor završio je 38 zahteva i proverio 21 javnu stranicu:
  početnu, kataloge, stranicu akorda, kontakt, 12 uzorkovanih pesama i dve
  biografije. Dostupnost, jedan H1, title/description, canonical i očekivani
  strukturirani podaci prošli su obuhvaćene provere.
- Sitemap: 13 datoteka, 11.777 jedinstvenih javnih adresa, od toga 9.394 pesme.
  Nisu slati HTTP zahtevi svakoj od 9.394 pesme; nije potvrđeno Google indeksiranje.
- Popularne i najnovije pesme imaju po pet linkova u HTML-u i kada je JavaScript
  isključen. Produkcija koristi nove lakše WebP pozadine, pa poslednji deploy
  nije samo pretpostavljen iz Git statusa.
- Anonimni zahtevi ka `/api/admin/songs` i `/api/admin/artists` odbijeni su.
  `/admin` i `/favorite` vode na prijavu i imaju `X-Robots-Tag: noindex, nofollow`;
  `/login` je takođe noindex. Ovo nije kompletan bezbednosni audit.
- `www.gitarakordi.com` i domen bez www nisu dali uspešan odgovor iz ovog
  okruženja. To nije dokaz da domen nije kupljen ili da je slobodan. Canonical i
  sitemap opravdano ostaju na postojećoj adresi dok se nova ne potvrdi.

## Potvrđena greška i pripremljena ispravka

Na početnoj je browser prijavio React #418 i ponovo iscrtao stablo. Debugger je
zaustavljen na samom mismatch-u: klijent je očekivao `.mobile-header-spacer`, a
server je ispred njega ostavio link Nazad. Serversko zaglavlje imalo je
`data-home=false`, a browser je očekivao true. Flight HTML je sadržao
`"c":["","index"]`, iako je stvarna javna adresa `/`.

Ovo odgovara [potvrđenom Next/Vercel problemu sa root ISR obnavljanjem](https://github.com/vercel/next.js/issues/95648).
Prethodno uvedeni `revalidate=60` omogućava ovaj uslov na produkciji. Lokalni
`next dev` i `next start` ne reprodukuju Vercelovo interno `/index` ime, što
objašnjava zašto prethodna lokalna provera nije otkrila grešku.

Pripremljena je uska normalizacija tačnog internog `/index` u javno `/` u Menu i
BackButton komponentama. Ostale putanje, uključujući `/pesme/domace/index`,
ostaju iste. Ne uklanjamo SSR/ISR, ne dodajemo čekanje na JavaScript niti
`suppressHydrationWarning`, ne menjamo CSS, raspored ili funkcije.

## Merenje produkcije pre ove ispravke

| Profil i stranica | TTFB | LCP | Prenos |
| --- | ---: | ---: | ---: |
| Desktop početna | 380 ms | 1.136 ms | 603.554 B |
| Desktop pesma | 164 ms | 2.612 ms | 385.009 B |
| Mobile početna | 453 ms | 1.388 ms | 473.487 B |
| Mobile pesma | 497 ms | 2.176 ms | 363.226 B |

Jedno hladno sintetičko merenje, ne Lighthouse rezultat, terenski Core Web Vitals
ili INP. Mobile: 390×844, 1,6 Mbps, 150 ms, 4× CPU. Samo GET/HEAD, prisustvo i
drugi POST zahtevi blokirani su radi izbegavanja upisa.

Greška je potvrđena na desktop i mobile početnoj i ponovljena u odvojenom
browser pregledu. Na probnoj pesmi nije zabeležena. Početna je ponavljala neke
zahteve za iste slike: na desktopu hero, a na mobile i deo ostalih slika. To
može poništiti uštedu novih fajlova. Rezultati se ne koriste za tvrdnju da je
sajt ubrzan određenim procentom. Posle deploya potrebno je ponovno merenje.

## Provera ispravke

- 32 regresiona testa: navigacija, mobilno zaglavlje, domen/početna i branding.
- Novi regresioni slučaj renderuje celo zaglavlje sa serverskim `/index` i
  klijentskim `/` i poredi identičan HTML; proverava obe varijante Nazad i
  očuvanje normalne unutrašnje `index` putanje.
- Pravi browser hidrira serverski `/index` kao `/` na širinama 390 i 1366 px:
  postojeći DOM čvor zaglavlja je sačuvan, nema recoverable ili page grešaka,
  otvaranje mobilnog menija radi. Ovo je izolovana simulacija Vercelovog uslova,
  bez produkcionih prijava ili upisa.
- TypeScript noEmit i ciljani ESLint prošli su; izolovani Next produkcioni build
  prošao je sa fixture bazom. Prava baza nije korišćena za build.

Nakon vlasnikovog pusha/deploya sačekati najmanje jedan ISR period i proveriti
i prvi STALE i naredni HIT odgovor, kao i stvarnu hidrataciju browsera. Samo
trenutna početna odmah posle deploya nije dovoljan dokaz popravke.

## Sadržaj i naredne preporuke

[Četiri konkretna predloga biografija i četiri zadržana slučaja](biography-proposals-2026-11-09.md)
pripremljeni su za odobrenje. Sadržaj baze nije menjan. Kod Ranog mraza dodatno
je prijavljen primer pesme iz Balaševićeve solo karijere; pripisivanje pesama
zahteva zasebnu odluku i proveru duplikata/referenci.

1. Posle ovog deploya potvrditi otklanjanje produkcione hidratacione greške i
   ponoviti isto mobile merenje.
2. Proširiti dnevni nadzor povremenom browser proverom početne: postojeći HTML
   monitor ne pokreće React i zato ovaj problem nije otkrio. To nije
   implementirano u ovoj turi.
3. Aktivirati www domen tek uz potvrđene DNS/HTTPS/OAuth korake iz
   [postojećeg plana](domain-www-and-loading.md).
4. Fotografije i diskografije nastaviti dopunjavati samo uz potvrđen identitet,
   izvor i razdvojene vrste izdanja. Ne treba seliti fajlove ili kupovati
   prostor samo radi ove greške učitavanja.

Privatni dokazi, browser snimci, sirovi kandidati i logovi:
`C:\Users\dimit\Documents\Codex\2026-10-31\da\outputs\production-review-2026-11-09`.
