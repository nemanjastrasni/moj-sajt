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

## Postojeci nalozi

PrismaAdapter koristi postojece tabele User/Account; nije dodata promena seme.
Google identitet se pamti po providerAccountId, ne samo po prikazanom emailu.
Google mora da potvrdi email. Zabranjeni korisnici ne dobijaju novu sesiju,
a pri sledecoj proveri postojece sesije zabrana se ponovo proverava.

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
