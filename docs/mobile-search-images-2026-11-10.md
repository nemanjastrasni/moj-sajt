# Kompaktna pretraga i manje fotografije izvođača

Na ekranima do 767 px pretraga počinje kao polje sa lupom širine 44 px. To je pravi fokusabilan input: dodir odmah fokusira unos, bez čekanja da se preuzme novi modul. Na fokus zauzima celu raspoloživu širinu gornjeg reda, a logo se privremeno sklanja. Zatvaranje, Escape, izbor rezultata ili fokus/dodir van pretrage vraća kompaktan prikaz. Uneti tekst ostaje sačuvan dok je komponenta montirana. Gornji red ima 48 px umesto prethodnih 56 px. Desktop zadržava stalno polje širine do 640 px.

Zatvorena pretraga ne zakazuje nove upite; postojeći debounce i AbortController sada se zaustavljaju i pri zatvaranju. U modalu izbor pesama i dalje koristi svoj postojeći unutrašnji popup. Veličina teksta inputa ostaje 16 px, a dugmad najmanje 44 px.

Pripremljene su statične WebP verzije postojećih lokalnih fotografija na širinama 80, 160, 320 i 640 px, kada je izvor veći od tražene širine. Nema uvećavanja, kadriranja ni mrežnog preuzimanja. Imena novih datoteka imaju sadržajni hash i dobijaju `Cache-Control: public, max-age=31536000, immutable`. Originalne datoteke i njihovi podaci o autoru/licenci ostaju nepromenjeni.

Server bira `srcset` i `sizes` za svaku fotografiju. Za sličice od 40 px nudi samo male verzije; za portrete i mozaik veće verzije. Kompletan manifest varijanti ne šalje se u klijentski JavaScript. Neuspešno učitavanje varijante pokušava original, a zatim inicijale. Ručno zadati spoljni URL bez lokalnih varijanti nastavlja da koristi svoj originalni izvor. Nisu potrebni nova usluga za slike, migracije baze ili dodatni paketi.

U manifestu je 471 izvođač sa 449 različitih fotografija. Ukupna veličina originalnih datoteka je 34.749.236 B, a verzija od 80 px 683.904 B: približno 98% manje za te sličice. Verzije od 160 px zajedno imaju 1.870.014 B, približno 94,6% manje. Ovi zbirovi služe za poređenje iste kolekcije; posetilac ne preuzima celu kolekciju pri otvaranju stranice. Napravljene su 1.644 dodatne statične datoteke. To ne predstavlja 98% ubrzanja cele stranice.

Pronalaženje pregledanih fotografija koristi mapu po ID-u izvođača. Mozaik izračunava izvor slike jednom po izvođaču umesto ponovnog pretraživanja manifesta unutar sortiranja. Pravila izbora i identifikacije izvođača su očuvana.

## Provera

- TypeScript i produkcioni Next build prolaze u odvojenoj kopiji sa javnim testnim podacima, bez produkcionih kredencijala.
- Testovi provere svih varijanti potvrđuju stvarnu širinu, visinu, WebP format, sadržajni hash, očuvanu razmeru i nepromenjene originale.
- Prolaze testovi pretrage, mobilnog zaglavlja, slika, banera slova, javnog keša i prevoda.
- Chromium prikazi od 320, 390 i 1366 px: skupljanje/širenje, fokus, brisanje, Escape, dugme za zatvaranje, izbor rezultata strelicom i Enterom, navigacija i dodir van polja. Nema horizontalnog prelivanja dokumenta. Za mobilne avatare `currentSrc` potvrđuje datoteku od 80 px; desktop input ostaje 640 px.
- Pravi Android sa softverskom tastaturom i Safari na iPhoneu još nisu provereni. QA pretraga koristi lokalne testne rezultate; produkcioni API nije menjan.

Za nove pripremljene fotografije pokrenuti `npm run artists:thumbnails`, zatim `npm run test:artist-responsive`. Dok se varijante ne naprave, nove fotografije rade preko originalnog izvora.

Sledeći deo koji treba meriti nakon objave jeste trajanje serverskog odgovora za hladno i zagrejano otvaranje izvođača. Javni imenik i spisak pesama već koriste keš, ali sam podatak izvođača i provera prava i dalje uključuju sveže čitanje. Lokalni build i merenje slika nisu dokaz da je produkciona navigacija ispod 500 ms.
