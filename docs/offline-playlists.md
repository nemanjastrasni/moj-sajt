# Offline lične plejliste — prva verzija

Korisnik sa internet vezom otvara svoju plejlistu (uključujući Omiljene), bira **Sačuvaj listu za offline**, a zatim **Otvori offline pesme**. Dostupno je i preko veze **Pesme bez interneta** u podnožju. Instalacija aplikacije nije obavezna; isto skladište radi u podržanom pregledaču na istom uređaju/profilu. `/offline` je javna, neindeksirana aplikaciona stranica bez privatnog serverskog HTML-a.

Preuzimanje obuhvata sve pesme iz izabrane liste, njihov redosled, izvorne tekstove i tabove, kredite izvođača i vlasnikove sačuvane tonalitete/capo. Oznaka uspeha pojavljuje se tek posle pripreme aplikacije i uspešne IndexedDB transakcije. Kopija je dostupna bez nove prijave. Ne postoji preuzimanje celog kataloga ili automatsko preuzimanje svih favorita.

## Korišćenje i ograničenja

- Do 100 pesama i 5 MiB po preuzimanju, ukupno do 20 MiB podataka plejlista na jednom uređaju. Veće liste treba podeliti; nema tihog skraćivanja.
- Podržani su tekst, akordi, tabulature, transpozicija oznaka akorda, ručni capo, veličina teksta i skrolovanje. Brojevi pragova u tabovima se ne transponuju. Hvatovi akorda i YouTube zahtevaju internet.
- Promene tonaliteta/capoa tokom offline sviranja važe za taj prikaz i ne sinhronizuju se automatski sa nalogom. Sačuvane početne vrednosti ponovo se preuzimaju pri osvežavanju kopije.
- Kopija ima datum i dugme **Osveži offline kopiju**. Promene naziva/redosleda/članstva i sačuvanih podešavanja prepoznaju se u otvorenoj online listi; izmenjeni tekstovi pesama proveravaju se novim preuzimanjem. Offline kopija sama ne dobija izmene sa servera.
- Uklanjanje lokalne kopije ne briše plejlistu ili pesme na nalogu. Brisanje svih lokalnih podataka sajta ili odluka pregledača da oslobodi prostor može ukloniti offline sadržaj. Zahtev za trajno skladištenje je najbolji pokušaj, ne garancija.
- Kontrole prve offline verzije su na srpskom. Ne dodaje se MP3 preuzimanje, offline YouTube, Google Play izdanje ili dodatna analitika offline korišćenja.

## Pristup i privatnost

`GET /api/playlist/[id]/offline` proverava aktivnog, neblokiranog korisnika i zahteva da je vlasnik liste. Javna vidljivost liste ne daje drugim korisnicima pravo na ovaj izvoz. Greške i uspeh imaju `private, no-store`, `Vary: Cookie` i zabranu indeksiranja. Nema promene baze ili migracije.

Privatne kopije su u IndexedDB, izvan service-worker/HTTP keša. To su lokalno preuzeti podaci dostupni osobi koja koristi taj profil pregledača, bez offline lozinke; korisnik dobija obaveštenje uz dugme i u biblioteci. Na deljenom uređaju treba obrisati kopije. Eksplicitna odjava kroz oba menija prvo ih briše; prepoznavanje drugog prijavljenog naloga takođe ih briše i filtrira prikaz. Lokalni epoch sprečava da staro preuzimanje ponovo upiše kopije nakon brisanja/odjave. Baze na serveru se ne menjaju. Već preuzeti podaci se ne mogu pouzdano opozvati na uređaju koji nema internet.

## Service worker

`public/offline-sw.js` registruje se tek na zahtev za preuzimanje. U kešu su isključivo generički HTML `/offline`, njegovi `/_next/static/` skriptovi, CSS i fontovi, najviše 20 MiB. Autentifikovani HTML, API, RSC odgovori i POST zahtevi se ne keširaju. Tek završena priprema postavlja pokazivač na novi komplet; neuspešna priprema zadržava prethodni. Svako novo preuzimanje priprema aktuelni komplet resursa. Privatna IndexedDB zamena je atomska i pri nedostatku prostora zadržava prethodnu kopiju.

Normalna otvaranja sajta idu na mrežu. Kada mrežno otvaranje ne uspe, registrovani worker preusmerava na keširani `/offline`; zato i početak aplikacije preko `/` radi nakon zatvaranja i ponovnog otvaranja bez servera. Za `/offline` se koristi spremljeni javni prikaz. Odjava ne briše javni aplikacioni keš, nego privatne podatke.

## Provera

`node --test scripts/test-offline-playlists.cjs scripts/test-offline-worker.cjs scripts/test-pwa.cjs`

Posebno proveriti na stvarnom telefonu posle korisnikovog uspešnog deploy-a: preuzeti malu listu, otvoriti je, zatvoriti aplikaciju, uključiti avionski režim, ponovo otvoriti preko ikonice i odsvirati sačuvanu pesmu. Potom probati osvežavanje uz internet, uklanjanje kopije i odjavu. Pre Google Play objave potrebna je provera na stvarnim Android uređajima. Ova promena ne objavljuje aplikaciju na Google Play.

Lokalna provera 18. novembra 2026: Next.js 15.5.15 produkcioni build, ESLint, 945 prolaznih testova (dva opciona SQL testa preskočena), devet grupa Chromium provera sa ugašenim probnim serverom i novim pokretanjem pregledača; simulirani nedostatak prostora, neuspeh mreže, odjava i promena naloga. Bez produkcionih baza i kredencijala.
