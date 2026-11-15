# Organska pretraga: stanje i prvi dodatni blok dorada

Datum: 15. novembar 2026. Domen: https://www.gitarakordi.com.

## Potvrđeno stanje, bez nagađanja pozicije

Vlasnikov Search Console pregled prikazuje približno **4,47 hiljada indeksiranih URL-ova** i **641 neindeksiran URL**: 624 „Crawled – currently not indexed“, 15 „Duplicate, Google chose different canonical than user“ i 2 „Page with redirect“. Na tom pregledu nema kategorije „Blocked by robots.txt“. To potvrđuje da domen nije potpuno odsutan iz Google indeksa. Ne potvrđuje poziciju za „akordi za gitaru“, broj klikova ili indeksiranje svake važne stranice. Za rangiranje koristiti Performance podatke po upitu, stranici, zemlji i uređaju; ručno listanje rezultata nije pouzdana jedinstvena pozicija.

Read-only HTTP provera 12 javnih ulaza, robots.txt i sitemap-a potvrđuje HTTP 200, očekivane canonical adrese i odsustvo opšteg noindex-a na odabranim javnim stranicama. Bez-www domen vraća 301 na www. Sitemap index ima pages.xml, deset delova za pesme i dva za izvođače. Javna HTTP provera nije koristila pristup nalozima ili bazi. Ovo nije inventar svih URL-ova ili dokaz trajne dostupnosti.

## Provera primera koje je vlasnik dostavio iz Search Console-a

Provereno je deset adresa sa slike/poruke: Adnan I Tarik, Jami, četiri konkretne pesme i biografski profili Block out, Neno Belan, Breskvica i Uroš Živković. Trenutni odgovori imaju javni sadržaj, ispravan status i očekivani canonical. Stara adresa `/biografija/domace/belan-neno` već vodi na `/biografija/domace/neno-belan`; ne uvodi se novo preimenovanje. Varijanta Personal Jesus sa `?artist=...` ima čist canonical bez parametra. Duplikat istog Breskvica linka u korisnikovoj poruci nije dokaz dve različite stranice na sajtu.

Poslednji Google obilazak na slici je 10–11. novembra. Trenutno ispravan odgovor ne dokazuje kakav je bio tada niti da ga je Google već ponovo obradio. Sama poruka „crawled, currently not indexed“ ne dokazuje grešku, kaznu, loš kvalitet ili da će dodavanje ključnih reči rešiti indeksiranje. Naknadno je vlasnik dostavio prvih deset primera iz grupe od 15 canonical slučajeva. Provera pet javnih stranica izvođača pronašla je odgovarajuće druge zapise. Zatim je kroz TLS sa proverenim Supabase CA sertifikatom izvršen ograničen SELECT za 21 kandidata u READ ONLY transakciji, završenoj ROLLBACK-om. Nijedan zapis nije menjan. Potvrđeno je deset potpuno istih parova po SHA-256 celog JSON para [lyrics, chords], kod istog izvođača. U artefakte su sačuvani samo javni identiteti i kontrolni hash-evi, bez tekstova pesama ili kredencijala. Google izabrani canonical nije čitan, pa se ne tvrdi da je baš to njegova trenutno izabrana adresa.

## Potvrđeni parovi i canonical dorada

Postojeća dva urednička pravila (Zombie fragment i Bela Ladja duplikat) ostaju nepromenjena. Dodato je deset verzionisanih canonical parova u postojećem song-search-review sistemu. Za svakog se proveravaju ID, naslov, slug, izvođač, kategorija i hash oba zapisa. Duplikat dobija canonical identične ciljane verzije i izostavlja se iz sitemap-a; oba zapisa ostaju dostupna sa svojim ID-evima i vezama u privatnim plejlistama. Nema 301 preusmeravanja ili spajanja baze. Apokalipso ima i trećeg kandidata sa drugačijim sadržajem: on nije proglašen duplikatom.

Sitemap keš sada u ključ uključuje reviziju celog spiska pravila, pa dopuna pravila ne koristi stare odluke keša. U kontrolisanoj read-only proveri aktuelnih 21 zapisa ista funkcija iz pripremljenog koda potvrdila je svih deset canonical odluka; promena izvornog ili ciljnog sadržaja testirana je samo na kopiji u memoriji i vraća sopstveni canonical. Ako se zapis, izvođač ili cilj kasnije promeni/nestane, postojeće zaštite odustaju od stare odluke. Pet preostalih primera iz ukupnih 15 nije dostavljeno i nije obuhvaćeno ovom potvrdom.

