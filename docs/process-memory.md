# Privatni pregled memorije procesa

U **Administracija → Nadzor sajta → Memorija procesa**, dugme **Prikaži memoriju / Osveži merenje** traži jedan trenutni snimak. Nema automatskog učitavanja, periodičnih zahteva, čuvanja istorije ni izmena baze. API pri svakom zahtevu proverava prijavu, važeću administratorsku ulogu i zabranu korisnika iz baze. Uspešni odgovori i greške imaju `private, no-store`.

- RSS je fizička memorija jednog Node procesa; nije ukupna potrošnja Render instance niti procenat njenog limita.
- `heapUsed` je zauzeta JavaScript memorija, `heapTotal` rezervisana. Rezervisani prostor ne mora biti potpuno iskorišćen.
- Spoljna memorija obuhvata memoriju vezanu za JavaScript objekte van JS heap-a. ArrayBuffer je već uključen u spoljnu memoriju. Ove kategorije i RSS ne sabirati.
- Najviši RSS je maksimum od pokretanja procesa. Node ga vraća u KiB; API pretvara u bajtove, a prikaz u MiB (1 MiB = 1.048.576 bajtova). Ako maksimum nije dostupan, piše „Nije dostupno“.
- Oznaka procesa je slučajna, bez PID-a, putanja, ključeva i podataka korisnika. Drugi proces/restart znači drugi niz merenja. Maksimum i vreme rada se odnose samo na taj proces.

Za poređenje: zabeležiti vreme, oznaku procesa, vreme rada i RSS/JS memoriju pre i posle uobičajenog korišćenja sajta. Ponoviti posle mirovanja. Jedan rast ili visoki maksimum ne dokazuju curenje memorije; garbage collector i alokator mogu zadržati prostor. Ukupnu memoriju svih procesa i stvarni limit treba proveriti preko Render metrika. Ovaj pregled ne određuje da li je potreban skuplji paket.

Prikaz koristi stabilne Node API-je kompatibilne sa Node verzijama koje podržavaju Next.js 15.5. Nema prinudnog garbage collection-a ni profilisanja javnih zahteva. Dokumentacija: [Node memoryUsage](https://nodejs.org/api/process.html#processmemoryusage), [Node resourceUsage](https://nodejs.org/api/process.html#processresourceusage).

Provera: `node --test scripts/test-process-memory.cjs scripts/test-admin-monitor.cjs scripts/test-admin-songs.cjs`. Testovi koriste memorijske zamene autentifikacije/baze; ne povezuju se na produkciju.
