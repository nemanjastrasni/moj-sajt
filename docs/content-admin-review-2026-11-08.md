# Dopune sadržaja i jasniji admin pregled — 8. novembar 2026.

## Šta je urađeno

U bazu je dodato **6 biografija** i **6 diskografija sa 61 izdanjem**, isključivo u prazna polja. Nije menjan postojeći tekst biografije, popunjena diskografija, identitet izvođača, slika u bazi ili sadržaj pesama. Postojećih osam pogrešno povezanih biografija ostaje u redu za odobrenje vlasnika.

| Izvođač | Biografija | Nova izdanja u diskografiji |
| --- | --- | ---: |
| Van der Graaf Generator | dodata | 22: 13 studijskih i 9 koncertnih |
| Free | postojeća sačuvana | 8: 6 studijskih i 2 koncertna |
| Radiohead | postojeća sačuvana | 10: 9 studijskih i 1 koncertni |
| Negative | dodata | ostavljena prazna, potrebno razrešiti godinu albuma |
| Denis I Denis | dodata | 9: 4 studijska i 5 kompilacija |
| Inspektor Blaža i Kljunovi | dodata | 6: 3 studijska i 3 koncertna |
| Djubrivo | dodata | ostavljena prazna, proveriti vrstu ranog izdanja |
| Nola | dodata | 6 izdanja u grupi „Ostali albumi“, bez nagađanja preciznije vrste |

Identiteti su proveravani prema muzičkom subjektu, Wikipedia/Wikidata vezi i naslovima pesama u lokalnom katalogu. Regionalne biografije imaju prednost; Van der Graaf Generator ima potvrđen tekst na engleskom, bez automatskog prevođenja. Sve nove vrednosti imaju izvor vezan za tačnu Wikipedia reviziju, istoriju i CC BY-SA uslove. Kontrolni zbir izvora odgovara upisanoj vrednosti. Ove liste nisu predstavljene kao iscrpne diskografije; izabrane kompilacijske liste Van der Graaf Generator, Free i Radiohead ostaju za kasniji pregled.

Diskografija grupe Negative nije dodata jer regionalni članak navodi 2003, a engleski izvori 2002. za „Ni ovde ni tamo“. Đubrivo zahteva dodatnu proveru klasifikacije ranog izdanja. Miroslav Rus, Stampedo i Angels Breath nisu dopunjeni samo na osnovu sličnog naziva: pronađeni kandidati imaju oskudne podatke ili predstavljaju drugu temu/album.

Fotografije **Adam Lambert** i **Alice Cooper** dodate su u lokalni katalog, sa autorom, izvorom, licencom i kontrolnim zbirom. Postojeći zapisi su sačuvani. Alphaville je preskočen jer zapis ne navodi pouzdanog autora; bot koji je preneo datoteku nije automatski tretiran kao autor fotografije. Novi lokalni katalog ima 461 zapis; ukupno je povezano 516 od 1.231 profila. Fotografije postaju dostupne posle deploy-a, preko postojećeg lokalnog fallback-a, bez upisa u Artist.image.

## Stanje posle dopune

- 1.231 izvođač; 1.108 popunjenih bio polja; 524 popunjene diskografije.
- 516 povezanih fotografija; to nije tvrdnja da su svi udaljeni URL-ovi ponovo provereni.
- 9.393 pesme. Broj upisanih biografija nije potvrda ispravnosti svih tekstova.

## Konkretni problemi koji čekaju odluku

| Profil | Putanja | Uočeno |
| --- | --- | --- |
| Kenny Rodgers | `/biografija/strane/kenny-rodgers` | tekst o fudbaleru Luisu Suarezu |
| A.C.A.B | `/biografija/strane/a-c-a-b` | tekst o neoklasicizmu |
| Area | `/biografija/domace/area` | tekst o diksilendu |
| Ok Band | `/biografija/narodne/ok-band` | tekst o renesansnoj muzici |
| Crni | `/biografija/narodne/crni` | opšti pregled jugoslovenske pop/rok scene |
| Balkan | `/biografija/domace/balkan` | opšti pregled balkanske muzike |
| Smak | `/biografija/domace/smak` | tekst o prvom albumu, umesto grupi |
| Rani Mraz | `/biografija/domace/rani-mraz` | tekst o kasnijem Balaševićevom albumu, umesto grupi |

Ovaj spisak potvrđuje pogrešnu temu postojećeg teksta, ne identitet svake buduće zamene. Ništa od ovih osam bio polja nije izmenjeno.

## Akordi i tehnička provera pesama

Pregledano je svih **9.393 pesama** bez upisa. **2.470** ima bar jedno tehničko upozorenje. To nije tvrdnja da su akordi u tim pesmama muzički pogrešni; nema provere slušanjem svake pesme.

