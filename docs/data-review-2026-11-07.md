# Podaci za odluku vlasnika — 7. novembar 2026.

**Status posle odobrenja vlasnika:** odobrene korekcije kategorija, prikazanog
naziva Van der Graaf Generator i praznog Metallica zapisa sprovedene su uz
rezervnu kopiju. Svih 29 kanonskih linkova sada vraća 200. Pripremljena su
trajna preusmerenja, a 27 Rus duplikata još nije obrisano jer preusmerenja
prvo moraju biti objavljena. Detalji, dnevnik i povratak izmena nalaze se u
[izveštaju o korekcijama](catalog-repairs-2026-11-07.md).

Ispod je sačuvan **prvobitni read-only pregled**, uključujući tadašnje predloge
i status čekanja odobrenja. Paul Simon dopuna je zasebno dokumentovana u
[izveštaju o optimizaciji](performance-seo-followup-2026-11-07.md).

## Prazan zapis Metallice

- Song ID: `cmqnov33q0008k0049eywvauo`.
- Naslov i slug su prazni; tekst i chords imaju po 0 znakova.
- Nema omiljenih, veza sa plejlistama, izvođačkih veza, prijava, objavljenih
  predloga ili tutorijala vezanih za ovu pesmu.
- Postoji **jedan SongReview zapis**. Brisanje pesme bi uticalo i na njega;
  zato je potrebna rezervna kopija te evidencije, ne samo praznog Song reda.

Predlog za odobrenje: posle sveže provere i arhiviranja zapisa ukloniti ovu
praznu pesmu i povezanu review evidenciju. Ne pokušavati pogađanje naslova.
Ocena koristi: **8/10**; mali obim, ali predstavlja brisanje i čeka potvrdu.

## Miroslav Rus / Rus Miroslav

| Predložena uloga | Izvođač | Artist ID | Slug |
| --- | --- | --- | --- |
| Zadržati, ako vlasnik potvrdi izbor | Miroslav Rus | `cmn7xy79b033pobjwwgtbchbm` | `miroslav-rus` |
| Dupli unos kandidata za spajanje | Rus Miroslav | `cmn7y9g7704flobjwrzch3x3m` | `rus-miroslav` |

Svaki izvođač ima 27 pesama. **Svih 27 ima po jedan tačan par kod drugog
izvođača**, sa potpuno istim naslovom, tekstom i chords poljem. Poređenje je
rađeno nad originalnim vrednostima, bez uklanjanja akorda, prevođenja ili
normalizacije razlika. Nema parova sa istim naslovom i različitim sadržajem.
Za ove potvrđene parove nije potreban naziv sa v2.

Provereno je svih **sedam stranih ključeva** koji u ovoj bazi referenciraju Song:
Favorite, PlaylistSong, SongPerformer, SongReport, SongReview,
SongSubmission.publishedSongId i SongTutorial. Nijedna od ovih 54 pesama trenutno
nema povezani zapis u tim tabelama. Proverene su i Artist veze: oba izvođača
imaju samo svojih 27 pesama; nemaju SongPerformer ili ArtistWikiProfile veze.
Njihovi bio, bioShort, diskografija, slika i members podaci su prazni.

Predlog za odobrenje: zadržati 27 pesama pod Miroslav Rus i ukloniti 27
identičnih duplikata i prazan drugi Artist unos. **Pre uklanjanja prvo pripremiti
i objaviti trajna preusmerenja starih artist/song URL-ova** na odgovarajuće
kanonske URL-ove, da postojeći linkovi i eventualno indeksirane adrese ostanu
upotrebljivi. Potrebni su backup, nova provera hash-eva i referenci neposredno
pre transakcije i dnevnik ishoda. Ni SQL spajanje ni redirect pravila nisu
implementirani u ovom prolazu. Ocena koristi: **9/10**.

