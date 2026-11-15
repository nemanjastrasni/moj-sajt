/* eslint-disable @typescript-eslint/no-require-imports -- Validate reviewed public metadata only; no live database access. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto')
const rules=require('../lib/seo/song-search-review-rules.json'),{songSearchReviewRevision,reviewedSongIds}=require('../lib/seo/song-search-review.ts')
test('reviewed source IDs are unique and canonical rules do not create chains, loops or cross-artist merges',()=>{
 const sources=new Set();for(const rule of rules){assert.ok(!sources.has(rule.source.id));sources.add(rule.source.id);assert.notEqual(rule.source.id,rule.target.id);if(rule.kind==='duplicate'){assert.equal(rule.source.artistId,rule.target.artistId);assert.equal(rule.source.fingerprint,rule.target.fingerprint);assert.ok(!rules.some(other=>other.source.id===rule.target.id))}}
 assert.equal(reviewedSongIds.length,new Set(reviewedSongIds).size)
})
test('existing fragment and Bela Ladja editorial decisions remain intact',()=>{
 assert.equal(rules.find(r=>r.source.id==='cmnab8ez5000nobz4aymhen3e').kind,'incomplete')
 const bela=rules.find(r=>r.source.id==='cmn7xacvi01g1objwhdkln28z');assert.equal(bela.target.id,'cmn7vkg2l00d2ob8gmtkujn4s');assert.equal(bela.source.fingerprint,'750aaa56cd45a2c11c5110e387c66478cf2cf63cefbac30814693f2a3ca5a601')
})
test('every reviewed snapshot has identity and full content guards, without exporting lyrics or personal data',()=>{
 for(const rule of rules)for(const snapshot of [rule.source,rule.target]){assert.deepEqual(Object.keys(snapshot).sort(),['id','title','slug','artistId','artistSlug','category','fingerprint'].sort());assert.match(snapshot.fingerprint,/^[a-f0-9]{64}$/);assert.ok(['domace','narodne','strane'].includes(snapshot.category));assert.ok(snapshot.id&&snapshot.artistId&&snapshot.slug&&snapshot.artistSlug)}
})
test('sitemap cache revision depends on all editorial rule values, including fingerprints',()=>{
 assert.equal(songSearchReviewRevision,createHash('sha256').update(JSON.stringify(rules)).digest('hex'));const edited=structuredClone(rules);edited.at(-1).source.fingerprint='0'.repeat(64);assert.notEqual(songSearchReviewRevision,createHash('sha256').update(JSON.stringify(edited)).digest('hex'))
})