| Nalaz | Broj pesama |
| --- | ---: |
| deo muzičkog reda nije potpuno prepoznat | 1.519 |
| akord daleko desno od kraja stiha, proveriti raspored | 736 |
| nedostaje bar jedan dijagram akorda | 317 |
| moguća ponavljanja reči, često namerna | 195 |
| nema prepoznatih akorda, moguće tekst ili tablatura | 197 |
| tragovi HTML-a/entiteta | 54 |
| neprepoznata oznaka akorda unutar teksta | 7 |
| oštećen zamenski znak/NUL | 3 |

Jedna pesma može imati više vrsta nalaza. Tri potvrđena tehnička problema odnose se na „Devojko Mala“, pod profilima **Divljan Vlada**, **Idoli** i **Vlada Divljan**. Nisu automatski spajani niti menjani. Admin sadrži njihove tačne javne i uređivačke veze, kao i sedam pesama sa neprepoznatom oznakom i brojevima redova iz pregleda.

## Kako izgleda novi admin pregled

**Admin → Nadzor sajta** ima dve jasno odvojene celine:

1. Poslednji dnevni tehnički izveštaj: šta se dogodilo, na kojoj putanji, zabeleženi HTTP status ili precizan problem sa canonical/H1 oznakom, sledeći korak i AI predlog ako postoji. Nedostupan izveštaj nije predstavljen kao uspešna provera.
2. Red za pregled sadržaja: 60 konkretnih nalaza, filteri za biografije, diskografije, fotografije i akorde, po 12 po strani. Svaka stavka ima „Gde“, „Šta je primećeno“, pouzdanost, sledeći korak i stanje odobrenja, sa vezom ka stranici i editoru.

Sadržajni nalazi su zabeleženi pregled sa datumom, a ne svakodnevna automatska semantička provera svih biografija. Pri učitavanju se proverava da li je posmatrano polje menjano. Promena kontrolnog zbira označava nalaz kao istorijski za novu proveru; ne pretpostavlja se da je problem rešen. Uklonjeni zapisi nemaju stare aktivne veze, a nedostupna baza daje nepotvrđeno stanje. Potvrda admin ovlašćenja važi i za keširane podatke. Nema dugmeta koje neproveren predlog automatski izvršava.

Detalji dnevnog nadzora prenose se kao jedna validirana GitHub Actions notice anotacija. Admin čita javni GitHub API bez novog tokena, tajne, tabele ili dodatnih prava za upis. Payload sadrži ograničene javne činjenice, bez HTML tela, tekstova pesama, podataka naloga i ključeva. Vezan je za tačno pokretanje i pokušaj, a ograničen prikaz navodi koliko nalaza je izostavljeno. Starija pokretanja bez anotacije ostaju dostupna kroz puni GitHub izveštaj. Prvi direktan prikaz počinje tek posle objave koda i novog pokretanja.

## Ispravljeno čitanje diskografija

Godine unutar naslova albuma više ne postaju godine izdanja. Ista godina ponovljena u tabeli i metapodacima ne izbacuje album. Kolona godine i eksplicitni datum izdanja imaju prednost; međusobni konflikt se ne nagađa. Video izdanja se ne tretiraju kao audio albumi.

Opcija `thoroughDiscography` namenjena održavanju poredi dostupne jezičke izvore, umesto da stane posle prve tri stavke. Prednost regionalne biografije ostaje očuvana. Podrazumevani brži lookup za novi profil nije promenjen. Ranije popunjene diskografije nisu masovno ponovo upisane.

## Provere i oporavak

Prošlo je 176 regresionih testova, dodatne provere proširenog izveštaja, ESLint i izolovani Next produkcioni build sa probnim podacima i lokalno keširanim fontovima. Vizuelno je pregledano pet oblasti na širinama 320/390/820/1366 px u obe teme: 40 statički renderovanih serverskih prikaza, bez prelivanja ili JavaScript grešaka. To nije tvrdnja o ručnom testiranju produkcione admin prijave u ovoj proveri.

Pre upisa sačuvani su Artist podaci i prethodni ArtistWikiProfile zapisi. Za svih 12 planiranih promena provereno je da su polja ostala prazna do upisa. Posle upisa provereno je da su promenjena samo ta polja, da svi novi izvori imaju odgovarajući kontrolni zbir i da su ostali podaci sačuvani. Lokalni audit i backup su u `outputs/content-admin-2026-11-08/`, paket `database-additions-2026-11-08T10-56-47-453Z`.

Za eventualni oporavak vraćati samo planirana polja na istim Artist ID-ovima i njihove pripadajuće izvore, nakon provere da nova vrednost nije naknadno ručno menjana. Ne vraćati celu Artist tabelu preko novijih izmena. Lokalni puni tekstovi i rezervne kopije nisu dodati u Git.

Reference: [GitHub notice anotacije](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#setting-a-notice-message), [javno čitanje check anotacija](https://docs.github.com/en/rest/checks/runs#list-check-run-annotations). Konkretne Wikipedia revizije i licence novih sadržaja sačuvane su uz podatke i prikazuju se kroz postojeću stranicu Wikipedia izvora.
