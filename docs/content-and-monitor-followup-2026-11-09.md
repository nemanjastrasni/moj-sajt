# Dopune sadržaja i provera produkcije — 9. novembar 2026.

## Rezultat u produkcionoj bazi

U okviru ranije odobrenih dopuna praznih polja dodate su **dve biografije i
devet diskografija sa 99 zapisa albuma**, na deset postojećih profila. Nisu
menjani nazivi, slugovi, postojeće biografije/diskografije, fotografije, pesme,
akordi ili korisnički podaci. Prethodno odobrene četiri zamene biografija su
zasebna operacija i nisu ponavljane.

| Izvođač | Dopuna | Albuma | Potvrđeni Wikipedia izvor |
| --- | --- | ---: | --- |
| White Stripes | Studijski albumi | 6 | [The White Stripes discography](https://en.wikipedia.org/w/index.php?oldid=1361920805) |
| Eagles | Studijski albumi | 7 | [Eagles discography](https://en.wikipedia.org/w/index.php?oldid=1384113387) |
| Allman Brothers Band | Ručno izdvojeni studijski albumi; Eat a Peach zadržan kao opšti album zbog mešovitog materijala | 12 | [The Allman Brothers Band discography](https://en.wikipedia.org/w/index.php?oldid=1383752305) |
| Sinan Sakić | Albumi; izdvojene kompilacije izostavljene | 23 | Pinned srpski članak, izvor i autori dostupni na javnom profilu |
| Halid Muslimović | Albumi prema navedenom izvoru | 21 | [Halid Muslimović](https://en.wikipedia.org/w/index.php?oldid=1306643445) |
| Massimo Savić | Solo albumi; izostavljeni Dorian Gray, Labin Art Express, kompilacija i koncertna izdanja | 13 | Pinned engleski članak, izvor i autori dostupni na javnom profilu |
| Nedeljko Bajic Baja | Albumi prema navedenom izvoru | 11 | [Nedeljko Bajić Baja](https://sr.wikipedia.org/w/index.php?oldid=31696004) |
| Haris Džinović | Samostalni studijski albumi; izostavljena tri izdanja Sar e Roma | 5 | [Haris Džinović](https://sr.wikipedia.org/w/index.php?oldid=31832967) |
| Angels Breath | Biografija i originalni album iz 1994; reizdanje nije novi album | 1 | Pinned članak Angel's Breath, izvor i autori dostupni na javnom profilu |
| Emir I Frozen Camels | Biografija; diskografija ostaje za dodatnu proveru | — | Pinned bosanski članak Emir & Frozen Camels, izvor i autori dostupni na javnom profilu |

Ovo su potvrđeni izbori izdanja, ne tvrdnja da je svaka lista potpuna ili da
sadrži najnovije izdanje. Ako izvor nije utvrdio vrstu, ostavljeno je „album“
umesto nagađanja da je studijski. Godine se odnose na izdanja, ne na snimanje.

Identiteti Angel's Breath i Emir & Frozen Camels dodatno su provereni prema
postojećim naslovima Crv/Praia Do Ventu Eternu, odnosno Sarajevo New York Roma/Ti I Ja.
Razlike u apostrofu i vezniku nisu razlog za preimenovanje javnih profila.
Nove kratke biografije su pregledani sažeci na srpskom latinicom; naveden je
izvor i opis skraćivanja/prepričavanja uz CC BY-SA 4.0. Plaćeni AI API nije pozivan.

## Trenutni brojači

| Sadržaj | Popunjeno | Nedostaje |
| --- | ---: | ---: |
| Biografije | 1.111 / 1.231 | 120 |
| Diskografije | 539 / 1.231 | 692 |
| Fotografije | 523 / 1.231 | 708 |

Svež SQL pregled potvrđuje ove brojeve. Fotografije nisu dodavane u ovoj turi.
Broj popunjenih biografija nije potvrda tačnosti svih ostalih starih tekstova.
Statistika i kompletan spisak nedostajućeg sadržaja u adminu koriste postojeći
keš do pet minuta. Odabrani nalazi sa datumom ranijeg pregleda ostaju istorijski
pregled; nisu zamenjeni izmišljenim svežim pregledom svih pesama.

## Evidencija, provera i vraćanje

- Jedanaest promena polja primenjeno je kroz postojeću logiku admin predloga,
  u jednoj transakciji, uz svežu proveru praznih vrednosti i identiteta.
- Pre upisa sačuvani su svi odabrani Artist redovi i postojeći izvori, kontrolni
  zbirovi ostalih izvođača, svih 9.394 Song redova i SongReview evidencije.
- Posle upisa potvrđeni su sadržaj i hash izvora; svi ostali podaci izvođača,
  pesme i postojeći pregledi ostali su isti.
- Admin dnevnik dobio je 22 događaja pripreme/primene sa napomenom da je
  izvršilac Codex u okviru vlasnikovog odobrenja, bez predstavljanja kao ručni
  klik vlasnika u panelu. Predlozi imaju postojeću opciju vraćanja.
- Kod profila Angels Breath postoje dva uzastopna predloga. Za potpuno
  vraćanje i biografije i diskografije krenuti od najnovijeg; zaštita izvora
  namerno zaustavlja vraćanje preko kasnijih izmena.
- Svih deset javnih stranica vratilo je HTTP 200. U HTML-u je provereno svih
  99 naziva/godina, oba početna prikaza biografija i sve veze ka izvorima/licenci.

Privatne rezervne kopije, plan, potvrde i tačne revizije:
`C:\Users\dimit\Documents\Codex\2026-10-31\da\outputs\content-next-2026-11-09`.
Ne ponavljati publish skriptu: čuva kontrolne zbirove i odbija izmenjena ili
već popunjena polja.

## Produkcija posle prethodne ispravke zaglavlja

Prethodni commit sa normalizacijom /index je objavljen. Svež browser pregled
desktop i mobile početne nije zabeležio React grešku, neuspele GET zahteve niti
ponovljene zahteve za iste slike u obuhvaćenom merenju. Serverski HTML sa
Vercelovim internim /index imenom i STALE keš odgovorom ispravno prikazuje
početno zaglavlje, bez dugmeta Nazad i sa po pet serverskih veza u obe liste.
Nije tvrđeno da je zabeležen HIT: oba kontrolna HTML odgovora bila su STALE.

| Hladno sintetičko merenje | Pre prethodne ispravke | Sada |
| --- | ---: | ---: |
| Desktop ukupni prenos | 603.554 B | 549.159 B |
| Mobile ukupni prenos | 473.487 B | 374.109 B |
| Mobile slike | 198.555 B | 99.499 B |
| Mobile LCP | 1.388 ms | 1.008 ms |

Isti profil: 390×844, 1,6 Mbps, 150 ms, 4× CPU. Oko 21% manji mobile prenos
u ovim pojedinačnim merenjima nije isto što i potvrda 21% bržeg rada za sve
posetioce. Nisu mereni terenski Core Web Vitals ili INP.

Ponovljeni read-only monitor sa dopunjenim kodom prošao je 38 zahteva i 21
javnu stranicu; sitemap i dalje navodi 13 datoteka i 9.394 pesme. To nije
pregled svake pesme niti potvrda Google indeksiranja.

## Pripremljene izmene koda — potreban Git/deploy

1. Uvoz diskografija preskače odeljke „Live albums by recording date“ i druge
   prepoznate hronologije snimanja. Test čuva stvarnu godinu izdanja i sprečava
   stvaranje drugog lažnog izdanja sa ranijom godinom koncerta. Pogrešna
   automatski pripremljena Allman lista nije uvezena; odabranih 12 unosa je
   ručno pročitano iz odgovarajuće tabele izdanja.
2. Postojeći dnevni HTML nadzor prepoznaje pogrešno serversko stanje zaglavlja
   početne. Novi `home_navigation` nalaz prolazi postojeći bezbedan prenos
   izveštaja i dobija jasno objašnjenje i sledeći korak u adminu.
3. Nema novog browser procesa u dnevnom Actions poslu, dodatnih mrežnih
   zahteva, ključeva ili promena rasporeda. Ova uska HTML provera ne može da
   otkrije sve moguće JavaScript greške; povremena browser provera ostaje korisna.

Prošla su **92 testa** za izvore/uvoz, administraciju i nadzor, TypeScript
noEmit, ciljani ESLint i git diff provera. U ovoj turi nije ponavljan Next build;
prethodna ispravka zaglavlja već je proverena u objavljenoj produkciji.

## Zadržano za dalju proveru

- **Leb i Sol:** srpski izvor navodi 1977. za prvi album, dok drugi katalozi
  navode 1978; lista meša studijska, koncertna i druga izdanja. Nije upisana.
- **Nbg, Gužva u 16-ercu, COD:** odgovarajući Wikipedia članak nije potvrđen
  pod proveravanim nazivima. Neuspešna pretraga ne dokazuje da članak ne postoji.
- **Stampedo:** članak sa prostim nazivom opisuje stampedo, a ne muzičku grupu.
- **Emir & Frozen Camels, diskografija:** godina prvog snimanja i objavljivanja
  zahteva proveru; popunjena je samo biografija, bez spornih datuma.
- Postojeće pogrešne biografije A.C.A.B, Area, Ok Band i Crni ostaju netaknute;
  njihove zamene zahtevaju pouzdane izvore i zasebno odobrenje.
