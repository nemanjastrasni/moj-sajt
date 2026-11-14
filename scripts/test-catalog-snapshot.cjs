/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test"), assert = require("node:assert/strict")
const { checkSnapshot, generateSnapshot } = require("./catalog-assessment-snapshot.cjs")
test("the checked-in public assessments match the parser and dependency revision", async () => {
  const result = await checkSnapshot()
  assert.ok(result.valid)
  assert.ok(result.songs > 0)
})
test("snapshot generation reads public sources in a read-only transaction and stores only derived music data", async () => {
  const statements = []
  const db = { async query(sql) {
    statements.push(sql)
    return { rows: sql.startsWith("SELECT") ? [{ id: "fixture", lyrics: "C G Am\nPRIVATE_TEXT_MUST_NOT_BE_SAVED", chords: null, sourceHash: "a".repeat(64) }] : [] }
  } }
  const snapshot = await generateSnapshot(db)
  assert.equal(statements[0], "BEGIN READ ONLY")
  assert.equal(statements.at(-1), "ROLLBACK")
  assert.ok(!statements.some(sql => /^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/.test(sql)))
  assert.match(statements.find(sql => sql.startsWith("SELECT")), /s\.category IN \('domace','narodne','strane'\)/)
  assert.deepEqual(snapshot.songs.fixture, ["a".repeat(64), "very_easy", ["C", "G", "Am"]])
  assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_TEXT|lyrics|email|userId/)
})
test("a failed source read is rolled back instead of publishing a partial snapshot", async () => {
  const statements = []
  const db = { async query(sql) { statements.push(sql); if (sql.startsWith("SELECT")) throw Error("unavailable"); return { rows: [] } } }
  await assert.rejects(generateSnapshot(db), /unavailable/)
  assert.equal(statements.at(-1), "ROLLBACK")
})
