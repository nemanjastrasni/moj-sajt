# Mobilni prikaz tabulatura

Na konkretnoj pesmi Fleetwood Mac — Albatross Tab, izvorni prikaz je delio neke sisteme na nepovezane delove. Uzrok su redovi koji počinju klizanjem pre prvog praga i red sa tekstualnom napomenom posle završne crte. Ostali prepoznati sistemi već su imali zajednički kontejner.

## Ponašanje

Novi `tabLayout.ts` je isključivo prezentacioni sloj nad već parsiranim redovima. Prepoznaje ove eksplicitno obeležene žice, zadržava originalne znakove i grupiše ih zajedno. Tekstovi u bazi, parser procene težine i revizija sačuvanih procena ostaju netaknuti. Nije potreban backfill.

Podrazumevana opcija „Prilagodi ekranu“ prelama ceo sistem u zajedničkim izvornim kolonama. Svaki nastavak ponavlja oznake žica. Prednost imaju zajedničke taktne crte; višecifreni pragovi i povezane tehnike nisu presečeni. Napomena ostaje čitljiva uz tab. Izvorno neporavnate taktne crte nisu muzički ispravljane niti su pragovi pomerani između žica.

„Izvorni redovi“ prikazuje neprelomljeni sistem sa jednim zajedničkim horizontalnim skrolom. Jedan `pre` prikazuje sve žice segmenta; žice više nemaju svoje skrol kontejnere. Ako je pojedinačna nedeljiva tehnika duža od dostupne širine, i prilagođeni režim zadržava tu tehniku celom u zajedničkom kontejneru, umesto da je ošteti ili smanji font do nečitljivosti.

Postojeći ResizeObserver automatski prilagođava raspored promeni širine, uključujući fizičko okretanje telefona kada je dozvoljeno u podešavanjima uređaja. Postojeći režim za sviranje i opcija „Ceo ekran“ su zadržani. Nije dodat prinudni Screen Orientation lock; dostupnost tog API-ja zavisi od pregledača i uslova punog ekrana. Dodata je kratka pomoć za vodoravni pregled i prevod novih kontrola na engleski.

## Provere

- Svih 810 offline testova je prošlo; uključuju očuvanje svake izvorne kolone, grupisanje, tehnike, napomene, običan tekst, prethodni prikaz akorda i režim samo teksta.
- TypeScript, ciljano lintovanje, offline provera iste revizije algoritma i Next.js 15.5.15 produkcioni build su prošli.
- Build i browser provera koriste izdvojene fixture podatke. Konkretan javni zapis Albatross je učitan samo za lokalnu proveru; nije dodat u repozitorijum. Nisu korišćeni produkcioni upisi ni korisnički nalozi.
- Chromium sa simuliranim mobilnim prikazom: 320, 360, 390 i 430 px širine, 844×390 vodoravno, okretanje nazad i režim za sviranje. Svih 35 izvornih sistema ima po šest žica. U prilagođenom prikazu ove pesme nema horizontalnog preliva.
- Pri širini 390 px dobijeno je 68 čitljivih segmenata, a vodoravno 35; font ostaje 18 px (20 px u režimu za sviranje). Napomena je sačuvana.
- U izvornom režimu pomeranje jednog zajedničkog kontejnera za 30 px pomera svih šest žica za istih 30 px; nema pojedinačnih skrolera. Nema JavaScript izuzetaka.

Provera u Chromium-u ne zamenjuje fizičku proveru na konkretnom Safari/Android uređaju. Posle korisničkog deploya otvoriti istu pesmu na telefonu, proveriti oba režima i fizičko okretanje uređaja.

Deploy i Git push nisu pokretani. Dogovoreni olakšani unos tabova nije deo ove izmene. Diskografije, statusi rešenih nalaza i spajanje izvođača čekaju sledeći korak nakon ovog Git checkpoint-a.
