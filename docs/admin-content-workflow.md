# Admin pregled nedostajućeg sadržaja i odobravanje izmena

## Gde se nalazi

Na `/admin/nadzor`, iznad izabranih nalaza, nalazi se **Kompletan spisak sadržaja koji nedostaje**. Veza postoji i na početnom admin pregledu. Brojači čitaju sve izvođače, ne samo ranije izabranih 60 nalaza. Poslednja provera 8. novembra 2026: 1.231 profil, **122 prazne biografije, 701 prazna diskografija, 708 nepovezanih fotografija**. Jedan profil može pripadati više spiskova.

Podatak o nedostajućoj biografiji odnosi se na puno `bio` polje. Diskografija nedostaje kada je null, prazna lista ili prazan tekst; u ovoj proveri potvrđeno je osam starih diskografija sa praznim tekstom. Fotografije uključuju postojeće bezbedne URL-ove i tačno povezane lokalne manifest zapise; ovim se ne proverava dostupnost svakog spoljnog URL-a. Brojači ne potvrđuju tačnost popunjenog sadržaja. Baza vraća samo indikatore prisustva i javne podatke o izvođačima, bez prenosa punih biografija ili lista albuma za ove brojače.

Spisak ima pretragu bez dijakritičkih znakova, kategorije, izbor vrste nedostajućeg sadržaja, sortiranje po nazivu ili broju pesama, i po 25 profila na strani. **Preuzmi CSV** izvozi sve rezultate trenutnih filtera, ne samo trenutnu stranu. UTF-8 BOM, navodnici i zaštita od formula omogućavaju otvaranje u Excelu. CSV sadrži naziv, kategoriju, broj pesama, nedostajuće oblasti, poznatu napomenu i veze ka profilu/editoru. Bez pristupa bazi prikazuje se poruka o nedostupnosti, umesto lažne nule.

Keš traje do pet minuta. Pristup se proverava pre svakog čitanja, uključujući keš. Ručno čuvanje izvođača i odobrene akcije osvežavaju keš.

## Priprema i odobravanje

Uz biografije i diskografije postoje akcije **Predlog i dnevnik**. Priprema:

1. Proverava trenutnog administratora u bazi i uzima snimak tačne vrednosti i identiteta.
2. Čita potvrđenu Wikipedia reviziju i proverava muzički identitet. Automatski predlog albuma ograničen je na jasno označene studijske albume i poštuje postojeće zadržane izvore.
3. Po želji dodaje AI komentar; sadržaj predloga ostaje preuzet iz potvrđenog izvora, bez slobodnog AI prepisivanja.
4. Čuva predlog i prikazuje postojeće i predloženo stanje, vezu ka reviziji i status AI provere.

Može se dodati konkretan Wikipedia URL. Dozvoljeni su isključivo HTTPS članci na sr/sh/hr/bs/en Wikipediji; odbijaju se datoteke, višeznačne odrednice, proizvoljni domeni i API URL-ovi. Ako se naziv razlikuje, administrator mora posebno potvrditi identitet; izvor i dalje mora biti muzičar ili muzička grupa. Nepotvrđeni i nečitljivi izvori ostavljaju neuspešan pokušaj u dnevniku, bez promene sadržaja.

Za primenu se traže **tačan naziv izvođača** i potvrda da su izvor, identitet i poređenje pregledani. Server ponovo proverava admin ulogu, zaključava zapis i odbija zastareli predlog. Upis sadržaja, hash atribucije i događaja izvršava se u jednoj transakciji. Priprema i GET zahtevi nikada ne objavljuju sadržaj.

Uz osam potvrđeno pogrešnih biografija dostupno je **Pripremi uklanjanje pogrešne biografije**. Posle pregleda i posebnog odobrenja uklanjaju se samo biografija, kratki opis i njen aktivni izvorni kredit. Izvođač, fotografija, članovi, diskografija i pesme ostaju sačuvani. Ne postoje masovno brisanje ni brisanje izvođača ovim putem.

Za fotografije ostaje ručni editor, a za pesme i akorde ručni pregled; nema neproverenog AI menjanja muzičkog sadržaja.

## Dnevnik, odluke i vraćanje

