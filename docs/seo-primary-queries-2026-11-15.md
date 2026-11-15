# SEO: glavne pretrage za gitaru

Datum: 15. novembar 2026. Nastavak prethodnog bloka `f359585`.

## Prioritet i početno merenje

Glavni cilj su „akordi za gitaru“, „gitara akordi“, „gitarski akordi“ i „akordi gitara“. Početna predstavlja katalog pesama i alata; `/akordi` predstavlja dijagrame i hvatove, a `/pesme` katalog zapisa. Ne prave se identične stranice za svaku varijaciju reči.

Na vlasnikovim slikama Search Console, tačni upiti „gitara akordi“ i „akordi za gitaru“ imaju nula prikaza za izabrani period. Tada nema smislene prosečne pozicije. Ranijih 5,7 iz šireg filtera sa tri prikaza nije dokaz šestog mesta za tačan glavni upit. Pojedinačne pesme i biografije već imaju prikaze; njih treba negovati kao dodatne ulaze, bez zamene glavnog prioriteta.

## Izmene

- Početna u naslovu prvo navodi „Akordi za gitaru i tekstovi pesama“, zatim brend. Odmah ispod uvoda dodate su obične HTML veze ka pesmama, gitarskim akordima i lakšim pesmama.
- `/akordi` dobija osam server-renderovanih SVG dijagrama: Em, Am, C, G, D, Dm, E i A. Uz njih su oznake X/0, orijentacija žica, standardno štimovanje i veze ka ostalim hvatovima. Tekst je dostupan na srpskom i engleskom. Na mobilnom se mreža prilagođava širini.
- Primeri koriste istu komponentu dijagrama kao postojeći vodič. Nema nove biblioteke, dodatnih upita bazi, zahteva za slike ili klijentske obrade dijagrama. `/akordi` ostaje statička stranica.
- Opisi pesama sa vidljivim akordima sada izričito navode akorde za gitaru i tekst. Ne obećavaju capo preporuke za svaki zapis. Tekstovi bez akorda, instrumentalni zapisi, prazni zapisi i početni fragmenti zadržavaju svoja pravila.
- Opis biografije koristi kratak uvod iz postojećeg javnog teksta kada ga ima dovoljno, uz generički rezervni opis. Navigacija i natpis profila navode diskografiju samo kada postoji normalizovan spisak izdanja.

Nisu menjani tekstovi pesama, imena izvođača, biografije u bazi, diskografije, licence, kontrolni hash-evi, ID-evi ili postojeće canonical odluke. Javna pretraga pokazuje dva zapisa „Ličiš na moga oca“; to samo po sebi nije dokaz identičnog sadržaja, pa nisu automatski spojeni. Ovaj blok ne tvrdi da je svih 624 neindeksiranih stranica rešeno.

## Provera

- 900 uspešnih testova, bez neuspeha; jedan opt-in test baze preskočen. Obuhvaćene su regresije pretrage, canonical pravila, keša, pesama, plejlista i biografija.
- Next.js 15.5.15 produkcioni build prošao je sa izolovanim sintetičkim javnim podacima, bez produkcionih kredencijala. To proverava kompilaciju, tipove i prerenderovanje; ne proverava produkcione migracije ili stanje baze.
- ESLint za izmenjene TypeScript/TSX i test fajlove prolazi.
- Provera produkcionog builda u lokalnom browseru: devet javnih stranica bez JavaScripta, osam dijagrama u HTML-u i 36 kombinacija prikaza (320, 390 i 1366 px, tamna/svetla tema). Bez horizontalnog prelivanja cele stranice ili JavaScript grešaka.
- Provera javne početne, `/akordi` i `/robots.txt` vratila je HTTP 200; trenutni robots dozvoljava javne stranice. Prethodni SEO blok je vidljiv. Nove izmene nisu deployovane ovim radom.

Detaljni lokalni rezultati su u `outputs/seo-upiti-2026-11-15` radnog prostora Codex. Produkciona baza nije menjana. Nisu pokrenuti commit, push ili deploy.

## Kako proveriti rezultat posle objave

1. Posle uspešnog Render deploya proveriti javne `/` i `/akordi`: nove naslove, linkove i dijagrame. U URL Inspection za obe adrese jednom zatražiti novo indeksiranje.
2. U Search Console → Performance → Search results pratiti Web i upite posebno: tačan „akordi za gitaru“, „gitara akordi“, „gitarski akordi“ i „akordi gitara“. Širi filter „containing akordi“ može poslužiti za pronalaženje novih upita, ali ne predstavlja poziciju konkretnog upita.
3. Uporediti 28 dana pre i posle objave, uz datum objave kao početak posmatranja. Beležiti prikaze, klikove, CTR, prosečnu poziciju i URL koji se pojavljuje. Srbiju i mobilne uređaje pregledati i posebno. Kod nula prikaza ili veoma malog uzorka ne izvoditi zaključak o fiksnoj poziciji.
4. Za glavne pojmove prvo očekujemo merljive prikaze, zatim rast klikova. Nema garancije prve strane. Ne uvoditi nove promene naslova svakog dana jer se time otežava poređenje.

Google navodi da su korisnost sadržaja i razumljive veze važni, da ne postoji automatski postupak za prvo mesto i da procena izmena često zahteva nekoliko nedelja: https://developers.google.com/search/docs/fundamentals/seo-starter-guide.

Ranije dokumentovani rizik Render Free robots odgovora pri uspavanom servisu ostaje infrastrukturno pitanje; trenutni uspešan robots odgovor ne potvrđuje ponašanje tokom uspavljivanja. Vidi prethodni izveštaj `organic-search-2026-11-15.md`. Ovim blokom hosting nije menjan.
