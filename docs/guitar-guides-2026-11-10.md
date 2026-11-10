# Vodiči za gitaru i prepoznavanje uvodnih redova

Datum: 10. novembar 2026.

## Promena

- Novi javni pregled `/vodici` i tri zasebna, unapred generisana vodiča: čitanje dijagrama, vežba Em–Am i capo/transpozicija. Tekst je originalno napisan za sajt; izvori služe za dodatno čitanje. Dijagrami Em/Am su SVG sa označenim žicama i tekstualnim opisom. Vežba ritma i tabela capo primera nisu preuzete pesme.
- Srpski HTML je dostupan bez JavaScripta. Postojeći izbor jezika prikazuje i kompletne engleske tekstove. Ovo nije dodavanje zasebnih engleskih URL-ova ili hreflang obećanja. Naslovi, opisi, canonical adrese i breadcrumb podaci odgovaraju javnim stranicama; ne dodaju se izmišljeni autori, ocene ili datum poslednje izmene.
- Ulazi u vodiče dodati su na početnoj, u katalogu pesama, dijagramima i podnožju. Sve četiri nove adrese ulaze u postojeći sitemap bez menjanja njegovih URL-ova. Vodiči se međusobno povezuju i vode do postojećih kataloga.
- Parser prepoznaje oznake `Forspil`, `Foršpil` i `UVO` samo kada je ostatak reda prepoznatljiva muzička notacija. Granica iza oznake sprečava prepoznavanje početka obične reči kao oznake. U uzorku od 50 ranije odabranih popularnih pesama ovo omogućava transpoziciju tri reda. Izvorni tekst, kolone, podaci baze i ručni statusi provere ostaju isti.
- Vodič za capo objašnjava stvarno ponašanje sajta: transpozicija menja ciljani zvučni tonalitet, a izbor capo praga preračunava hvatove da taj zvuk ostane isti. Izvorne capo napomene i ograničenja tabulature ostaju relevantni.

## Provera

128 odabranih testova prošlo je u radnoj kopiji: parser, SEO, jezici, vodiči, capo, PDF pesmarice, performance prikaz i audit. TypeScript i produkcioni build prošli su. Build koristi zasebnu QA kopiju i postojeću bazu u memoriji; stvarna Prisma konfiguracija nije zamenjena u radnoj kopiji za primenu. Vizuelna provera i konačni javni HTTP pregled beleže se u izveštaju ove izmene.

Uzorkovanje je prema internom brojaču popularnosti od 9. novembra, ne prema Google Search Console posetama. Muzička tačnost zapisa nije automatski proglašena potvrđenom. Stari mobilni/HTTP audit imao je povremene serverske greške; njihove prethodne neuspehe ne treba predstavljati kao trenutno stanje bez nove provere.

## Objavljivanje

Nema nove zavisnosti, migracije ili potrebnog menjanja DNS-a. Ova izmena ne dira YouTube plejer, muzičke linkove, korisnička prava ili sadržaj postojećih pesama/biografija. Objavljivanje ide kroz postojeći GitHub/Vercel postupak vlasnika; rad na kodu sam po sebi nije potvrda javnog deploya, indeksiranja ili boljeg Google ranga.

## Izvori

- https://www.fender.com/articles/chords/read-guitar-chord-charts
- https://www.fender.com/articles/chords/5-tips-to-master-chord-changes
- https://www.fender.com/articles/parts-and-accessories/what-is-a-capo
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