| Pesma | Predloženi zadržani Song ID | Identični dupli Song ID |
| --- | --- | --- |
| Dim Za Mamu Dim Za Tatu | `cmn7xy7ez033robjwshy32zyi` | `cmn7y9gc604fnobjwesdut03m` |
| Drazesna Meri | `cmn7xy7xi033tobjwpsores12` | `cmn7y9gr304fpobjwclxwnvip` |
| Dusa Iste Siziliste | `cmn7xy8i3033vobjw3v9cboyh` | `cmn7y9h6004frobjwaaf9f5sx` |
| Elena | `cmn7xy8y7033xobjwi9fzk63k` | `cmn7y9hkb04ftobjwqig8xha5` |
| Gledam Kroz Prozor | `cmn7xy9e9033zobjw33puugbz` | `cmn7y9hzw04fvobjw2hkx7gx5` |
| Gradske Cure | `cmn7xy9ve0341objw8017coqv` | `cmn7y9ifh04fxobjwq84nbfz7` |
| Ja Sam Svoje Tjerao Do Kraja | `cmn7xyasz0343objwo8xu0jwa` | `cmn7y9iun04fzobjwsetwge5r` |
| Kud Idemo Tud Pjevamo | `cmn7xyba00345objw3qsh0z0i` | `cmn7y9j9r04g1objwf92juxek` |
| Lagano Umirem | `cmn7xybqa0347objwveae1pk7` | `cmn7y9jqa04g3objwdr0z360d` |
| Majko Zemljo | `cmn7xyc7q0349objw2a6m61ar` | `cmn7y9kng04g5objw1feeo3iu` |
| Natasa | `cmn7xyczu034bobjwu53cvy1s` | `cmn7y9l2a04g7objw8nj7ikzx` |
| Nova Godina | `cmn7xydn3034dobjwi7l8qagf` | `cmn7y9lgy04g9objwbgrli57r` |
| Petak 13 | `cmn7xye2m034fobjwjyd7e1ee` | `cmn7y9m0h04gbobjw3boxnz7p` |
| Ponocne Vijesti | `cmn7xyej0034hobjw7nhglkwc` | `cmn7y9mgv04gdobjwl6dj9r4w` |
| Promijeni Nesto | `cmn7xyf2h034jobjw8uolt0cj` | `cmn7y9mx004gfobjw87vaf63q` |
| Rodjen U Zagrebu | `cmn7xyfjj034lobjweh31xnhe` | `cmn7y9nbk04ghobjw4e6schtx` |
| Rodjendan | `cmn7xyg1f034nobjwz6tz0efs` | `cmn7y9nq704gjobjwdbt2f2w5` |
| S Ove Strane Ljubavi | `cmn7xygho034pobjw1z1qn6ot` | `cmn7y9o4p04globjwswqoypc7` |
| S Pricom Da Je Jedan Bog | `cmn7xygxe034robjwr7p6ypua` | `cmn7y9ojw04gnobjw2k7bs3qs` |
| Sara | `cmn7xyhe1034tobjwqssy36f4` | `cmn7y9oz604gpobjwr6v0kxm7` |
| Slavenska Rapsodija | `cmn7xyhug034vobjw0tbm86dx` | `cmn7y9pft04grobjwuwedadfk` |
| Sonja | `cmn7xyiac034xobjw72rf72es` | `cmn7y9pvd04gtobjwddg359wa` |
| Tekila Sila | `cmn7xyis6034zobjwyzwjj5hl` | `cmn7y9qae04gvobjwxy5s5pz9` |
| Veza 202 | `cmn7xyj870351objw690ryoiy` | `cmn7y9qqn04gxobjwv4q3b0i9` |
| Vjerujem Jos Samo Bogu | `cmn7xyjop0353objwzk31xpk4` | `cmn7y9r5q04gzobjwp7mwnerw` |
| Vojnicka | `cmn7xykis0355objwsl4dqxju` | `cmn7y9rm004h1objwllgwg0ik` |
| Zivot Zivot | `cmn7xykyd0357objwl3f8aj0f` | `cmn7y9s0u04h3objw09h6u6gd` |

