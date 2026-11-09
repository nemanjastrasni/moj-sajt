# Ciljane pretrage i manje slika pri učitavanju

Datum: 9. novembar 2026. Domen: https://www.gitarakordi.com.

## Cilj i stvarne granice

Cilj vlasnika je prvih deset organskih rezultata za pretrage poput „akordi za gitaru” i „pesme sa akordima”. Pozicija nije potvrđena niti je moguće garantovati je izmenom koda. Search Console je tek povezan; potrebni su njegovi podaci o indeksiranju, upitima, utiscima i klikovima. Rezultati javnog web pretraživača nisu korišćeni kao merenje Google pozicije u Srbiji.

## Pripremljene izmene

- Početna dobija precizniji title, opis i H1 za akorde za gitaru i tekstove pesama. Kratak vidljiv odeljak posle postojećih lista objašnjava korišćenje i vodi ka pesmama, dijagramima i početničkim listama. Gornji raspored i hero ostaju isti.
- `/pesme` dobija jasan glavni naslov, uputstvo za pronalaženje izvođača, objašnjenje dostupnih zapisa i veze ka postojećim izborima za početnike, do četiri akorda i otvorene hvatove. Napomena objašnjava ograničenja automatske procene težine.
- `/akordi` dobija originalna kratka objašnjenja oznaka akorda, X/0 na dijagramima, početnog praga i vežbanja otvorenih hvatova. Oznake i sami dijagrami nisu menjani.
- Objašnjenja su javni HTML vidljiv posetiocu, uz stvarne veze koje rade i bez JavaScripta. Nema novih stranica koje se razlikuju samo po ključnoj frazi, skrivenog teksta za pretraživače, lažnih ocena ili FAQ rich-result tvrdnji. Nova uputstva imaju i engleske prevode kroz postojeći izbor jezika.
- Pet fotografija kategorija i dekorativnih pozadina dobija ukupno 14 AVIF varijanti. Svaka je manja od odgovarajućeg WebP fajla pri istoj dimenziji. `<picture>` bira AVIF kada ga pregledač podržava; postojeći WebP ostaje rezervna verzija. Prioritetni hero, preučitavanje slajdova, originali, fotografije izvođača i postojeći WebP zapisi nisu menjani. Raspored čuva prikaz bez dodatnog picture okvira. Sve AVIF putanje imaju sadržajno zavisna imena i koriste postojeći immutable cache direktorijum.

Reprodukcija slika: `npm run images:avif`. Ako se prethodno ponovo generiše WebP manifest kroz `images:optimize`, ponovo pokrenuti i AVIF korak. Generator prvo priprema i proverava sve izabrane slike, pa snima novi manifest; odbija skup ako makar jedna širina nije manja. Nema runtime obrade fotografija ili nove zavisnosti.

## Pretrage i postojeće odredišne stranice

| Namena pretrage | Stranica | Šta posetilac dobija |
| --- | --- | --- |
| Akordi za gitaru, dijagrami i hvatovi | `/akordi` | Izbor tona, hvatovi i objašnjenja oznaka |
| Pesme sa akordima za gitaru | `/pesme` | Kategorije i put do izvođača/pesme |
| Lake pesme za početnike | `/plejliste/beginner` | Postojeći izbor prema automatskoj proceni težine |
| Pesme sa do četiri akorda | `/plejliste/4-akorda` | Postojeći izbor zapisa sa najviše četiri prepoznata akorda |
| Naziv pesme + izvođač + akordi | Postojeća pojedinačna pesma | Konkretan zapis i odgovarajući SEO opis iz prethodne izmene |

## Merenja

Ponovljeno javno početno merenje pre ove izmene: desktop 549.447 B i LCP 928 ms; mobilni 369.430 B i LCP 1.028 ms. Produkcija još nema ove AVIF izmene.

Ista odvojena produkciona QA kopija sa istom fixture bazom merena je pre i posle izmene. Hladan browser keš; mobilni profil 390 × 844, 1,6 Mbps, 150 ms, 4× CPU. Svi ne-GET/HEAD zahtevi blokirani su u browser testu. To nisu Lighthouse rezultati, terenski Core Web Vitals ili izmeren INP.

| Profil | Prenos pre | Prenos posle | Manje ukupnih podataka | Manje podataka slika |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 503.855 B | 459.763 B | 8,8% | 18,8% |
| Mobilni | 327.815 B | 316.747 B | 3,4% | 13,9% |

Mobilni LCP u jednom lokalnom paru bio je 784 ms pre i 772 ms posle; ta mala razlika nije dokaz stabilnog ubrzanja. Pouzdano izmeren dobitak ovog prolaza je manji prenos. CLS je ostao 0 na mobilnom profilu. Ne porediti lokalnu latenciju direktno sa javnim Vercel merenjem niti obećavati isti procenat kraćeg čekanja na svim uređajima.

## Provere

Prošlo je 57 odabranih testova za SEO, odredišne stranice, format slika, domenu i jezike, TypeScript, ciljani ESLint i odvojeni produkcioni build. Svaka AVIF datoteka dekodirana je i proverene su dimenzije i broj bajtova. Svi raniji WebP i hero podaci u manifestu upoređeni su sa HEAD i potpuno su isti.

Browser je proverio početnu, pesme i akorde na širinama 320, 390 i 1366 px, u tamnoj i svetloj temi: 18 prikaza, bez horizontalnog prelivanja i JavaScript grešaka. Potvrđeno je stvarno biranje AVIF-a na početnoj i prisustvo veza ka javnim listama i kada je JavaScript isključen. Mobilne stranice vizuelno su pregledane. Baza, muzički zapisi, prava pristupa, DNS i Search Console podešavanja nisu menjani. Git/deploy obavlja vlasnik.

## Sledeći koraci prema stvarnim podacima

1. Posle deploya proveriti iste tri javne stranice, AVIF HTTP odgovore i rezervni WebP prikaz. Sitemap putanje se ovim prolazom ne menjaju.
2. Kada Search Console obradi sajt, zabeležiti broj indeksiranih stranica, odabrani canonical i upite koji već dobijaju utiske. Ako nema dovoljno podataka, ne izmišljati rang ili poboljšanje. Nedeljno upoređivati dostupne podatke po stranici i upitu; kod novog domena prvi period može biti bez dovoljno uzorka.
3. Prvo doraditi konkretne pesme i izvođače koji dobijaju utiske ili imaju potvrđene probleme, uz postojeća pravila odobravanja sadržaja. Za duže i preciznije upite konkurencija može biti drugačija, ali ni za njih nema garantovane pozicije.
4. Pripremiti za pregled originalna praktična uputstva o čitanju dijagrama, promenama hvatova i izboru tonaliteta/capoa, uz stvarne primere koji ne preuzimaju tuđe pesme ili tutorijale. Ne praviti masovne generičke članke samo radi ključnih reči.
5. Preporuke i veze drugih muzičkih sajtova ili nastavnika moraju biti stvarne i korisne. Ovaj prolaz nije kontaktirao druge osobe, kupovao veze ili pravio automatske objave.

## Izvori i privatni dokazi

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Google: sadržaj namenjen ljudima](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google: čitljive veze i opisni tekst linka](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [web.dev: učitavanje slika u pregledaču](https://web.dev/articles/browser-level-image-lazy-loading)

Privatni rezultati, snimci i build log: `C:\Users\dimit\Documents\Codex\2026-10-31\da\outputs\seo-speed-growth-2026-11-09`.
