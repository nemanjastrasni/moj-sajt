# Brže učitavanje i budući domen www.gitarakordi.com

Datum: 8. novembar 2026.

## Izmene koje mogu odmah na deploy

- Popularne i najnovije pesme dobijaju po pet javnih zapisa kroz postojeći serverski keš. Njihovi nazivi i deset veza nalaze se u HTML-u, pre JavaScripta, umesto da lista čeka hidrataciju i dva browser API zahteva. Početna koristi ISR od 60 sekundi; postojeća invalidacija `public-home-songs` ostaje aktivna. Obe liste se čitaju paralelno pre serverskog rendera i ulaze u keširani HTML, bez oslanjanja na JavaScript zamenu skrivenih streaming blokova. Pri privremenom problemu baze ostaje postojeći klijentski pokušaj i ručno ponavljanje, bez obaranja cele početne.
- Izbor muzičkih lista i YouTube dock izdvojeni su u odložene module. Kod, stanje plejera, zaštita od kasnih SDK događaja, zatvaranje i upravljanje pesmama ostaju isti; moduli se učitavaju kada je potreban odgovarajući interfejs.
- Dve dekorativne pozadine dobile su kvalitet 60 i dodatnu širinu 480 px, uz iste fotografije, odnos stranica i položaj. Hero, logo i fotografije izvođača nisu menjani. Izmenjene su samo dve stavke u slikovnom manifestu; stari fajlovi ostaju za keš i vraćanje. Reprodukcija: `node scripts/optimize-site-images.cjs --only popularBackground --only latestBackground`.
- Poznata vlastita domena dobija jedinstvenu `https://www.gitarakordi.com` osnovu i kada se u SITE_URL unese verzija bez www. Canonical, Open Graph, JSON-LD, robots i sitemap koriste postojeći zajednički URL sistem.
- Probni Vercel preview deploymenti dobijaju globalni `X-Robots-Tag: noindex, nofollow` i robots zabranu celog sajta. Ovo ne utiče na trenutnu produkciju.

Sadašnja produkciona adresa i canonical ostaju aktivni dok nije eksplicitno postavljen novi `SITE_URL`. Dostupnost nove domene nije potvrđena: javni web zahtev nije uspeo, a lokalni DNS resolver je odbio upit. To nije dokaz da je domen slobodan ili da nije kupljen. DNS, Vercel nalog, Google nalog i baza nisu menjani ovom turom.

## Aktivacija domene kada je kupljena i povezana

1. U Vercel projektu dodati `gitarakordi.com` i `www.gitarakordi.com`. Podesiti DNS tačno prema vrednostima koje Vercel prikaže za taj projekat, bez prepisivanja nasumičnih IP/CNAME vrednosti. Sačekati validan HTTPS sertifikat i proveriti da nova adresa prikazuje ovaj sajt.
2. U Google OAuth podešavanjima unapred dodati novi callback `https://www.gitarakordi.com/api/auth/callback/google` i odgovarajući origin. Stari callback može ostati tokom prelaska.
3. U Vercel **Production** promenljivama postaviti `SITE_URL=https://www.gitarakordi.com` i `NEXTAUTH_URL=https://www.gitarakordi.com`, pa izvršiti redeploy. Ne menjati NEXTAUTH_SECRET i podatke baze. Nalozi ostaju u istoj bazi; prilikom prelaska na novi domen može biti potrebna ponovna prijava.
4. Uskladiti Vercel Domains preusmeravanje: glavna verzija je www, a domen bez www vodi na nju. Kod nakon eksplicitne aktivacije istog SITE_URL u produkciji dodaje trajna preusmerenja sa domena bez www i tačnog starog `moj-sajt-rho.vercel.app` hosta, uz očuvanje putanje i query parametara. Preview i localhost nemaju ta pravila. Ne podešavati suprotan smer www → bez www.
5. U GitHub Actions **Variables** postaviti `MONITOR_SITE_URL=https://www.gitarakordi.com`. Aplikacijski SITE_URL i Actions varijabla su odvojeni. Monitor se ne preusmerava na buduću domenu unapred.
6. Proveriti početnu, jednu pesmu, jednu biografiju, prijavu, `/robots.txt` i `/sitemap.xml`. Canonical, Open Graph i sitemap moraju pokazivati www. Proveriti da privatni/admin URL-ovi ostaju noindex. Dodati/proveriti novu domensku property u Search Console i poslati sitemap, a zabeležene stare URL-ove zadržati trajno preusmerene.

## Merenje i granice rezultata

Pre izmena trenutna javna početna dala je u jednom sintetičkom probnom merenju: desktop LCP 1196 ms i 604869 B prenosa; mobile LCP 980 ms i 414495 B prenosa. Mobilni profil: 390 px, hladan browser keš, 1,6 Mbps / 150 ms / 4× CPU. To nisu terenski Core Web Vitals, Lighthouse rezultat, niti izmeren INP.

Pre/posle lokalna QA poređenja koriste istu odvojenu produkcionu kopiju sa fixture bazom, isti browser i identične mrežne/CPU uslove. Ne porediti localhost vreme direktno sa javnim Vercel vremenom niti tvrditi procentualno ubrzanje produkcije pre deploya i ponovnog merenja.

| Profil | Prenos pre | Prenos posle | Manje podataka |
| --- | ---: | ---: | ---: |
| Desktop | 560110 B | 503237 B | 10,2% |
| Mobile | 370375 B | 327740 B | 11,5% |

Ovo je smanjenje prenosa, ne potvrda istog procenta kraćeg čekanja. LCP u lokalnom mobile testu bio je 740 ms pre i 760 ms posle, pa iz tih pojedinačnih merenja ne zaključujemo poboljšanje LCP-a. CLS je ostao nula na mobile profilu. JavaScript greške nisu zabeležene. Vizuelno su upoređene pune mobilne stranice; raspored i fotografije ostaju isti, uz ranije dostupne liste i lakše pozadine.

Prošlo je 72 regresionih testova za domenu, canonical, sitemap, SEO katalog, preusmerenja, mobilni header i muzičke podatke; TypeScript, ciljani ESLint i izolovani Next produkcioni build. Pravi browser sa isključenim JavaScriptom potvrdio je po pet vidljivih veza u obe liste, a provera hidratacije izostanak duplih `/api/popular` i `/api/latest` zahteva. Funkcijsko telo izdvojenog YouTube plejera identično je prethodnom.

Privatni izlazi: `C:\Users\dimit\Documents\Codex\2026-10-31\da\outputs\seo-domain-2026-11-08`. Produkciona baza i sadržaj pesama/izvođača nisu menjani.

Reference: [Next.js server data i streaming](https://nextjs.org/docs/app/getting-started/fetching-data), [Vercel domeni i preusmeravanje](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting).