## Važan preostali rizik hostinga

Render zvanično dokumentuje da **Free web service, dok je uspavan, na `/robots.txt` automatski odgovara zabranom obilaska celog sajta**, bez pokretanja aplikacije. Dok je servis aktivan, zahtev ide aplikaciji i naš robots.txt pravilno dozvoljava javne stranice. Google može keširati robots.txt, uglavnom do 24 sata. Kombinacija je realan rizik, ali ovim proverama nije dokazano da je baš ona uzrok trenutnih Search Console kategorija.

Izmena teksta stranice ili Next robots.ts ne može prepisati odgovor koji Render šalje pre aplikacije. Za stabilan produkcioni crawl treba odlučiti o hostingu bez uspavljivanja ili posebno proveriti javno posluživanje robots.txt na nivou infrastrukture. Nije menjana infrastruktura, DNS, Cloudflare, plan ili način naplate. Nije postavljen periodični ping radi održavanja Free servisa budnim. Na ovome se ne zasniva obećanje pozicije ili zahtev da se odmah plati hosting.

## Šta je promenjeno u kodu

1. **Čistiji linkovi pesama.** ArtistSongRows više ne dodaje `?artist=` na svaki link. Čista adresa se koristi za običnu pesmu i prvog izvođača. Parametar ostaje za drugog navedenog izvođača u duetu kada menja funkcionalni povratak. To prati postojeći SongPage algoritam povratka. Postojeće adrese sa parametrima i dalje rade i imaju isti canonical. Privatni `?playlist=` kontekst i navigacija nisu menjani. Nisu menjani ID-evi, slugovi ili redovi pesama.
2. **Vidljiva početna.** Postojeći H1 više nije samo sr-only. Kratak uvod objašnjava akorde i repertoar. Donji javni odeljak sada jasno povezuje pesme, dijagrame, biografije/diskografije, plejliste, muzičke liste i uputstva. Nema nove baze, biblioteke, slika ili dodatnih home upita; postojeća dva popular/latest upita ostaju ista.
3. **Tri kategorije pesama.** Naslov, H1 i kratak jedinstveni uvod odgovaraju domaćim/zabavnim, narodnim i stranim pesmama. Veze vode ka odgovarajućem izboru za vežbanje, dijagramima i vodičima. URL-ovi i pravila pristupa ostaju ista. Tekst razlikuje zapise sa akordima, tekstom i tabulaturom.
4. **Javni tematski ulazi.** Biografije objašnjavaju i diskografije, albume i izvore. Plejliste objašnjavaju repertoar i PDF. Javni muzički katalog objašnjava YouTube linkove i ugrađeni plejer i razlikuje ih od zapisa za sviranje. Promotivni opis ne prikazuje se u privatnom katalogu vlasnika.
5. **Dva originalna javna uputstva** na stabilnim adresama:
   - `/vodici/plejliste-za-gitaru-i-pdf-pesmarica`: izbor pesama, prijava, + Playlist, redosled, podešavanja liste, sviranje, PDF 1–100 pesama i deljenje.
   - `/vodici/youtube-muzika-i-muzicke-plejliste`: dve vrste lista, YouTube linkovi, ugrađeni plejer, nedostupni snimci i kopiranje/deljenje uz kontrolu privatnosti.

Uputstva opisuju postojeće funkcije iz koda. Ne preuzimaju tuđe članke/pesme i ne obećavaju download prava ili MP3 uslugu na sajtu. Imaju zasebne naslove/opise, canonical, sadržaj, sidra i međusobne veze kroz postojeći sistem vodiča. Automatski ulaze u postojeći statički sitemap. Novi javni tekstovi imaju engleske prevode kroz isti izbor jezika; nisu izmišljene odvojene jezičke URL varijante/hreflang oznake. Postojeći muzički vodiči i njihovi izvori ostaju sačuvani; izvor je opcion za sopstvena uputstva o sajtu.

Nisu dodati keywords meta tagovi, masovne varijante stranica za iste fraze, skriven tekst, automatske povratne veze, izmišljene ocene, autori, datumi izmena ili FAQ rich results. Postojeća private/admin noindex/robots pravila nisu oslabljena. Biografije, diskografije, izvori, licence, hash vrednosti i pesme u bazi nisu menjani.

