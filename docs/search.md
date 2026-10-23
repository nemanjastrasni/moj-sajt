# Pretraga pesama

Pocetna strana i SearchSlider koriste isti SongSearch. Postojeci URL-ovi pesama
i vrednosti kategorija ostaju nepromenjeni.

## Ponasanje

- Najmanje 2 znaka; najvise 120 karaktera i 6 reci.
- Sve reci moraju da se pronadju u naslovu i/ili nazivu izvodjaca, bez obzira
  na velika/mala slova. Reci ne moraju biti na pocetku naziva.
- ASCII slugovi omogucavaju trazenje bez dijakritika, npr. Djordje Balasevic.
  Ovo nije fuzzy pretraga: ne ispravlja proizvoljne greske u kucanju ili nadimke.
- Tacni naslovi se traze posebno, da ih popularna delimicna poklapanja ne potisnu.
- Do 12 rezultata. Za delimicna poklapanja rangira se najvise 40 kandidata,
  prethodno poredjanih po popularnosti, naslovu i ID-u.
- Klijent ceka 250 ms nakon unosa, otkazuje stari zahtev i ignorise kasne odgovore.
  Nedostupna baza nije predstavljena kao prazna lista; postoji poruka i ponovni pokusaj.
- Rezultati se mogu otvoriti klikom/dodirom ili strelicama i Enterom.
  Escape zatvara listu bez brisanja upita. Lista prati slobodan prostor i promene
  visualViewport-a, ukljucujuci raspolozivi prostor uz mobilnu tastaturu.

## Provera

`npm run test:search` proverava logiku na izolovanim probnim podacima i mock bazi.
Ne menja produkcionu bazu i ne dokazuje da je stvarna Supabase veza dostupna.
UI provera obuhvatila je sirine 320, 390, 820 i desktop, simuliran spori odgovor,
gresku, prazne rezultate, duge naslove i nizak prozor od 480 px.
Fizicki Android/iOS uredjaj nije automatizovano testiran.

Lokalna provera stvarne baze trenutno pada na Prisma TLS konekciji.
Na Vercelu proveriti stvarna podudaranja i latenciju posle deploy-a.

## Performanse

Nije menjana sema baze niti pokretana SQL migracija. Ako broj pesama ili
saobracaj poraste, izmeriti upite na stvarnoj bazi i razmotriti pg_trgm indekse
za contains/ILIKE pretragu naslova i izvodjaca.

Prisma dokumentacija:
https://docs.prisma.io/docs/orm/v6/prisma-client/queries/case-sensitivity
