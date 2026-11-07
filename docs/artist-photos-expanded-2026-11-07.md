# Proširena dopuna fotografija — 7. novembar 2026.

Dodato je **188 fotografskih zapisa za postojeće profile**: 67 domace,
34 narodne i 87 strane. Manifest je porastao sa 271 na **459**. Dodato je
176 novih WebP fajlova, ukupno 13.428.882 bajta (oko 12,8 MiB).
Alias profili mogu deliti sliku; nijedan profil nije spajan ili preimenovan.

Javni renderer sada nalazi sliku za **514 od 1.231 profila — 41,8%**.
Još 717 nema sliku. U zbir ulaze raniji udaljeni URL-ovi koji nisu u ovom
koraku ponovo proveravani. DB i dalje ima 149 nepraznih image polja:
novih 188 veza koristi postojeći manifest fallback, bez dodatnog DB upisa.

**75% nije dostignuto.** Potrebna su najmanje 924 profila, odnosno još
410 potvrđenih veza. Broj 1.231 označava profile, ne jedinstvene osobe ili
bendove: uključuje aliase, duete, obrade i zbirke pesama. Procenat nije
uvećavan pogrešnim slikama ili promenom imenitelja.

Primeri dopuna: Parni Valjak, Željko Joksimović, Lepa Brena, Mišo Kovač,
Arsen Dedić, Kerber, Piloti, Plejboj, Skroz, Čovek bez sluha, Keba,
Bisera Veletanlić, Tozovac, Legende, Eros Ramazzotti i Leonard Cohen.

## Pregled i preostali profili

Proveren je svih **905 prethodno praznih profila**. Ponovljen je 21 neuspešan
zahtev; završni osnovni izveštaj nema request-failed stavke. Dodatno su
pregledane Commons kategorije/pretrage za 479 kandidata i slobodne slike
sa povezanih srpskih, hrvatskih, srpskohrvatskih i engleskih Wikipedia članaka
za 324 profila. Provereno je i 38 lokalnih Wikipedia fajlova. Brojevi se
preklapaju. Evidencija pregleda ima 259 različitih parova profila i
pripremljenog fajla; isti fajl se mogao pojaviti u više prolaza.

| Razlog preostalog praznog profila | Broj |
| --- | ---: |
| Nije pronađen pouzdan muzički identitet | 406 |
| U proverenim izvorima nema odgovarajuće potvrđene fotografije | 233 |
| Pregledana slika nije odgovarajući ili dovoljno jasan prikaz izvođača | 51 |
| Više mogućih muzičkih identiteta | 17 |
| Licenca ili kvalitet zahtevaju proveru | 4 |
| Autor ili dodatni uslovi zahtevaju proveru | 3 |
| Ranije označen nejasan ili pogrešan izvor | 3 |
| **Ukupno** | **717** |

[Spisak svih preostalih profila i razloga](artist-photos-remaining-2026-11-07.md)
čuva nazive, kategorije, brojeve pesama i Artist ID-jeve. Nedostatak rezultata
nije dokaz da fotografija nigde ne postoji. Nijedan od tih zapisa nije obrisan.

## Identitet i izvori

Imena i muzički tipovi ponovo su provereni za svih 188 novih veza. Za profile
sa postojećim ArtistWikiProfile ID-jem potvrđeno je i isto živo Wikidata
povezivanje. Brod Moby Dick, teniserka Kerber, zgrade, hrana, crteži,
spomenici i drugi imenjački rezultati nisu objavljeni.

Za Kebu je posebno potvrđen Dragan Kojić, Q5304861, prema postojećoj
biografiji, pesmi Imao sam i eksplicitnom Wikidata aliasu. Finski bend nije
korišćen. Kod pojedinih bendova slika predstavlja potvrđenog člana; naslov
izvornog fajla u javnim kreditima identifikuje osobu. Nije predstavljena kao
nova grupna fotografija ili AI rekonstrukcija benda.

Od novih veza, 180 koristi Commons, a **8 lokalne Wikipedia fajlove**.
Za Wikipedia slike poređeni su stvarni URL-ovi originala: isti naziv fajla
na lokalnoj Wikipediji i Commonsu može označavati različite slike.
Za Biseru Veletanlić autor Stevan Kragujević i dozvola Tanje Kragujević
potvrđeni su na konkretnoj verziji stranice fajla; revision ID i hash su
sačuvani u privatnom izveštaju. Vampiri sa nepoznatim autorom nisu preneti
samo na osnovu CC oznake.

