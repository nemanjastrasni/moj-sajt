# SEO javnih izbora pesama

Datum: 16. novembar 2026. Osnova: commit `c6c0047`.

## Potvrđeno stanje

Početna i `/akordi` vraćaju HTTP 200, očekivane naslove i sopstvene canonical adrese. Provereni robots.txt dozvoljava javne stranice i navodi sitemap. To je trenutni HTTP uzorak; nije dokaz stalne dostupnosti pri uspavanom hostingu.

Vlasnikovi Search Console snimci potvrđuju indeksiranu početnu sa poslednjim prijavljenim obilaskom 12. novembra, kao i `/akordi` sa statusom „Discovered – currently not indexed“. Live test za `/akordi` je prošao i vlasnik je poslao potvrdu prihvaćenog zahteva za indeksiranje. To nije potvrda naknadnog indeksiranja. Filtrirani pregled glavnih pojmova pokazuje nula prikaza za prikazani period koji prethodi novim izmenama; iz njega se ne izvodi buduća pozicija.

Javni `/plejliste/beginner` ima naslov i H1 „Veoma lako i lako“: naslov ne objašnjava jasno da je to izbor lakih pesama za gitaru. Linkovi kategorija i povratak sa druge na prvu stranu koriste `?page=1`, dok metadata već bira čistu adresu bez tog parametra. Parametri druge strane i kategorije imaju sopstveni canonical i treba da ostanu odvojeni.

U prvom paralelnom HTTP uzorku katalog je dovršio odgovore za oko 7 sekundi. Dva kasnija zahteva završila su se za 399–405 ms, uz 307–385 ms do prvih zaglavlja. To nisu statistički benchmark ili CPU merenje, niti rezultat ovog lokalnog bloka; nova verzija tada još nije objavljena.

## Izmene

1. Tri postojeća javna izbora dobijaju razumljive naslove, H1 i kratak originalni opis na srpskom i engleskom:
   - `/plejliste/beginner`: lake pesme za gitaru za početnike, prema postojećoj proceni veoma lako/lako.
   - `/plejliste/4-akorda`: pesme sa **do** četiri različita prepoznata akorda, uz napomenu da broj nije potpuna mera težine.
   - `/plejliste/acoustic`: zapisi koji koriste postojeći skup otvorenih akorda C, D, E, G, A, Am, Dm i Em; ne tvrdi se da svaki zapis sadrži svih osam ili da je svaki originalni snimak akustičan.
2. Kratke veze ispod tih izbora vode ka dijagramima, čitanju akorda i vežbanju promene hvatova. Pregled `/plejliste` dobija direktan link ka izboru za početnike.
3. Prva strana sada koristi `/plejliste/beginner`, a filtrirana prva strana `?category=...`. `?page=2` i filteri ostaju u linkovima narednih strana. Funkcionalni povratak iz pesme na konkretan izbor, kategoriju i broj strane ostaje podržan.
4. Metadata tri izbora opisuje stvarni izbor, izabranu kategoriju i kasniju stranu. Prazni rezultati zadržavaju noindex; privatne plejliste zadržavaju prethodna pravila i ne čitaju se radi javnog SEO opisa. Ostali javni nivoi težine zadržavaju prethodni tekst metadata.

Nema novih URL ulaza za varijacije ključnih reči, promena izbora ili redosleda pesama, procene težine, baze ili keša izvornog kataloga. Nisu dodati upiti bazi, parsiranje pesama pri renderovanju, biblioteke ili migracije. Početna i njena nova pozicija uvoda nisu menjane.

Google preporučuje dosledne canonical signale i veze ka odvojenim stranama paginacije: [canonical smernice](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [paginacija](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading). Ove dorade poboljšavaju opis i put kroz postojeći sadržaj; nisu garancija prvog mesta za „akordi za gitaru“.

## Validacija i granice

- 913 uspešnih testova, bez neuspeha, jedan postojeći opt-in test baze preskočen. Obuhvaćene su privatne plejliste, povratni kontekst, kategorije, paginacija, prazni rezultati i upotreba sačuvanih procena bez parsiranja na toplim čitanjima.
- Next.js 15.5.15 produkcioni build sa izolovanim javnim testnim podacima; bez produkcionih kredencijala ili migracija.
- Šest javnih HTML odgovora bez JavaScripta: jedinstven H1, očekivani naslovi, canonical za prvi/drugi/filtrirani pregled i bez linkova koji dodaju `page=1`.
- 32 prikaza tri izbora i pregleda plejlista: 320, 390 i 1366 px, plus vodoravni 844×390, obe teme. Bez prelivanja cele stranice ili JavaScript grešaka.
- ESLint izmenjenih TypeScript/TSX i test fajlova, kao i Git diff provera.

Logovi, HTTP uzorci i browser provera su u Codex radnom prostoru `outputs/seo-catalog-2026-11-16`. Nisu pokretani commit, push, deploy ili izmene produkcione baze. Posle objave proveriti tri javna izbora; status Google indeksiranja i osnovne upite meriti zasebno u Search Console-u kada budu obrađeni novi podaci.