## Provere

- 896/896 offline regresiona testa prolaze. Jedan nepovezani, opt-in engagement SQL test preskočen je u ovom prolazu; ranije je zasebno proveravan. Dodato je jedanaest testova za javni HTML, vidljiv H1, različite kategorije, linkove, očuvanje drugog izvođača, nove vodiče/sitemap i engleski tekst, integritet pravila, očuvanje ranijih odluka i reviziju keša. Ažuriran je postojeći test linka obične pesme na namerno novu čistu adresu.
- TypeScript i ciljani ESLint prolaze.
- Next.js 15.5.15 produkcioni build prošao je u odvojenoj kopiji sa fixture bazom i praznim produkcionim DATABASE_URL/DIRECT_URL. QA zamene ne ulaze u projekat.
- Osam HTTP/HTML provera sa isključenim JavaScript-om potvrđuje sadržaj, metapodatke i javne veze; početna, statični ulazi i novi vodiči imaju vidljiv sadržaj. Kategorija pesama koristi postojeći Next loading/streaming mehanizam, pa se njen sadržaj u tom režimu nalazi u streamovanom HTML-u i za prikaz se premesti JavaScript-om; njena vidljivost dodatno je proverena sa uključenim JavaScript-om. Nije predstavljeno kao podrška svih dinamičkih ekrana bez JavaScript-a.
- 30 rasporeda: pet stranica, širine 320/390/1366 i obe teme, bez horizontalnog preliva ili JavaScript grešaka. Sadržaj mobilne početne i PDF vodiča vizuelno je pregledan.
- Novi vodiči su u pages.xml tačno jednom. Bez direktnih produkcionih upisa ili test naloga. Naknadne javne provere koriste ReviewBot User-Agent koji postojeći brojač pregleda izuzima; obični raniji HTTP GET zahtevi mogu biti tretirani kao normalni pregledi u heurističkom brojaču. Ovo nije Lighthouse/CrUX merenje ili dokaz promene Google ranga.

## Objavljivanje i merenje

Ne pokretati novi deploy dok prethodni zaglavljeni deploy nije razjašnjen/otkazan i dok vlasnik ne pregleda izmene. Kod se predaje za korisnikov Git/push; nema automatskog deploya ili izmene baze. Nema nove migracije.

Posle Live proveriti početnu, tri kategorije i oba nova vodiča (200 + jedan canonical), zatim `/sitemaps/pages.xml`. Postojeći sitemap index ostaje isti i ne treba ponovo praviti Search Console property ili DNS verifikaciju. Za nekoliko važnih promenjenih adresa može se zatražiti indeksiranje; ne slati isti zahtev iznova niti ručno tražiti svih hiljada URL-ova.

Pre objave sačuvati Search Console Performance rezultat za prethodnih 28 dana, odvojeno za upite „akordi za gitaru“, „gitarski akordi“, „pesme sa akordima“, „domaće pesme akordi“, „narodne pesme akordi“ i konkretne izvođače/pesme koji već imaju utiske. Gde nema podataka, to označiti. Pratiti klikove, utiske, CTR i prosečnu poziciju po upitu i odredišnoj stranici, uz istu zemlju i uređaj. Uporediti nakon 2–4 nedelje i ponovo nakon narednog jednakog perioda; ne pripisivati svaki pomak ovoj promeni. Za nove vodiče pratiti njihove sopstvene upite, a ne obećavati rangiranje iznad YouTube-a za opštu pretragu muzike. Korisnička analitika naloga i Google Performance mere različite stvari.

Posle objave proveriti deset potvrđenih parova kroz URL Inspection i kasnije ažuriranje izveštaja. Pet preostalih primera i Google izabrani canonical ostaju za pojedinačnu proveru. Za 624 obiđene adrese prioritizovati konkretne kvalitetne stranice koje imaju upite/utiske i proveriti sadržaj, duplikate, statuse, interne veze i istoriju. Ne proglašavati sve te adrese neispravnim niti forsirati indeksiranje svake varijante.

## Zvanični izvori

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google: Page indexing report](https://support.google.com/webmasters/answer/7440203)
- [Google: canonical troubleshooting](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting)
- [Google: robots.txt i keširanje](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Google: traženje novog obilaska](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Render Free: robots.txt odgovori](https://render.com/docs/free#automatic-robotstxt-responses)
