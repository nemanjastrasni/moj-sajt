# Application Backup and Release Checks

## Verified on October 31, 2026 (Europe/Belgrade)

- Public production origin: `https://moj-sajt-rho.vercel.app`.
- The owner manually confirmed Google login after linking his existing password
  account on Profile. Playlist transpose/capo persistence and PDF download also
  passed the owner's manual test. This is not an automated multi-user auth audit.
- Four cold-browser measurements (desktop/mobile home/song) returned HTTP 200,
  no JavaScript exceptions, no failed requests, one H1, the correct canonical,
  and no horizontal overflow. The earlier mobile home run measured 139 KB of
  images and LCP 964 ms. These are individual lab runs, not field Core Web Vitals.
- The favorites migration read-only audit found no pending users or songs and
  no changes to the preserved legacy archive.

## Local Backup

The first encrypted snapshot was created October 30 at 22:58 UTC (23:58 local).
It contains **23 public application tables and 9,394 songs**. Authenticated
decryption, the archive checksum and `pg_restore --list` passed. Production data
was only read, never restored or modified.

**An actual database restore has NOT passed.** Local PostgreSQL has no
`share/postgres.bki`, and `initdb` also reported a restricted-token startup error.
Do not describe this as a tested disaster recovery procedure yet. Install a
complete local PostgreSQL distribution and run the isolated restore drill from
the owner's normal terminal. The script does not accept a production restore URL.

Local paths (neither contains files tracked in Git):

- Archive directory: `C:\DEV\moj-sajt-backups`
- Separate key: `C:\DEV\moj-sajt-backup-keys\application-backup.key`
- Archive: `application-2026-10-30T22-58-11-347Z.gakbackup`
- A `.report.json` sidecar records verification, counts and restore status,
  without user records, passwords, database URLs or key material.

The archive is an authenticated AES-256-GCM container around a PostgreSQL custom
dump and a manifest. It is fully authenticated before metadata is parsed or SQL
is restored. Windows directory access includes the repository's owner, the
executing identity, Administrators and SYSTEM. The key is a sensitive plaintext
file in a separate private directory; **never email, publish or commit it**.

```powershell
npm run backup:app -- create --ca "C:\Users\dimit\OneDrive\Desktop\Chords\slike\prod-ca-2021.crt"
npm run backup:app -- verify --file "C:\DEV\moj-sajt-backups\application-2026-10-30T22-58-11-347Z.gakbackup"
npm run backup:app -- restore-test --file "C:\DEV\moj-sajt-backups\application-2026-10-30T22-58-11-347Z.gakbackup"
```

`create --test-restore` can combine snapshotting and the drill. The drill uses a
fresh temporary localhost-only cluster, a random password and free port. It
compares table row counts and row hashes, RLS flags and counts of policies,
constraints and triggers. It stops only its own cluster. A failure never
authorizes an attempt to restore over the live database.

## Coverage and Remaining Work

- The snapshot covers the **public application schema**, including NextAuth
  users/accounts/sessions. Treat it as personal data even though encrypted.
- It does not include Supabase-managed schemas, roles, owners, grants, project
  settings, Vercel environment variables, Google credentials or service secrets.
  Reapply and audit server-only access/RLS before any restored environment is
  exposed. This archive is not a complete Supabase project clone.
- Supabase Storage had zero objects at snapshot time. Database dumps do not
  contain storage file bytes. Code and 3,864 tracked public assets are recovered
  from Git separately; check uncommitted files before relying on that copy.
- No off-device copy, retention policy or recurring backup job is configured.
  **A backup on the same computer is not disaster protection.** Keep an encrypted
  archive off-device and a separate recoverable copy of the key. Losing the key
  makes the archive unusable. Do not place archive and key in the same shared or
  public location.
- A complete local restore, safe recovery of roles/privileges and off-device
  recovery remain required before calling the backup process complete.
