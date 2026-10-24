const fs = require("node:fs/promises")
const { createReadStream } = require("node:fs")
const readline = require("node:readline")
const path = require("node:path")
const { X509Certificate } = require("node:crypto")

function decodeCopy(value) {
  if (value === "\\N") return null
  return value.replace(/\\([0-7]{1,3}|x[0-9a-f]{1,2}|.)/gi, (_, char) => {
    if (/^[0-7]{1,3}$/.test(char)) return String.fromCharCode(parseInt(char, 8))
    if (/^x[0-9a-f]+$/i.test(char)) return String.fromCharCode(parseInt(char.slice(1), 16))
    return ({ b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v", "\\": "\\" })[char] ?? char
  })
}

function artistRecord(record) {
  if (typeof record.name !== "string" || !record.name.trim()) throw new Error("Artist name is missing")
  return {
    id: typeof record.id === "string" ? record.id : null,
    name: record.name, slug: typeof record.slug === "string" ? record.slug : null,
    category: typeof record.category === "string" ? record.category : null,
    image: typeof record.image === "string" ? record.image : null,
    imageKnown: Object.hasOwn(record, "image"),
    songCount: Number.isInteger(record.songCount) ? record.songCount : null,
  }
}

async function readSnapshot(file) {
  const stat = await fs.stat(file)
  let artists
  if (path.extname(file).toLowerCase() === ".json") {
    const data = JSON.parse(await fs.readFile(file, "utf8"))
    const records = Array.isArray(data) ? data : data.artists
    if (!Array.isArray(records)) throw new Error("Expected an artist JSON array")
    artists = records.map(artistRecord)
  } else {
    artists = []
    let columns = null
    const input = createReadStream(file)
    const lines = readline.createInterface({ input, crlfDelay: Infinity })
    try {
      for await (const line of lines) {
        if (!columns) {
          const match = line.match(/^COPY public\."Artist" \(([^)]+)\) FROM stdin;$/)
          if (match) columns = match[1].split(",").map(column => column.trim().replace(/^"|"$/g, ""))
          continue
        }
        if (line === "\\.") break
        const cells = line.split("\t")
        if (cells.length !== columns.length) throw new Error("Invalid Artist COPY row")
        artists.push(artistRecord(Object.fromEntries(columns.map((column, index) => [column, decodeCopy(cells[index])]))))
      }
    } finally { lines.close(); input.destroy() }
    if (!columns) throw new Error("No public.Artist COPY block found; nothing was imported")
  }
  return { source: { kind: "snapshot", file: path.basename(file), modifiedAt: stat.mtime.toISOString(), warning: "Snapshot only; may differ from the current database. Existing photos must be rechecked before any update." }, artists }
}

async function databaseClient(caFile) {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("Unsafe TLS override is not supported")
  const { Client } = require("pg")
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing")
  const url = new URL(process.env.DATABASE_URL)
  // pg connection-string SSL flags otherwise override the explicit TLS object.
  const rootFile = caFile || process.env.ARTIST_IMAGES_CA || url.searchParams.get("sslrootcert")
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key)
  let ca
  if (rootFile) ca = new X509Certificate(await fs.readFile(rootFile)).toString()
  const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 12000, statement_timeout: 15000 })
  await client.connect()
  return client
}

async function readDatabase(caFile) {
  const client = await databaseClient(caFile)
  try {
    await client.query("BEGIN READ ONLY")
    const { rows } = await client.query('SELECT a.id, a.slug, a.name, a.image, a.category, (SELECT count(*)::int FROM public."Song" s WHERE s."artistId" = a.id) AS "songCount" FROM public."Artist" a ORDER BY a.name, a.id')
    await client.query("COMMIT")
    return { source: { kind: "database", readAt: new Date().toISOString() }, artists: rows.map(artistRecord) }
  } finally { await client.end() }
}

module.exports = { decodeCopy, artistRecord, readSnapshot, readDatabase, databaseClient }