Podržane su proverene regionalne licence
[CC BY-SA 2.5 SI](https://creativecommons.org/licenses/by-sa/2.5/si/),
[CC BY-SA 3.0 RS](https://creativecommons.org/licenses/by-sa/3.0/rs/),
[CC BY 3.0 RS](https://creativecommons.org/licenses/by/3.0/rs/) i
[CC BY-SA 3.0 NL](https://creativecommons.org/licenses/by-sa/3.0/nl/).
Čuvaju se tačne licence, autori, izvori i opis obrade. Normalizuju se
ekvivalentne Wikipedia oznake CC-BY-SA i PD. Link licence mora odgovarati
tipu, verziji i odobrenoj jurisdikciji; nepouzdan public-domain link se
izostavlja. NC/ND, nepoznati/pretpostavljeni autori i dodatni neprovereni
uslovi nisu automatski prihvaćeni. Fotografije zadržavaju pojedinačne licence.

Obični WikiClient zadržava prvobitni skup Wikimedia hostova. Poseban
safePhotoSourceUrl prihvata samo konkretne HTTPS stranice fajlova na en/sr
Wikipediji, bez API putanja, upita, fragmenata i proizvoljnih članaka.
Dodatni API hostovi su izričit izbor posebnog audit klijenta. Postojeći test
mrežnih ograničenja nije menjan i i dalje prolazi.

## Očuvanje podataka i kvalitet

**Nije bilo DB upisa**, promene šeme, pesama, akorda, biografija ili diskografija.
Sačuvano je prethodnih 271 manifest zapisa i njihovih fajlova. Svežim čitanjem
potvrđeni su nepromenjeni ID, naziv, slug, kategorija, image i broj pesama
svih 1.231 početnih Artist audit zapisa. Za svih 459 lokalnih slika provereni
su checksum-i, WebP format i dimenzije. Za svih 188 novih veza potvrđen je
getArtistImage fallback.

Portret mora imati najmanje 240 px u oba pravca na izvoru. Ostaje WebP
kvalitet 84, do 960 × 960 px, bez uvećavanja ili kropovanja. Stranice učitavaju
prikazane slike, ne celu zbirku: mozaik ostaje ograničen na 12, uz postojeći
lazy loading. Manifest koriste serverske komponente.

/foto-izvori za lokalne izvore prikazuje Wikipedia, a za ostale Wikimedia
Commons. Krediti, licence i anchor linkovi ostaju javni. Prepare prihvata
izričito --min-songs 0 za postojeće profile muzike za slušanje bez pridružene
pesme; podrazumevana vrednost i granica manifesta od 500 nisu promenjene.

## Provere i objavljivanje

690/690 Node testova i ciljani ESLint prolaze. Produkcioni build prolazi u
izolovanoj kopiji sa dodatnom foto-QA rutom i stvarnim aplikacionim modulima;
Prisma nije zamenjena test adapterom. Prošlo je 24 provere postojećih
ArtistHeader/ArtistMosaic komponenti: tri kategorije, širine 320/390/820/1366
i obe teme. Učitana su sva zaglavlja i po 12 sličica, bez horizontalnog
prelivanja ili JavaScript grešaka. Provereni su HTTP checksum-i svih 182
različita URL-a iz novih 188 veza, uključujući ranije deljene fajlove.
Stranica izvora ima svih 459 članaka, nove anchor linkove, ispravan hash
manifesta i odgovarajuće oznake za svih 8 Wikipedia i 451 Commons izvora.
Izgled izvora proveren je na sve četiri širine. QA ruta i podaci nisu dodati
u aplikacioni repo; korisnikov pregled na portu 3042 nije diran.

Paket je lokalno spreman za vlasnikov Git/push/deploy. Nije automatski
commitovan ili objavljen. Fajlovi, manifest i krediti objavljuju se zajedno;
poseban DB publisher nije potreban za postojeći javni prikaz. Povratak je
vraćanje ovog commita; nema DB izmena za vraćanje.

Privatni izveštaji su u reports/artist-images/expanded*-2026-11-07/,
konačan izbor u expanded-reviewed-2026-11-07/report.json, a workspace dokazi
u outputs/artist-photos-2026-11-07-expanded/. Neobjavljeni kandidati ostali
su u gitignored staged direktorijumima.

Uočene pogrešne biografije samo su
[prijavljene za odluku vlasnika](data-review-2026-11-07.md), bez ispravki.
