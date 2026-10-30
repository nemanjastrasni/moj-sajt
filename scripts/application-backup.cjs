/* eslint-disable @typescript-eslint/no-require-imports -- Explicit encrypted application backup and isolated local restore drill. */
const fs = require('node:fs/promises'), path = require('node:path'), { parseArgs } = require('node:util'), { createHash } = require('node:crypto')
const backup = require('./lib/application-backup.cjs'), { databaseClient } = require('./lib/artist-image-source.cjs')
const DEFAULT_OUT = 'C:/DEV/moj-sajt-backups'
const DEFAULT_KEY = 'C:/DEV/moj-sajt-backup-keys/application-backup.key'
async function create(bin, ca, root, key, work) {
  if (!ca) throw Error('VERIFIED_CA_REQUIRED')
  const db = await databaseClient(ca), archive = path.join(work, 'application.dump')
  const createdAt = new Date().toISOString(), name = 'application-' + createdAt.replace(/[:.]/g, '-') + '.gakbackup', final = path.join(root, name), partial = final + '.partial'
  let manifest
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const snapshot = (await db.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot
    const sourceVersion = (await db.query('SHOW server_version')).rows[0].server_version
    const toolVersion = (await backup.run(path.join(bin, 'pg_dump' + (process.platform === 'win32' ? '.exe' : '')), ['--version'])).stdout
    if (Number(toolVersion.match(/\) (\d+)/)?.[1] || 0) < Number(sourceVersion.split('.')[0])) throw Error('PG_DUMP_IS_OLDER_THAN_SOURCE')
    const data = await backup.fingerprint(db)
    if (!['User', 'Song', 'Playlist', 'PlaylistSong', 'PlaylistSongSetting', 'FavoritePlaylist'].every(name => data.tables.some(table => table.name === name))) throw Error('UNEXPECTED_APPLICATION_DATABASE')
    const storageObjects = (await db.query('SELECT count(*)::int AS count FROM storage.objects')).rows[0].count
    const git = await backup.run('git', ['-C', backup.ROOT, 'rev-parse', 'HEAD'])
    const assets = await backup.run('git', ['-C', backup.ROOT, 'ls-files', '--', 'public'])
    const assetChanges = await backup.run('git', ['-C', backup.ROOT, 'status', '--porcelain', '--untracked-files=all', '--', 'public'])
    manifest = { version: 1, scope: 'public', createdAt, sourceVersion, sourceId: createHash('sha256').update(new URL(process.env.DATABASE_URL).hostname).digest('hex').slice(0, 16), ...data,
      storageObjects, storageFilesIncluded: false, credentialsAndProviderConfigIncluded: false, databaseOwnersAndGrantsIncluded: false,
      code: { commit: git.stdout.trim(), publicAssetsTracked: assets.stdout.trim().split(/\r?\n/).filter(Boolean).length, publicAssetsDirty: Boolean(assetChanges.stdout.trim()), assetsIncluded: false } }
    await backup.run(path.join(bin, 'pg_dump' + (process.platform === 'win32' ? '.exe' : '')), ['--format=custom', '--schema=public', '--no-owner', '--no-privileges', '--no-password', '--lock-wait-timeout=5000', '--snapshot=' + snapshot, '--file=' + archive], { env: backup.sourceEnv(process.env.DATABASE_URL, ca) })
  } finally { await db.query('ROLLBACK').catch(() => {}); await db.end() }
  try { await backup.encryptArchive(archive, partial, manifest, key); await fs.rename(partial, final) }
  catch (error) { await fs.rm(partial, { force: true }); throw error }
  return { file: final, manifest }
}
async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { ca: { type: 'string' }, out: { type: 'string', default: DEFAULT_OUT }, key: { type: 'string', default: DEFAULT_KEY }, 'pg-bin': { type: 'string', default: 'C:/Program Files/PostgreSQL/18/bin' }, file: { type: 'string' }, 'test-restore': { type: 'boolean', default: false } } })
  const command = positionals[0] || 'create'
  if (!['create', 'verify', 'restore-test'].includes(command) || positionals.length > 1) throw Error('USE_CREATE_VERIFY_OR_RESTORE_TEST')
  require('@next/env').loadEnvConfig(backup.ROOT)
  const { root, keyFile } = backup.backupLocation(values.out, values.key), bin = path.resolve(values['pg-bin'])
  await backup.privateDirectory(root); await backup.privateDirectory(path.dirname(keyFile))
  const key = await backup.readKey(keyFile, command === 'create'), { workRoot, work } = await backup.workDirectory(root)
  let file, manifest, drill, keepWork = false
  try {
    if (command === 'create') ({ file, manifest } = await create(bin, values.ca ? path.resolve(values.ca) : null, root, key, work))
    else { if (!values.file) throw Error('BACKUP_FILE_REQUIRED'); file = path.resolve(values.file) }
    const archive = path.join(work, 'verified.dump'), payload = path.join(work, 'verified.payload')
    manifest = await backup.decryptArchive(file, payload, archive, key)
    await backup.run(path.join(bin, 'pg_restore' + (process.platform === 'win32' ? '.exe' : '')), ['--list', archive])
    if (command === 'restore-test' || values['test-restore']) drill = await backup.restoreTest(bin, archive, manifest, work)
    const report = { version: 1, checkedAt: new Date().toISOString(), backup: path.basename(file), encryptedSha256: await backup.hashFile(file), scope: 'public', authenticated: true, archiveReadable: true,
      tables: manifest.tables.length, songs: manifest.tables.find(table => table.name === 'Song')?.rows, storageObjects: manifest.storageObjects, storageFilesIncluded: false, code: manifest.code, restoreTest: drill ?? null }
    const reportPath = path.join(root, path.basename(file) + '.report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 })
    console.log(JSON.stringify({ ...report, file, reportPath, keyFile, keyMustBeCopiedSeparately: true, offsiteCopyCreated: false }))
  } catch (error) { keepWork = Boolean(error.keepWork); throw error }
  finally { if (!keepWork) await backup.cleanup(workRoot, work) }
}
if (require.main === module) main().catch(error => { console.error(JSON.stringify({ error: error.message?.match(/^[A-Z0-9_]+$/) ? error.message : 'BACKUP_FAILED', tool: error.tool || null, productionRestoreAttempted: false })); process.exitCode = 1 })
module.exports = { create }
