# Prijava i registracija

## Google na Vercelu

Postaviti za odgovarajuca Production/Preview okruzenja:

- `GOOGLE_CLIENT_ID`: OAuth client ID za Web application iz Google Cloud konzole.
- `GOOGLE_CLIENT_SECRET`: secret istog klijenta. Podrzan je i stari naziv `GOOGLE_SECRET`.
- `NEXTAUTH_SECRET`: dugacak, stabilan nasumicni secret, isti kroz redeploy-e.
- `NEXTAUTH_URL`: puna javna adresa okruzenja, bez `/login` ili `/api/auth`.

Ne dodavati `NEXT_PUBLIC_` na ove promenljive. Ne cuvati vrednosti u Gitu.
Posle promene promenljivih napraviti redeploy. Google dugme se prikazuje samo
ako postoje client ID i secret na serveru.

U Google Cloud OAuth klijentu dodati tacnu adresu povratka:

`https://VAS-DOMEN/api/auth/callback/google`

Lokalno: `http://localhost:3000/api/auth/callback/google`.
Za Preview deployment potreban je i njegov tacan callback; wildcard ne koristiti.
Proveriti OAuth consent screen i test korisnike ako je aplikacija u Testing rezimu.

Dokumentacija: https://next-auth.js.org/providers/google

## Provera redirect_uri_mismatch, 2026-10-25

Javna provera produkcije i pocetka OAuth zahteva potvrdila je da sajt stvarno salje:

```text
https://moj-sajt-rho.vercel.app/api/auth/callback/google
```

U Google Cloud konzoli, Google Auth Platform > Clients (ili APIs & Services > Credentials), otvoriti **isti Web application OAuth klijent ciji Client ID je na Vercelu**. U **Authorized redirect URIs** dodati tacno gornji URL i sacuvati. Nije dovoljno upisati ga u Authorized JavaScript origins; tamo ide samo `https://moj-sajt-rho.vercel.app`, ako se to polje koristi. Ne menjati ni slati Client Secret radi ove provere.

Za Production Vercel okruzenje kanonski `NEXTAUTH_URL`, ako je eksplicitno postavljen, treba da bude `https://moj-sajt-rho.vercel.app`. Posle izmene Vercel promenljivih potreban je redeploy. Lokalni `.env.local` koristi localhost; to nije dokaz da je isti URL postavljen u produkciji. Nemojte slepo kopirati lokalni NEXTAUTH_URL na Vercel.

`https://moj-sajt-git-main-nemanjastrasnis-projects.vercel.app` trenutno preusmerava na Vercel SSO zastitu pri anonimnoj proveri. To je odvojeno od Google redirect greske. Za korisnike koristiti javni produkcioni domen; ne iskljucivati zastitu svih preview deploy-eva da bi prijava proradila. Ako i drugi javni domen treba da ima zasebnu OAuth prijavu, njegov tacan callback mora biti dozvoljen u Google Cloud-u i uskladjen sa NextAuth/cookie domenom. Ne preusmeravati samo OAuth callback na drugi host: PKCE/state cookies pripadaju hostu gde je tok zapocet.

```powershell
npm run auth:check-google
npm run auth:check-google -- --start-oauth
```

Prvi poziva samo javni providers endpoint. Drugi zapocinje anonimni OAuth tok sa CSRF cookie-jem i staje pre Google prijave: ne prijavljuje korisnika, ne menja naloge, ne cita `.env`/bazu i ne ispisuje kljuceve, client ID, state, CSRF ili PKCE vrednosti. Proverava i da zahtev nosi PKCE S256, state i osnovne openid/email/profile dozvole. Provera ne moze da procita privatnu Google Cloud allowlist-u niti dokaze da je zavrsena prijava uspela. `redirect_uri_mismatch` se ne moze otkloniti izmenom dozvoljenog callback-a u Google Cloud-u kroz sam Git deploy ovog sajta.

Pri ovoj proveri autorizacioni zahtev nije prisiljavao ponovnu saglasnost (`prompt=consent` nije postavljen). Google i dalje moze traziti prvi pristanak, izbor naloga ili bezbednosnu proveru.

## Postojeci nalozi

PrismaAdapter koristi postojece tabele User/Account; nije dodata promena seme.
Google identitet se pamti po providerAccountId, ne samo po prikazanom emailu.
Google mora da potvrdi email. Zabranjeni korisnici ne dobijaju novu sesiju,
a pri sledecoj proveri postojece sesije zabrana se ponovo proverava.
Potvrdjen Google profil ne dobija dodatni email za potvrdu sa ovog sajta. Pri prijavi i upisu emailVerified provera zahteva `email_verified === true` i `sub` koji se poklapa sa providerAccountId; nickname, dostavljen email ili string "true" nisu dovoljan dokaz identiteta. Google-ovu sopstvenu sigurnosnu proveru ne zaobilazimo.

Nalog napravljen emailom i lozinkom ne spajamo automatski sa Google nalogom.
Prvo se prijaviti lozinkom, pa na Profilu pritisnuti "Povezi Google nalog".
NextAuth tada povezuje nalog kroz vec potvrdjenu sesiju. Stari passwordless
Google korisnici bez Account zapisa povezuju se pri uspesnoj Google prijavi
samo za Gmail/Google Workspace adrese. Nije ukljucen allowDangerousEmailAccountLinking.

## Jos nije ukljuceno

- Registracija lozinkom jos NE salje email i NE dokazuje vlasnistvo email adrese.
  Ne ukljucivati obaveznu potvrdu bez konfigurisanog slanja i procesa za stare naloge.
- Potvrda emaila i reset lozinke zahtevaju servis za slanje poruka i jednokratne,
  vremenski ogranicene tokene. Tabela VerificationToken vec postoji.
- Pre javnog rasta dodati deljeno ogranicavanje zahteva za prijavu/registraciju
  (ne lokalni Map, koji ne vazi kroz sve Vercel instance), uz metrike bez lozinki.
- Facebook nije dodat: prvo dovrsiti Google i email potvrdu; zatim odvojeno
  podesiti Meta aplikaciju, potrebne dozvole i provereno povezivanje identiteta.

## Bezbednosna napomena

U ranijem kodu `/api/debug/users` bio je javno dostupan i vracao korisnicke zapise,
ukljucujuci hash lozinke. Registracija je takodje vracala ceo zapis, a prijava
ga je ispisivala u server logove. Ruta sada vraca 404; odgovori, profilni props
i novi auth logovi ne sadrze lozinke/hash-eve. Ako je stari kod bio javno objavljen,
proveriti moguce izlaganje kroz Vercel logove i preporuciti promenu lozinki.
Ovaj popravak ne uklanja ranije logove ili kopije podataka.

## Provera

`npm run test:auth` koristi mock bazu i ne kreira stvarne naloge.

Rucno proveriti na odgovarajucem deploy-u:

1. Registracija, duplikat, pogresna lozinka, Enter i mobilni prikaz.
2. Prekid mreze: forma prikazuje gresku i ponovo dozvoljava slanje.
3. Google prijava novim nalogom, ponovno prijavljivanje i otkazivanje prijave.
4. Postojeci password nalog: prijava lozinkom, pa povezivanje Google na Profilu.
5. Odjava i zabrana korisnika; `/api/debug/users` vraca 404.
6. Otvoriti pesmu kao gost, prijaviti se i proveriti povratak na istu pesmu.

Prava OAuth prijava zahteva stvarno podesen Google klijent i dostupnu bazu;
mock testovi to ne dokazuju.
