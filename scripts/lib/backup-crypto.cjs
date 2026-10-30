/* eslint-disable @typescript-eslint/no-require-imports -- Streaming authenticated backup container. */
const fs = require('node:fs'), fsp = require('node:fs/promises'), crypto = require('node:crypto'), { Readable } = require('node:stream'), { pipeline } = require('node:stream/promises')
const MAGIC = Buffer.from('GAKB001\n'), MAX_META = 2 * 1024 * 1024
const keyId = key => crypto.createHash('sha256').update(key).digest('hex').slice(0, 24)
async function hashFile(file) { const hash = crypto.createHash('sha256'); for await (const chunk of fs.createReadStream(file)) hash.update(chunk); return hash.digest('hex') }
function validateKey(value) {
  if (!value || value.version !== 1 || typeof value.key !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value.key)) throw Error('INVALID_BACKUP_KEY')
  const key = Buffer.from(value.key, 'base64')
  if (key.length !== 32 || value.id !== keyId(key)) throw Error('INVALID_BACKUP_KEY')
  return key
}
async function encryptArchive(archive, output, manifest, key) {
  const iv = crypto.randomBytes(12), header = Buffer.from(JSON.stringify({ version: 1, algorithm: 'aes-256-gcm', keyId: keyId(key), iv: iv.toString('base64') }))
  const headerLength = Buffer.alloc(4); headerLength.writeUInt32BE(header.length)
  const metadata = Buffer.from(JSON.stringify({ ...manifest, archiveSha256: await hashFile(archive) }))
  if (metadata.length > MAX_META) throw Error('BACKUP_METADATA_TOO_LARGE')
  const metadataLength = Buffer.alloc(4); metadataLength.writeUInt32BE(metadata.length)
  const handle = await fsp.open(output, 'wx', 0o600)
  try { await handle.writeFile(Buffer.concat([MAGIC, headerLength, header])) } finally { await handle.close() }
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(header)
  async function* payload() { yield metadataLength; yield metadata; for await (const chunk of fs.createReadStream(archive)) yield chunk }
  await pipeline(Readable.from(payload()), cipher, fs.createWriteStream(output, { flags: 'a' }))
  await fsp.appendFile(output, cipher.getAuthTag())
}
async function decryptArchive(input, payloadFile, archiveFile, key) {
  const handle = await fsp.open(input, 'r'), size = (await handle.stat()).size
  let start, header, tag
  try {
    const prefix = Buffer.alloc(MAGIC.length + 4); await handle.read(prefix, 0, prefix.length, 0)
    if (!prefix.subarray(0, MAGIC.length).equals(MAGIC)) throw Error('INVALID_BACKUP_FORMAT')
    const length = prefix.readUInt32BE(MAGIC.length)
    if (length < 1 || length > 4096 || size <= prefix.length + length + 20) throw Error('INVALID_BACKUP_FORMAT')
    header = Buffer.alloc(length); await handle.read(header, 0, length, prefix.length)
    tag = Buffer.alloc(16); await handle.read(tag, 0, 16, size - 16); start = prefix.length + length
  } finally { await handle.close() }
  const info = JSON.parse(header.toString('utf8'))
  if (info.version !== 1 || info.algorithm !== 'aes-256-gcm' || info.keyId !== keyId(key) || !/^[A-Za-z0-9+/]{16}$/.test(info.iv || '')) throw Error('WRONG_KEY_OR_FORMAT')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(info.iv, 'base64')); decipher.setAAD(header); decipher.setAuthTag(tag)
  // Authenticate the complete archive before parsing its metadata or executing any SQL.
  try { await pipeline(fs.createReadStream(input, { start, end: size - 17 }), decipher, fs.createWriteStream(payloadFile, { flags: 'wx', mode: 0o600 })) }
  catch { await fsp.rm(payloadFile, { force: true }); throw Error('BACKUP_AUTHENTICATION_FAILED') }
  const payload = await fsp.open(payloadFile, 'r')
  let manifest, length
  try {
    const prefix = Buffer.alloc(4); await payload.read(prefix, 0, 4, 0); length = prefix.readUInt32BE()
    if (length < 1 || length > MAX_META || length + 4 >= (await payload.stat()).size) throw Error('INVALID_BACKUP_METADATA')
    const json = Buffer.alloc(length); await payload.read(json, 0, length, 4); manifest = JSON.parse(json.toString('utf8'))
    if (manifest.version !== 1 || manifest.scope !== 'public' || !Array.isArray(manifest.tables) || !/^[a-f0-9]{64}$/.test(manifest.archiveSha256 || '')) throw Error('INVALID_BACKUP_METADATA')
  } finally { await payload.close() }
  await pipeline(fs.createReadStream(payloadFile, { start: 4 + length }), fs.createWriteStream(archiveFile, { flags: 'wx', mode: 0o600 }))
  if (await hashFile(archiveFile) !== manifest.archiveSha256) throw Error('BACKUP_CHECKSUM_FAILED')
  return manifest
}
module.exports = { keyId, validateKey, hashFile, encryptArchive, decryptArchive }
