# Google Search Console i SEO posle povezivanja domena

Datum: 9. novembar 2026. Glavni domen: https://www.gitarakordi.com.

## Šta je provereno

Na javnom sajtu pregledane su 32 odabrane stranice: početna, glavni katalozi, tri kategorije, slovo Č, akord C#, 15 pesama i pet biografskih profila, kao i kontakt i opis sajta. Provereni su HTTP status, canonical, title, description, H1 i ispravnost JSON-LD zapisa. U tom uzorku nema grešaka u ovim proverama ni ponovljenih naslova. Ovo nije potvrda da su svi podaci u sadržaju tačni.

Svih 13 sitemap datoteka koristi zvanični domen i sadrži 11.779 različitih javnih adresa, uključujući 9.394 pesme. Dve izmišljene putanje vraćaju pravi HTTP 404 i noindex. Stara Vercel adresa sada vraća 308 na www; ranije pripremljena migracija domena je objavljena. Provera dostupnosti i sadržaja sitemap-a ne potvrđuje Google indeksiranje.

Javni DNS upit pokazuje Cloudflare nameservere `razvan.ns.cloudflare.com` i `lorna.ns.cloudflare.com`. Vlasnik je tokom pripreme ovog izveštaja kroz Google/Cloudflare jednokratnu autorizaciju potvrdio Domain property **gitarakordi.com**, prijavio uspešno slanje sitemap-a i poruku **Indexing requested** za početnu. Naknadni javni DNS upit potvrđuje prisustvo jednog TXT zapisa `google-site-verification=`; njegova vrednost se ne kopira u repozitorijum. Podaci iz Google izveštaja o stvarnom indeksiranju, utiscima i klikovima nisu pregledani. Postupak na Google i Cloudflare nalogu obavio je vlasnik, ne agent.

## Izmene pripremljene za deploy

1. Naslov i opis pojedinačne pesme zavise od zapisa koji posetilac vidi. Pesma sa akordima zadržava „akordi i tekst”; tekst bez akorda dobija „tekst pesme”; tabulatura i instrumentalne oznake dobijaju „zapis za sviranje”. Prazan zapis dobija noindex/follow. Staro odvojeno chords polje koje SongClient ne prikazuje ne koristi se kao dokaz da stranica sadrži vidljive akorde. Sadržaj i funkcije pesme nisu menjani.
2. Profil sa samo biografijom ili samo diskografijom više ne oglašava oba sadržaja. Opisi ne obećavaju godine izdanja koje možda nisu unete. Profil bez oba sadržaja ostaje noindex/follow kao ranije.
3. Generička fotografija gitariste kao podrazumevana slika za deljenje linka zamenjena je namenskom PNG karticom 1200 × 630 sa odobrenim zelenim logotipom, opisom sadržaja i .com adresom. Stvarne fotografije izvođača na njihovim profilima zadržavaju prednost. Kartica nije nova vidljiva sekcija stranice i ne učitava se kao slika u njenom telu.
4. WebSite JSON-LD dobija postojeći naziv brenda sa .com i mali domen kao alternativna imena, kao i namensku sliku. Nisu dodati izmišljeni društveni nalozi, firma, ocene, recenzije ili nepostojeći SearchAction. JSON ostaje bezbedno serijalizovan.

Sadržaj produkcijske baze, biografije, diskografije, slike izvođača, akordi i URL putanje nisu menjani. Agent nije dodao Analytics, praćenje posetilaca, plaćenu API uslugu ili DNS zapis. Google TXT potvrdu je odobrio vlasnik kroz Cloudflare.

## Potvrda vlasništva u Search Console

**Završeno prema potvrdi vlasnika.** Sledeći koraci ostaju dokumentovani za održavanje i eventualno ponovno povezivanje; nije potrebno ponovo dodavati property ili TXT zapis.

