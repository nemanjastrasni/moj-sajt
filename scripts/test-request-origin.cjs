/* eslint-disable @typescript-eslint/no-require-imports */
const { test, after } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const Module = require("node:module")
require("ts-node").register({transpileOnly:true,compilerOptions:{module:"CommonJS",moduleResolution:"Node"}})
const originalLoad=Module._load
Module._load=function(request,parent,main){if(request==="@/lib/prisma")return{prisma:{}};if(request==="@/lib/auth")return{authOptions:{}};if(request.startsWith("@/"))request=path.join(__dirname,"..",request.slice(2));return originalLoad.call(this,request,parent,main)}
let adminGuard,parseSubmission,parseReport
try{adminGuard=require("../lib/adminSongs/server.ts").adminSameOrigin;parseSubmission=require("../lib/submissions/server.ts").submissionBody;parseReport=require("../lib/songReports/server.ts").reportBody}finally{Module._load=originalLoad}
const { isSameOrigin } = require("../lib/auth/origin.cjs")

const original = { NEXTAUTH_URL: process.env.NEXTAUTH_URL, SITE_URL: process.env.SITE_URL }
delete process.env.NEXTAUTH_URL
delete process.env.SITE_URL
after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value } })
const publicUrl = "https://www.gitarakordi.com"
const request = (url, origin, headers = {}) => new Request(url, { headers: { ...(origin === undefined ? {} : { origin }), ...headers } })

test("direct requests work in development and on Vercel without proxy metadata", () => {
  assert.equal(isSameOrigin(request("http://localhost:3000/api/admin/artists/a", "http://localhost:3000")), true)
  assert.equal(isSameOrigin(request(publicUrl + "/api/admin/artists/a", publicUrl), publicUrl), true)
})

test("Render internal URLs accept the configured public HTTPS origin", () => {
  for (const internal of ["http://localhost:10000", "https://localhost:10000", "http://0.0.0.0:10000"]) {
    assert.equal(isSameOrigin(request(internal + "/api/admin/artists/a", publicUrl, { "sec-fetch-site": "same-origin" }), publicUrl), true)
  }
})

test("foreign and same-site sibling origins cannot mutate content", () => {
  for (const origin of ["https://evil.test", "https://gitarakordi.com", "https://www.gitarakordi.com.evil.test", "http://www.gitarakordi.com", "https://www.gitarakordi.com:444", "null"]) {
    assert.equal(isSameOrigin(request("http://localhost:10000/api/admin/artists/a", origin), publicUrl), false)
  }
})

test("forged host and forwarded headers cannot authorize an attacker origin", () => {
  assert.equal(isSameOrigin(request("http://localhost:10000/api/admin/artists/a", "https://evil.test", { host: "evil.test", "x-forwarded-host": "evil.test", "x-forwarded-proto": "https" }), publicUrl), false)
})

test("cross-site Fetch Metadata is rejected even for matching or absent Origin", () => {
  for (const origin of [publicUrl, undefined]) assert.equal(isSameOrigin(request(publicUrl, origin, { "sec-fetch-site": "cross-site" }), publicUrl), false)
})

test("malformed configuration fails closed and URLs with credentials are rejected", () => {
  for (const config of ["broken", "file:///tmp/a", "https://user:password@www.gitarakordi.com"]) {
    assert.equal(isSameOrigin(request(publicUrl, publicUrl), config), false)
  }
})

test("authenticated non-browser callers without Origin keep their previous behavior", () => {
  assert.equal(isSameOrigin(request("http://localhost:10000/api/admin/artists/a"), publicUrl), true)
})

test("configured environment origin takes precedence over the internal request URL", () => {
  process.env.NEXTAUTH_URL = publicUrl
  try { assert.equal(isSameOrigin(request("http://localhost:10000/api/admin/artists/a", publicUrl)), true) }
  finally { delete process.env.NEXTAUTH_URL }
  process.env.SITE_URL = publicUrl
  try { assert.equal(isSameOrigin(request("http://localhost:10000/api/admin/artists/a", publicUrl)), true) }
  finally { delete process.env.SITE_URL }
})

test("real admin and body guards accept the public Render origin and reject a foreign origin",async()=>{
 process.env.NEXTAUTH_URL=publicUrl
 const body=origin=>new Request('http://localhost:10000/api/test',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{"title":"test"}'})
 try{assert.doesNotThrow(()=>adminGuard(body(publicUrl)));assert.throws(()=>adminGuard(body('https://evil.test')),error=>error.status===403);for(const parse of [parseSubmission,parseReport]){assert.equal((await parse(body(publicUrl))).title,'test');await assert.rejects(parse(body('https://evil.test')),error=>error.status===403)}}finally{delete process.env.NEXTAUTH_URL}
})
