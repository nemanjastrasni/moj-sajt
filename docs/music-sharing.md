# Deljenje kompletne muzičke liste

Na stranici konkretne liste u **Moja muzika** nalazi se dugme **Podeli listu**, za javne i za privatne liste kojima prijavljeni korisnik već ima pristup.

- **Kopiraj celu listu** kopira naziv liste, svaki naziv stavke i svaki link, redosledom prikazanim na ekranu. Takav tekst se može poslati kao poruka ili nalepiti u postojeći GitaraAkordi MP3 program.
- **Podeli preko telefona / uređaja** koristi ugrađeni sistemski izbor deljenja ako ga pregledač podržava. Prosleđuje celu listu, a ne samo adresu stranice. Otkazivanje ne kopira sadržaj. Ako deljenje nije moguće, koristi se kopiranje sa ručnim izborom kao rezervnom mogućnošću.
- **Sačuvaj za MP3 program** preuzima JSON sa nazivom liste i poljima `title` i `url` za svaku stavku. Format `gitarakordi-mp3-v1` već podržava ranije napravljeni Windows program kroz **Uvezi fajl**.
- **Kopiraj link liste** ostaje dostupan za javne liste.

Privatna lista ne postaje javna. Deljenje sadržaja je izričita radnja korisnika koji već može da pročita tu listu. Export ne sadrži korisnički ID, internu oznaku liste ili stavki, verziju za izmene, lozinku niti kolačiće. Postojeća serverska provera privatnosti i prikaz pri odjavi ostaju aktivni. Nova funkcija radi nad već učitanim prikazom, bez dodatnih API poziva ili upisa u bazu.

Kopirani tekst koristi komentare `# naziv liste` i `# broj. naziv pesme`; svaka URL adresa je u svom redu. MP3 program ignoriše komentare i učitava sve linkove istim redosledom. JSON uvoz dodatno prenosi naziv foldera/liste i izvorne naslove. Kopiranje ne učitava pojedinačne snimke niti proširuje YouTube plejliste; MP3 program ih proširuje kada preuzima muziku.

Interfejs je preveden i na engleski. Dijalog ima fokus, izlazak na Escape i vraćanje fokusa na dugme. Kada clipboard nije dostupan, sadržaj ostaje vidljiv i može se označiti za ručno kopiranje.

## Provera

`npm run test:music-share` proverava format, redosled, izdvajanje samo dozvoljenih polja, nazive fajlova, otkazivanje i rezervno kopiranje, kao i postojeće provere pristupa muzičkim listama.

Browser provera koristi stvarnu komponentu `MusicPlaylist`, sintetičke javne/privatne sesije i kontrolisane Web Share/Clipboard odgovore: cele liste, JSON fajl, otkazivanje, odbijanje pristupa clipboard-u, javni link, odbijen privatni prikaz, Escape i širine 320/390/768/1440 px. Proverena je kompatibilnost tekstualnog i JSON izvoza sa izvornim kodom već isporučenog MP3 programa. OS prozor za stvarno slanje drugoj osobi nije pokretan.

Podrška pregledača i pravilo korisničkog klika opisani su u [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) i [Clipboard writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).