1. Otvoriti https://search.google.com/search-console/welcome i prijaviti se vlasnikovim Google nalogom. Ovo se radi unutar Search Console, ne u polju za Google pretragu.
2. Izabrati **Domain / Domen** i uneti **gitarakordi.com**, bez protokola, putanje i www. Ova property obuhvata protokole i poddomene tog domena.
3. Kopirati celu TXT vrednost koju Google izda, koja počinje `google-site-verification=`. Ne izmišljati vrednost i ne kopirati tuđi primer. To je javni dokaz domena, nije OpenAI API ključ.
4. U Cloudflare nalogu otvoriti domen **gitarakordi.com → DNS → Records → Add record**. Tip: **TXT**. Name: **@**. Content: tačna Google vrednost. TTL: **Auto**. Sačuvati novi zapis. Ako je Cloudflare podešen preko hosting partnera, DNS zapis se uređuje kod tog partnera.
5. Vratiti se u Search Console i izabrati **Verify / Potvrdi**. Ako još nije vidljiv, sačekati propagaciju i ponoviti proveru. Sačuvati TXT zapis i posle potvrde: Google može ponovo proveravati vlasništvo. Postojeće A, AAAA, CNAME, MX i druge TXT zapise ne treba menjati ili brisati za ovaj postupak.

## Posle potvrde

- **Završeno prema potvrdi vlasnika:** u **Sitemaps** poslat je **https://www.gitarakordi.com/sitemap.xml**. Ostale delove indeksa nije potrebno pojedinačno unositi. Za početnu je zatraženo indeksiranje; zahtev ne treba ponavljati bez novog razloga.
- U **URL Inspection** proveriti početnu, jednu kategoriju, popularnu pesmu i profil sa stvarnom biografijom ili diskografijom. Koristiti javnu adresu bez parametara privatnih plejlista. Pregledati Google izabrani canonical i test uživo; za nekoliko važnih adresa može se zatražiti indeksiranje.
- Za stari Vercel poddomen, ako je ranije bio dodat i ima podatke u Search Console, naknadno proveriti i potvrditi odgovarajuću staru URL-prefix property i primenljivost Change of Address alata. Ne pretpostavljati da vlasnik ima kontrolu nad celim `vercel.app` domenom.
- Pratiti **Pages / Indexing**, **Sitemaps** i **Performance**. Utiske, klikove, upite i Google izabrane canonical adrese koristiti kao osnovu narednih izmena. DNS potvrda, prihvaćen sitemap i zahtev za indeksiranje nisu obećanje indeksiranja svih pesama ili pozicije u pretrazi.

## Sledeći rad na sadržaju

Prioritet imaju provereni sadržaji koje korisnici stvarno traže: tačni zapisi akorda na posećenim pesmama, korisni opisi izvođača i originalna objašnjenja sviranja. Potrebno je pripremiti konkretne predloge, bez masovnog automatskog prepisivanja pesama ili biografija. Pogrešan postojeći zapis se prijavljuje vlasniku pre zamene. Search Console podaci će pokazati koje stranice imaju utiske, ali slab odziv, i kojim temama treba dati prednost.

Ne treba dodavati keywords meta oznake, lažne ocene, masovne FAQ blokove, automatske povratne linkove ili današnji lastmod na svim pesmama bez stvarne izmene. Ne postoji garantovan SEO rezultat 10/10 niti garantovana prva pozicija.

## Validacija i vraćanje

Prošla su 73 regresiona testa, TypeScript i ciljani ESLint. Kartica je vizuelno pregledana i testirana u stvarnim dimenzijama. Prošao je produkcioni build u odvojenoj QA kopiji sa fixture bazom. HTTP provera izgrađene početne, pesme i biografije potvrdila je HTTP 200, canonical na www, nove SEO opise i Open Graph dimenzije 1200 × 630. Početna ima očekivana alternativna imena u WebSite JSON-LD zapisu. Javni PNG vraća image/png, ima 61.118 B i odgovara SHA-256 lokalnog fajla. U QA kopiji javne stranice testirane su kao anonimni posetilac; QA zamene za bazu i admin pristup nisu kopirane u stvarni repozitorijum. Izmene nisu automatski commitovane, poslate ili objavljene. Vraćanje ide kroz Git, bez vraćanja baze.

Privatni izlazi: `C:\Users\dimit\Documents\Codex\2026-10-31\da\outputs\domain-seo-2026-11-09`.

## Zvanični izvori

- [Google: vlasništvo nad sajtom](https://support.google.com/webmasters/answer/9008080)
- [Google: početak rada u Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start)
- [Cloudflare: dodavanje DNS zapisa](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
- [Google: nazivi sajtova i alternativna imena](https://developers.google.com/search/docs/appearance/site-names)
- [Google: opisi koji odgovaraju sadržaju stranice](https://developers.google.com/search/docs/appearance/snippet)
- [Google: migracija URL adresa](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
