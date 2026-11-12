# Manja CPU potrošnja /plejliste/[id]

Optimizovan je javni katalog koji koristi ova ruta. Lične plejliste, vlasništvo, privatnost, uređivanje, podešavanja sviranja i svi privatni API upiti nisu dodati u javni keš. Sama ruta ostaje `force-dynamic`; nije dodat javni CDN header za mešovitu rutu. Javno čitljiva korisnička playlista takođe zadržava dinamičan prikaz jer njene vlasničke kontrole zavise od naloga.

## Javni katalog

- Jedan kompresovani indeks obuhvata sve tri javne kategorije. Kategorije sada filtriraju isti indeks, bez dodatnog čitanja tekstova i računanja težine za svaku kategoriju.
- Indeks koristi Data Cache od 1.800 sekundi umesto prethodnih 60 sekundi. Keš sadrži samo javne kartice i male zbirne brojače; tekstovi, akordi, nalozi, korisničke plejliste i lična podešavanja nisu u njemu.
- Zasebno se kešira rezultat od najviše 50 kartica za stvarnu stranicu i javni filter. Ponovljeni zahtevi ne raspakuju ceo indeks i ne filtriraju sve kartice.
- Brojači određuju stvarnu poslednju stranicu pre pravljenja ključa keša. Različiti preveliki brojevi stranica dele isti poslednji rezultat, umesto pravljenja mnogo duplikata.
- Ključ rezultata sadrži hash verzije izvornog indeksa. Posle obnove indeksa rezultat ne može da se pomeša sa ranijom verzijom. Indeks se čita van callback-a keša stranice da bi se izbeglo zaobilaženje unutrašnjeg `unstable_cache` u Next 15.
- Svi slojevi koriste postojeću oznaku `playlist-catalog`; administrativna izmena/objava/brisanje već poništava ovu oznaku. Promene redosleda prema popularnosti bez administrativne invalidacije postaju vidljive pri redovnoj obnovi.
- Kategorije i paginacija u javnom katalogu imaju `prefetch={false}`, da se dodatni zahtevi za ove izbore ne pokreću pre klika. Putanje, linkovi povratka, izbori i paginacija ostaju isti. Linkovi za otvaranje pesama nisu menjani.

## Provere

Testovi upoređuju sve postojeće filtere, kategorije i stranice sa prethodnim izborom i redosledom, kao i nivo veštine, isticanje, administrativnu invalidaciju, deljenje hladnog proračuna, ograničavanje ključeva i odsustvo privatnih podataka. Testovi ličnih plejlista proveravaju vlasništvo, anonimni pristup, javne liste, PDF, redosled i izolaciju naloga.

Stvarni lokalni `next start` test koristi izolovanu fixture bazu: 10 ponovljenih zahteva javnog kataloga nema dodatnih čitanja kataloga ni raspakivanja indeksa. Različiti javni filteri i kategorije dele isto čitanje. Prvi zahtev posle invalidacije kroz `refreshAdminSongs()` prikazuje novu probnu karticu.

Posebno je proveren HTTP pristup sa lokalnim fixture JWT nalozima: privatna lista je 200 vlasniku, 404 anonimnom i drugom nalogu, i ponovo 404 anonimnom neposredno posle vlasnikovog zahteva. Vlasnikov odgovor ima `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`; nema preliva vlasničkog HTML-a u javni keš. Javna korisnička lista ostaje čitljiva anonimno.

Broj izvršavanja ove dinamičke rute neće nestati samo zbog Data Cache-a; očekivana glavna korist je niži Active CPU po pozivu. Posle odobrenog deploya treba porediti sledećih 12 sati sa početnih 10.000 poziva / 53 minuta Active CPU (oko 318 ms po pozivu), uz broj zahteva, raspodelu javnih ID-jeva i cache rezultate. Privatnim listama se ne sme uključiti zajednički CDN keš radi smanjivanja tog broja.