Uz nalaz se može **Označi kao rešeno**, **Odbaci nalaz** ili **Ponovo otvori nalaz**. Ove odluke ne menjaju sadržaj, ne smanjuju brojače nedostajućih podataka i ne predstavljaju automatsku potvrdu tačnosti. Odluka se vidi i na kartici nalaza.

Posebno se čuvaju događaji pripreme, neuspeha, primene, odbacivanja, odluke i vraćanja, sa administratorom i vremenom. Panel prikazuje poslednjih 50 događaja i poslednjih 10 predloga uz pojedinačan nalaz; podaci se ne brišu automatski. Veza **Poređenje / vraćanje** otvara trajnu stranicu predloga, čak i kada je popunjeni profil nestao sa spiska nedostajućih podataka.

**Vrati prethodno stanje** zahteva novu potvrdu naziva i odobrenje. Odbija vraćanje ako se promenio identitet, ciljano polje, kratki opis ili izvorni profil posle primene. Čuvaju se i razlikuju SQL NULL i JSON null vrednosti; vraćanje se evidentira kao nov događaj. Ne menja se zapis naknadno ručno uređen od strane drugog administratora.

## Baza i podešavanje

Dodate su privatne tabele `AdminContentProposal` i `AdminContentEvent`, sa RLS i ukinutim privilegijama za PUBLIC, anon i authenticated. Nema promena postojećih podataka izvođača ili pesama pri postavljanju šeme. U ovoj sesiji tabele su postavljene i pristup proveravan; novo postavljanje nije potrebno pre ovog deploya.

Za novu instalaciju koristi se idempotentna SQL datoteka `prisma/sql/admin-content-actions.sql`, kroz:

```powershell
npm run admin:content:setup -- --apply --ca C:\putanja\supabase-ca.crt
```

Provera bez upisa: isti poziv bez `--apply`. Provera šeme u privremenoj transakciji: `--check-schema`.

### AI komentar

`OPENAI_API_KEY` mora biti server promenljiva aplikacije na Vercelu; GitHub Secret sa istim nazivom dostupan je samo dnevnom GitHub nadzoru. Ne koristiti NEXT_PUBLIC prefiks niti unositi ključ u Git. Bez ključa rade Wikipedia predlozi i sve kontrole odobrenja, a panel jasno kaže da AI komentar nije urađen.

Opcioni `OPENAI_ADMIN_MODEL` podrazumevano je `gpt-4.1-mini`. Koristi se Responses API, `store:false`, stroga JSON šema, najviše 600 izlaznih tokena, ograničen odgovor i timeout. Model nema alate za upis i dobija samo naziv izvođača i javni kandidat/izvor, ne postojeće tekstove pesama ili podatke naloga. Najviše 20 priprema po administratoru dnevno, uz zaštitu od paralelnih priprema. Greške provajdera, uključujući 429, prikazuju se uz predlog bez izmišljene uspešne analize.

Reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Provere ove implementacije

- 116 regresionih testova za admin pristup, podloge, postojeće kontrole sadržaja, izvore i prikaz.
- 18 dodatnih PostgreSQL slučajeva u izolovanoj šemi koja je u celosti vraćena: uloge, priprema bez objave, hash atribucije, dupli zahtevi, kasnije ručne promene, transakcioni rollback, ograničeno uklanjanje i vraćanje, uključujući postojeći izvorni profil, SQL/JSON null i stari prazni tekst.
- 7 interaktivnih akcija i 4 širine prozora u browser fixture testu; 40 SSR provera oblasti/širina/tema bez prelivanja.
- TypeScript, ciljani ESLint, Prisma validacija i Next produkcioni build u odvojenoj QA kopiji sa lokalnim fixture podacima. Produkciona prijava i plaćeni OpenAI poziv nisu testirani ovom turom.
- Hash poređenje pre i posle postavljanja šeme: svih 1.231 izvođača, 9.394 pesme, izvorni profili i oznake pregleda sačuvani. Privatna potvrda je u `C:\Users\dimit\Documents\Codex\2026-10-31\da\outputs\admin-actions-2026-11-08\schema-verification.json`.

Nisu primenjene nikakve predložene zamene ili uklanjanja sadržaja. Funkcionalnost se objavljuje tek Git/deploy korakom vlasnika.