## Van der Graaf Generatora

Artist ID: `cmvzppxk80000ju08qbzemet4`, slug:
`van-der-graaf-generatora`, 11 pesama. U bazi nije pronađen drugi Artist
unos sa Graaf u nazivu. Postoji jedan ArtistWikiProfile zapis koji treba sačuvati.

Naziv grupe prema [Wikipedia članku](https://en.wikipedia.org/wiki/Van_der_Graaf_Generator)
je **Van der Graaf Generator**. Postojećih 11 naslova odgovara pesmama sa
albuma [The Least We Can Do Is Wave to Each Other](https://en.wikipedia.org/wiki/The_Least_We_Can_Do_Is_Wave_to_Each_Other)
i [H to He, Who Am the Only One](https://en.wikipedia.org/wiki/H_to_He,_Who_Am_the_Only_One).
To dodatno potkrepljuje identitet grupe; biografija nije automatski dopunjena
pre rešavanja naziva i ponovne provere identiteta.

Predlog za odobrenje: promeniti **samo prikazani naziv** u Van der Graaf Generator.
Sačuvati Artist ID, slug, kategoriju, svih 11 pesama i postojeću wiki evidenciju.
Time postojeće adrese ostaju važeće i nije potrebna promena URL-ova. Zatim
ponoviti proveru dostupne Wikipedia biografije/diskografije za potvrđen identitet.
Ocena koristi: **9/10**.

## Kategorije: 29 potvrđenih neispravnih linkova — visok prioritet

Read-only SQL je našao **30 pesama** čija se kategorija razlikuje od kategorije
izvođača. Jedna je već opisani prazan Metallica zapis. Za preostalih 29
proveren je baš URL koji gradi katalog: **svih 29 vraća HTTP 404**. Za šest
pesama sa već popunjenom Artist kategorijom proverena alternativna adresa
vraća HTTP 200. Provera starih snapshot-ova potvrđuje da su ove vrednosti
postojale pre današnje optimizacije; nijedna kategorija nije menjana.

### Dvadeset izvođača bez kategorije, 23 pesme

Sve ove pesme imaju Song.category = strane, dok je Artist.category NULL.
Javna ruta traži podudaranje Artist kategorije, pa standardna adresa ne može
pronaći pesmu. Ovi izvođači/URL-ovi se zbog toga ne pojavljuju u regularnom
sitemap izboru javnih izvođača.

| Izvođač bez kategorije | Artist ID | Pesama | Dodatni kandidat za proveru identiteta |
| --- | --- | ---: | --- |
| Cage the Elephant | `cmnab8qew0022obz4g23yn74g` | 1 | Nije pronađen po proveravanim imenima |
| Foster the People | `cmnab8to3002hobz4an3c2jr1` | 1 | Nije pronađen po proveravanim imenima |
| Franz Ferdinand | `cmnab8hha000wobz4r5ucrqy3` | 1 | Nije pronađen po proveravanim imenima |
| Glass Animals | `cmnab8qzi0025obz4q4jbd15e` | 1 | Nije pronađen po proveravanim imenima |
| Imagine Dragons | `cmnab8mhc001iobz4ygh6czmu` | 1 | Nije pronađen po proveravanim imenima |
| John Mayer | `cmnab8kpz001bobz4dsxjo0cj` | 1 | Nije pronađen po proveravanim imenima |
| Keane | `cmnab8ju40018obz4ui6rlf7n` | 1 | Nije pronađen po proveravanim imenima |
| Mac DeMarco | `cmnab8ptb001zobz49tuof5rh` | 1 | Nije pronađen po proveravanim imenima |
| MGMT | `cmnab8sud002eobz4slb6umt8` | 1 | Nije pronađen po proveravanim imenima |
| Muse | `cmnab8iod0012obz4pdj13edi` | 1 | Nije pronađen po proveravanim imenima |
| Nothing But Thieves | `cmnab8rm60028obz4o9znwg36` | 1 | Nije pronađen po proveravanim imenima |
| OneRepublic | `cmnab8n1v001lobz4sh0frh24` | 1 | Nije pronađen po proveravanim imenima |
| Snow Patrol | `cmnab8j8r0015obz4x16ktsp1` | 1 | Nije pronađen po proveravanim imenima |
| Tame Impala | `cmnab8p8e001wobz4a5u5ilpu` | 1 | Nije pronađen po proveravanim imenima |
| Taylor Swift | `cmnab8o2h001qobz4oeh2qr2o` | 1 | Nije pronađen po proveravanim imenima |
| The Cranberries | `cmnab8eoa000lobz4toq2bn7q` | 1 | Cranberries (cranberries) |
| The Rolling Stones | `cmnab85qe0009obz4ejyyda50` | 4 | Nije pronađen po proveravanim imenima |
| The Strokes | `cmnab8g5b000robz4lo87hp51` | 1 | Nije pronađen po proveravanim imenima |
| The White Stripes | `cmnab8fkb000oobz47osnou2o` | 1 | White Stripes (white-stripes) |
| Vampire Weekend | `cmnab8s8i002bobz487nhb72z` | 1 | Nije pronađen po proveravanim imenima |

Predlog za odobrenje: proveriti identitet i nameru javne kategorije, pa
popuniti nedostajuću Artist kategoriju strane uz očuvanje ID-jeva, slugova,
sadržaja, veza i izvora. Proveriti i manifeste koji identitet vezuju za
kategoriju. Kod **The Cranberries / Cranberries** i **The White Stripes /
White Stripes** postoje dodatni mogući alias profili: ne praviti automatski
dva javna profila bez odluke da li ih treba objediniti. Jednakost sadržaja
pesama ovih dodatnih kandidata još nije potvrđena.

### Šest različitih popunjenih kategorija

| Izvođač — pesma | Song ID | Song kategorija koja daje 404 | Artist kategorija čiji URL radi |
| --- | --- | --- | --- |
| Alegro bend — 123 | `cmmxsvzpn0001ob3g9fmr8lwb` | domace | narodne |
| Aleksandra Prijović — Za nas kasno je | `cmmxt41fv07egob3gvn9c13fd` | narodne | domace |
| Alen Islamović & Indira — Lopov | `cmmxsw39c0035ob3gmz7a7yge` | domace | narodne |
| Neil Young & Crazy Horse — Down By The River | `cmn0ouire000fjy045d3riw3n` | narodne | strane |
| Neško Kejdž — Ostalo mi srce u gradu mog detinjstva | `cmmxsyf410286ob3ggrvon0b7` | domace | narodne |
| Nick Cave & The Bad Seeds — O Children | `cmn0ovemu000ijy04qvey2wkh` | narodne | strane |

Predlog za odobrenje: odlučiti o željenoj kategoriji, pa uskladiti Song podatke
sa kanonskim Artist profilom. Postojeće radeće canonical URL-ove sačuvati.
Prazan Metallica zapis ne popravljati ovim grupnim korakom, već zasebnom
odlukom iz prvog odeljka. Ocena koristi rešavanja kategorija: **10/10**,
jer su konkretni javni linkovi trenutno neispravni. Nije izvršen nijedan upis.

## Granica odobrenja

Ove četiri grupe korekcija čekaju potvrdu vlasnika zato što je izričito tražio da se
postojeći zapisi ne menjaju bez odobrenja. Pre izvršenja ponoviti provere:
naknadno dodate omiljene, plejliste, ručne ispravke ili izvori moraju biti sačuvani.
Sirovi tekstovi pesama i podaci o korisničkim nalozima nisu deo ovog dokumenta.
Hash-evi i brojači iz pregleda ostaju u lokalnom outputs izveštaju.
