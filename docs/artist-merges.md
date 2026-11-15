# Spajanje duplih izvođača

U **Administracija → Izvođači** označi tačno dva reda. Izaberi **koji naziv i profil ostaju**, zatim **Pregled spajanja**. Posle pregleda potvrdi da su izvođači isti i klikni **Spoji u …**. Ne upisuje se novi naziv: ostaju naziv, ID, kategorija i slug izabranog profila. Stara ikonica za spajanje vodi na ovu istu listu sa označenim prvim izvođačem i sačuvanim filterima.

Spajanje je dostupno unutar iste kategorije. Različiti postojeći Wikidata identiteti zaustavljaju postupak. Prazni podaci zajedničkog profila dopunjavaju se iz drugog profila. Ako se dve neprazne biografije, diskografije, fotografije ili spiskovi članova razlikuju, pregled nudi izbor. Kratka biografija i Wikipedia izvor prate izabranu biografiju; kontrolni hash, autori, revizije i licence izvora se ne prepisuju novim vrednostima.

## Šta se čuva

- Sve pesme ostaju sa istim ID vrednostima, tekstovima, akordima, procenama težine i povezanim omiljenim pesmama, plejlistama, podešavanjima, prijavama, predlozima i tutorijalima.
- Ako oznaka pesme već postoji kod zajedničkog izvođača, preneti zapis dobija slobodan sufiks (`-2`, `-3`, …). Dve pesme se ne brišu niti automatski objedinjuju.
- Veze u zajedničkim izvođenjima prebacuju se na zajednički profil. Dupla veza istog izvođača postaje jedna, na ranijoj poziciji; pozicije drugih izvođača ostaju iste.
- Javni linkovi starog izvođača, biografije, info stranice i njegovih pesama preusmeravaju se pomoću Next `permanentRedirect`. U streaming kontekstu Next može vratiti HTTP 200 sa trenutnim HTML preusmeravanjem; kada zaglavlja nisu već poslata, vraća HTTP 308. Pesme se pronalaze po sačuvanom ID-u, pa radi i promenjena oznaka i kasnije ponovno spajanje. Parametri plejliste i plejera na linku pesme ostaju sačuvani. Provera evidencije radi se samo kada uobičajen javni upit nije pronašao zapis, uz postojeći indeks `AdminContentProposal_finding` i React keš unutar zahteva.

Ovo ponašanje preusmeravanja je dokumentovano za [Next.js 15](https://nextjs.org/docs/15/app/api-reference/functions/permanentRedirect). Ne uvodi se provera cele baze u middleware za svaki javni zahtev.

## Zaštite i evidencija

Pregled sadrži verziju podataka oba izvođača, njihovih pesama, izvora i kredita. Pre primene server ih ponovo čita i zaključava u serijalizovanoj transakciji i proverava aktivnu admin ulogu. Ako je neko promenio podatke ili dodao pesmu posle pregleda, potrebno je ponoviti pregled. Dozvoljena su najviše dva ponovna pokušaja transakcije pri PostgreSQL konfliktu serijalizacije.

Prenos pesama, krediti, odabrani podaci, izvori, uklanjanje duplog izvođača i evidencija čine jednu transakciju. Greška vraća sve izmene. POST zahteva admin sesiju i isti origin, a odgovor se ne kešira. Posle uspeha poništavaju se postojeći keševi javnog kataloga, plejlista, početne strane, sitemap-a, izvora i administrativnih nalaza preko `refreshArtistContent`.

Koriste se postojeće tabele `AdminContentProposal` (`field=artist-merge`, `operation=merge`) i `AdminContentEvent`. Nije potrebna migracija baze. Evidencija sadrži cele stare podatke oba izvođača, oba Wikipedia profila, kredite, izbor polja i mapiranje prenetih pesama. Dostupna je administratoru u **Nadzor sajta → Dnevnik predloga i odluka → Evidencija spajanja**. Uobičajeno vraćanje biografije/diskografije izričito odbija zapis spajanja. **Automatsko poništavanje spajanja nije implementirano.**

Ne pokretati ručno brisanje duplikata umesto spajanja: postojeći model baze ima kaskadno brisanje pesama izvođača.

## Provera

`npm run test:artist-merge` proverava izbor, plan, sukobe oznaka, izvore, verzije, rute, zaštitu zahteva, transakcione pokušaje i preusmeravanja. `npm run test:artist-merge-db -- --ca <CA-sertifikat>` je eksplicitna PostgreSQL provera: pravi izolovanu šemu i vraća celu transakciju, bez promena produkcionih izvođača ili pesama. Proverava stvarne FK veze, rollback pri kasnoj grešci, omiljene, plejliste, duete, izvore, zastareli pregled i ponovljeno slanje.

Proveriti i prikaz na 390 px, izbor odredišta, onemogućenu potvrdu pre pregleda, osvežavanje liste nakon uspeha i pravilan naziv koji ostaje. Za produkciono spajanje prvo proveriti pregled stvarnih podataka; lokalni browser test koristi izolovane podatke i zamenjenu mutaciju, a pravi SQL se proverava odvojeno u PostgreSQL-u.
