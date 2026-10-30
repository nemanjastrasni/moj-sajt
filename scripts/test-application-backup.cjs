/* eslint-disable @typescript-eslint/no-require-imports -- Node-only backup tests. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { encryptArchive, decryptArchive, validateKey, keyId } = require('./lib/backup-crypto.cjs')
const { backupLocation, sourceEnv, ROOT, cleanup } = require('./lib/application-backup.cjs')

test('encrypted backup round trip, authentication and format validation', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gak-backup-test-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const key = randomBytes(32), bytes = randomBytes(200000)
  const archive = path.join(directory, 'source.dump'), encrypted = path.join(directory, 'encrypted')
  await fs.writeFile(archive, bytes)
  const manifest = { version: 1, scope: 'public', tables: [{ name: 'Song', rows: 2 }] }
  await encryptArchive(archive, encrypted, manifest, key)
  assert.deepEqual(validateKey({ version: 1, id: keyId(key), key: key.toString('base64') }), key)
  assert.throws(() => validateKey({ version: 1, id: 'wrong', key: key.toString('base64') }))
  const decoded = await decryptArchive(encrypted, path.join(directory, 'payload'), path.join(directory, 'restored.dump'), key)
  assert.deepEqual(decoded.tables, manifest.tables)
  assert.deepEqual(await fs.readFile(path.join(directory, 'restored.dump')), bytes)
  const container = await fs.readFile(encrypted)
  assert.equal(container.includes(bytes.subarray(0, 32)), false)
  await assert.rejects(decryptArchive(encrypted, path.join(directory, 'wrong-payload'), path.join(directory, 'wrong.dump'), randomBytes(32)), /WRONG_KEY_OR_FORMAT/)
  for (const [name, position] of [['ciphertext', container.length - 30], ['tag', container.length - 1]]) {
    const changed = Buffer.from(container); changed[position] ^= 1
    const file = path.join(directory, name)
    await fs.writeFile(file, changed)
    const payload = file + '.payload', output = file + '.dump'
    await assert.rejects(decryptArchive(file, payload, output, key), /BACKUP_AUTHENTICATION_FAILED/)
    await assert.rejects(fs.stat(payload), { code: 'ENOENT' })
    await assert.rejects(fs.stat(output), { code: 'ENOENT' })
  }
  for (const [name, contents] of [['truncated', container.subarray(0, 20)], ['magic', Buffer.from('not a backup')]]) {
    const file = path.join(directory, name); await fs.writeFile(file, contents)
    await assert.rejects(decryptArchive(file, file + '.payload', file + '.dump', key), /INVALID_BACKUP_FORMAT/)
  }
  await assert.rejects(encryptArchive(archive, encrypted, manifest, key), { code: 'EEXIST' })
})

test('backup and key cannot be stored in repository or together', () => {
  const outside = path.resolve(ROOT, '../moj-sajt-backups')
  const key = path.resolve(ROOT, '../moj-sajt-backup-keys/application-backup.key')
  assert.deepEqual(backupLocation(outside, key), { root: outside, keyFile: key })
  assert.throws(() => backupLocation(ROOT, key))
  assert.throws(() => backupLocation(path.join(ROOT, 'backups'), key))
  assert.throws(() => backupLocation(path.dirname(ROOT), key))
  assert.throws(() => backupLocation(outside, path.join(ROOT, 'secret.key')))
  assert.throws(() => backupLocation(outside, path.join(outside, 'secret.key')))
})

test('source database requires verified TLS; credentials stay out of command arguments', () => {
  const env = sourceEnv('postgresql://backup:synthetic%21@db.example.invalid:6543/postgres', path.resolve('synthetic-ca.crt'))
  assert.equal(env.PGSSLMODE, 'verify-full')
  assert.equal(env.PGHOST, 'db.example.invalid')
  assert.equal(env.PGPASSWORD, 'synthetic!')
  assert.throws(() => sourceEnv('https://example.invalid', path.resolve('ca.crt')))
  assert.throws(() => sourceEnv('postgresql://u:p@example.invalid/db', 'relative.crt'))
})

test('temporary cleanup refuses an unowned target', async () => {
  await assert.rejects(cleanup(path.resolve('backups/.work'), path.resolve('backups')), /UNSAFE_TEMPORARY_CLEANUP_TARGET/)
  await assert.rejects(cleanup(path.resolve('backups/.work'), path.resolve('backups/.work/unrecognized')), /UNSAFE_TEMPORARY_CLEANUP_TARGET/)
})
