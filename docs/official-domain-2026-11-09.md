# Zvanični domen: provera i završetak prelaska

Datum: 9. novembar 2026. Zvanična adresa: https://www.gitarakordi.com.

## Potvrđeno na produkciji

- Početna vraća HTTP 200. HTTPS i domen bez www trajno vode na www; proverena putanja pesme sa očuvanim query parametrom.
- Canonical, Open Graph, robots.txt i svih 13 sitemap datoteka koriste www. Prvo očitavanje tokom prelaska još je sadržalo staru Vercel adresu; ponovljena provera i kompletan monitor potvrdili su novu. Ova promena na produkciji nije rezultat lokalnih izmena iz ovog izveštaja.
- Monitor je završio 38 zahteva: 21 stranica, 13 sitemap datoteka, 11.779 javnih URL-ova, od toga 9.394 pesme. Obuhvaćene provere su prošle. Nisu pojedinačno pregledane sve pesme niti je potvrđeno Google indeksiranje.
- Pretraga „Hotel California” na računaru i telefonu nalazi Eagles i otvara odgovarajuću pesmu. Nema JavaScript grešaka ni horizontalnog prelivanja na tim proverenim stranicama.
- Google dugme postoji, a stranica prijave ostaje noindex. OAuth zahtev ima ispravnu novu callback adresu, state i PKCE S256. Provera se zaustavila pre prijave nalogom: Google Cloud lista odobrenih callback adresa i završena prijava korisnika nisu potvrđene.
- Fotografije Cream, Cure i Black sada su dostupne na zvaničnom domenu; sve tri odgovaraju lokalnim SHA-256 vrednostima i imaju iste potpise izvora u objavljenom manifestu od 471 stavke.

## Pripremljeno za naredni deploy

Stari `moj-sajt-rho.vercel.app` i dalje vraća HTTP 200 umesto preusmeravanja. Njegov canonical već pokazuje na www, ali je trajno preusmeravanje jasnije i za korisnike i za pretraživače.

- Zvanični www domen je sada podrazumevana SEO adresa. Tačna stara Vercel adresa i domen bez www normalizuju se na www; druge eksplicitno zadate adrese ostaju podržane uz postojeću HTTPS proveru.
- Produkciona pravila preusmeravanja više ne zavise samo od eksplicitnog SITE_URL: koriste i Vercel produkcionu adresu ili zvanični podrazumevani domen. Preview i razvoj ostaju izuzeti. Pravila su ograničena na dva poznata stara hosta; www ne preusmerava sam na sebe.
- GitHub Actions i lokalna merenja podrazumevano proveravaju www. Monitor normalizuje i zaostalu MONITOR_SITE_URL vrednost koja tačno odgovara starom Vercel domenu ili domenu bez www, nakon validacije bezbednog javnog origin-a.
- Google dijagnostika prihvata zvanične domene i podrazumevano koristi www. Ne menja NextAuth, naloge, tajne ili Google Cloud podešavanja.

## Brzina i provere

Jedno sintetičko merenje hladnog browser keša na javnom sajtu: desktop LCP 1.088 ms uz 549.969 B prenosa; mobilni LCP 1.084 ms uz 373.893 B prenosa i CLS 0. Mobilni profil: 390 × 844, 1,6 Mbps, 150 ms, 4× CPU. To nisu terenski Core Web Vitals, izmeren INP ili garancija vremena učitavanja. Browser testovi blokirali su upise prisustva `/api/online`.

Prošla su 64 regresiona testa za domene, metadata, sitemap, Google dijagnostiku i nadzor, TypeScript i ciljani ESLint. Prošao je i produkcioni build u odvojenoj QA kopiji sa fixture bazom. HTTP provera te izgrađene verzije potvrdila je 308 za oba stara hosta, uz očuvanu putanju pesme i query parametar, i 200 za www bez preusmeravanja. Produkcioni deploy nije pokrenut.

Produkcijska baza nije menjana ovom proverom. Nije bilo plaćenih AI API poziva. Lokalni monitor nije samostalno objavio izveštaj u admin panel; tamo se prikazuju izveštaji GitHub Actions pokretanja.

Privatni izveštaji i snimci: `C:\Users\dimit\Documents\Codex\2026-10-31\da\outputs\official-domain-2026-11-09`.

## Posle Git-a i deploya

1. Ponovo proveriti da stara Vercel adresa sa putanjom pesme i query parametrom dobija trajno preusmeravanje na www, bez petlje.
2. U Production podešavanjima zadržati SITE_URL i NEXTAUTH_URL na `https://www.gitarakordi.com`. Ne menjati postojeće tajne. Vlasnik treba da potvrdi stvarnu Google prijavu na novom domenu; ako Google prijavi redirect_uri_mismatch, odobren callback je `https://www.gitarakordi.com/api/auth/callback/google`.
3. Radi jasnoće uskladiti GitHub Actions varijablu MONITOR_SITE_URL sa www, iako CLI već prepoznaje tačnu staru vrednost. Sledeći Actions izveštaj treba da prikazuje novi origin.
4. Ako već nije urađeno, potvrditi domen u Google Search Console i poslati `https://www.gitarakordi.com/sitemap.xml`. Pristup Search Console nalogu nije bio dostupan tokom ove provere.

Vraćanje lokalnih izmena ide kroz Git; nisu menjani DNS, Vercel podešavanja, tajne, izgled ili sadržaj baze.
