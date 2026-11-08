# Dnevni nadzor — prva faza

Nadzor radi na GitHub serveru i ne zahteva uključen vlasnikov računar. Ova faza čita javne stranice i piše isključivo sopstvene izveštaje. Ne menja pesme, korisnike, konfiguraciju, kod niti bazu. AI daje predloge koji zahtevaju ljudsku proveru i odobrenje. Nema automatskog izvršavanja predloga ni objavljivanja izmena. Zaštitne provere ovog monitora nisu zamena za CI i proveru svih promena aplikacije.

## Uključivanje

1. Poslati pripremljene izmene na `main`. Workflow `.github/workflows/site-monitor.yml` tada pokreće početnu proveru. Na pull requestu proveravaju se samo testovi, bez obilaska sajta i bez tajnih ključeva.
2. Otvoriti [GitHub Actions](https://github.com/nemanjastrasni/moj-sajt/actions/workflows/site-monitor.yml), proveriti da je prvi posao prošao i pregledati sažetak. Ručno pokretanje je dostupno preko **Run workflow**.
3. Dnevni raspored je **04:23 UTC** (05:23 zimi / 06:23 leti po vremenu Beograda). GitHub može odložiti ili preskočiti zakazane poslove; raspored nije garancija neprekidnog nadzora. U javnim repozitorijumima raspored se automatski isključuje posle 60 dana bez aktivnosti. Admin → Nadzor označava kašnjenje duže od 36 sati kada je dostupan prethodni dnevni posao. Taj prikaz sam po sebi nije nezavisan alarm za prestanak rada GitHub Actions.
4. Pregledati podešavanja obaveštenja za neuspele GitHub Actions poslove na svom GitHub nalogu. Ovaj workflow ne šalje mejlove, poruke niti automatski otvara issue. Upozorenja su u izveštaju i mogu postojati uz zeleno pokretanje; kritični nalazi obaraju posao.

Podrazumevani sajt: `https://moj-sajt-rho.vercel.app`. Posle promene domena dodati repozitorijumsku Actions **variable** `MONITOR_SITE_URL` sa javnim HTTPS originom bez putanje i uskladiti canonical/robots/sitemap domen same aplikacije. Nadzor ne menja aplikacijski `SITE_URL`. Kod prenosa repozitorijuma uskladiti i `MONITOR_REPOSITORY` u `lib/monitoring/server.ts`.

## Obuhvat

- Dostupnost robots.txt, sitemap indeksa i svih očekivanih delova sitemapa; jedinstvene javne adrese i zabrana privatnih/stranih adresa u sitemapu.
- Sedam osnovnih stranica, do 12 pesama i dve biografije po danu, sa rotirajućim uzorkom: HTTP status, canonical, naslov, opis, H1, noindex, JSON-LD i očekivane osnovne šeme.
- Dva anonimna GET zahteva admin API-ju moraju dobiti 401 ili 403. Ne proverava se ceo sistem dozvola niti se koristi admin sesija.
- Ne proverava Google Search Console, stvarno Google indeksiranje, sve pesme, prikaz u mobilnom pregledaču, vraćanje backup-a niti stanje privatne baze.

Monitor ne učitava `.env` i ne zahteva Supabase pristup. Njegov User-Agent prepoznaje se kao automatizovan pregled u postojećem brojaču pregleda pesama. Zahtevi imaju vremensko ograničenje, najviše jedan ponovljeni pokušaj i ograničenje veličine odgovora. Nema praćenja HTTP preusmeravanja, slanja kolačića ili prijave. Budžet je do 100 logičkih čitanja (do dva fizička zahteva po čitanju pri privremenoj grešci), uz ukupno ograničenje pročitanih odgovora. Masovno pogrešan sitemap može skratiti izveštaj na 200 nalaza; tada status i dalje obuhvata i izostavljene nalaze.

## Izveštaji i admin panel

Od 8. novembra 2026. admin prikazuje i detalje novog pokretanja direktno: naslov nalaza, konkretnu putanju, zabeleženi HTTP status ili problem canonical/H1 oznake, sledeći korak i validiran AI predlog. Workflow objavljuje ograničen sažetak kroz standardnu notice anotaciju; čita se javni GitHub Checks API bez dodatnog tokena, prava upisa ili tabele. Proveravaju se format, obim, pokretanje i njegov pokušaj; ne prenose se puni HTML, tekstovi pesama, nalozi, ključevi ili proizvoljne poruke greške. Stariji poslovi bez ove anotacije jasno su označeni, a nedostupni detalji nisu predstavljeni kao rezultat bez problema.

Ista stranica ima zaseban datirani red pregleda sadržaja: filtere za biografije, diskografije, fotografije i akorde, sa tačnim javnim/editor vezama. Kontrolni zbirovi se porede sa trenutnim zapisima, pa naknadna izmena znači „potrebna nova provera“, a ne automatski „rešeno“. Ovaj red nije svakodnevna semantička provera celog kataloga. Opis sadržajnih dopuna i nalaza je u [izveštaju od 8. novembra](content-admin-review-2026-11-08.md).

Svako pokretanje ima GitHub run sa dnevnikom koraka, Markdown sažetkom i artifact-om sa `report.json` i `summary.md`. Artifact-i se čuvaju **30 dana**; za dugoročnu arhivu potrebno je zasebno rešenje. U javnom repozitorijumu izveštaje treba smatrati javnim: sadrže javne putanje i fiksne poruke nalaza, bez HTML tela, tekstova pesama, naloga, ključeva i sadržaja baze. AI dobija najviše 15 sažetih nalaza i njegov savet je takođe deo izveštaja.

Admin → **Nadzor sajta** prikazuje do deset poslednjih produkcijskih pokretanja i veze do GitHub izveštaja. Pristup se proverava za svaki admin zahtev, čak i kada je istorija keširana. Keš traje pet minuta. Čita se samo javni GitHub API, bez dodatnog tokena; privremeni limit API-ja ili mrežna greška prikazuju se kao nepotvrđeno stanje. Uspešan workflow nije potvrda da nema upozorenja; pravi nalazi su u izveštaju. Panel ne tvrdi da je AI uključen dok se njegov status ne pregleda u konkretnom izveštaju.

## Opciona AI analiza i trošak

Besplatne provere rade bez OpenAI ključa. Za AI dodati **OPENAI_API_KEY** u [Repository Secrets → Actions](https://github.com/nemanjastrasni/moj-sajt/settings/secrets/actions), nikada u kod ili čet. OpenAI API ima zaseban obračun; ChatGPT pretplata ne pokriva ove pozive.

Model je `gpt-5.6-luna`, preko Responses API-ja, bez alata, sa `store: false`, strogim JSON formatom i najviše 1.200 izlaznih tokena. Ključ se prosleđuje samo AI koraku. AI se poziva samo ako ima upozorenja ili kritičnih nalaza i samo pri prvom pokušaju zakazanog posla. Ručno pokretanje, push, pull request i ponavljanje posla ne troše AI pozive. Pre poziva proverava se istorija zakazanih poslova; ranije dnevno pokretanje troši dozvolu čak i ako nije stiglo do AI analize. Nedostupna istorija znači preskakanje AI analize, bez zaobilaženja ograničenja. Nema ponavljanja plaćenog API zahteva.

Ovo ograničenje smanjuje potrošnju na najviše jedan pokušaj dnevno kroz ovaj workflow, a nije novčani limit OpenAI naloga. Preporučeni su poseban API projekat i praćenje potrošnje. Pri ceni modela 0,20 USD / milion ulaznih i 1,20 USD / milion izlaznih tokena, tipičnih 2.000 ulaznih + 1.200 izlaznih tokena dnevno je oko **0,06 USD mesečno**; stvarna cena zavisi od tokena, broja nalaza i važećeg cenovnika. Standardni GitHub-hosted runner-i u javnom repozitorijumu nemaju obračun minuta; uslovi i kvote mogu se promeniti. Ovaj kod nije izvršio stvarni plaćeni API poziv pri lokalnom testiranju bez ključa.

Neispravan, prekinut ili neodobren oblik AI odgovora odbacuje se. AI ne može da promeni ozbiljnost determinističkog nalaza, da odobri sopstveni predlog ili da izvrši kod. Savet nije dokaz da je ispravka tačna.

## Lokalna provera i sledeća faza

Ispravka od 8. novembra 2026: javni katalog `/public-listening-playlists` sada je izričito dozvoljen u sitemap proveri. Ranije je bio pregledan kao javna početna stranica kataloga, ali nije bio u dozvoljenoj listi sitemap adresa, što je izazivalo lažni kritični nalaz `sitemap_private_or_foreign`. Dozvola važi samo za tu tačnu putanju; privatne liste, podputanje, strani domeni i query parametri ostaju odbijeni. Monitor i admin granice prolaze 20 testova. Lokalno pokretanje ispravljenog monitora nad produkcionim javnim stranicama prošlo je: 13 sitemap datoteka, 11.769 javnih adresa, 9.393 pesme, 21 pregledana stranica, bez upozorenja ili kritičnih nalaza. Ovo ne menja stare GitHub izveštaje: novi rezultat u panelu zahteva objavu ispravke i novo GitHub pokretanje.

U neuspelom GitHub pokretanju [42367118611](https://github.com/nemanjastrasni/moj-sajt/actions/runs/42367118611) AI je zasebno dobio HTTP 429. Sažetak sada navodi HTTP status i korak za proveru kredita, kvote i ograničenja zahteva. Sam status ne dokazuje koji je od tih razloga; videti [OpenAI objašnjenje grešaka](https://developers.openai.com/api/docs/guides/error-codes). Nije izvršen novi plaćeni API poziv, nije promenjen ključ, model ili finansijsko ograničenje. Uspešne osnovne provere ne zahtevaju AI analizu.

`npm run test:site-monitor` proverava monitor i AI granice bez mreže i bez API troška. `node --test scripts/test-admin-monitor.cjs` proverava admin pristup i istoriju. `npm run monitor:site` čita produkcijske javne stranice i čuva lokalne ignorisane izveštaje u `reports/site-monitor/`.

Pošto nema sadržajnih izmena, za ovu fazu nema promena baze koje treba vraćati. Sledeća faza zahteva zasebno odobrenje: centralni dnevnik sa pre/posle stanjem, strogo ograničena ovlašćenja, proverene uslove za malu ispravku, kontrolu paralelnih izmena, postupak vraćanja i vlasničko odobravanje ozbiljnijih zahvata. Postojeći privilegovani Supabase nalog ne sme se prosleđivati botu.

Izvori: [GitHub rasporedi](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [GitHub Actions Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [OpenAI model](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
