/* eslint-disable @typescript-eslint/no-require-imports -- Node regression tests use the existing CommonJS harness. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { parentHref, artistIndexHref, activeParentHref } = require("../lib/navigation/parent.ts")

test("song, artist index, category and home follow hierarchy rather than visit history", () => {
  const cases = [
    ["/pesme/narodne/100-band/zivot-s-tobom", "/pesme/narodne/100-band"],
    ["/pesme/narodne/slovo/num", "/pesme/narodne"],
    ["/pesme/narodne/slovo/a", "/pesme/narodne"],
    ["/pesme/narodne/slovo/%23", "/pesme/narodne"],
    ["/pesme/domace/slovo/%C4%8D", "/pesme/domace"],
    ["/pesme/domace/slovo/d%C5%BE", "/pesme/domace"],
    ["/pesme/strane/slovo/b/", "/pesme/strane"],
    ["/pesme/narodne", "/pesme"], ["/pesme", "/"], ["/", null],
    ["/pesme/domace/bajaga/info", "/pesme/domace/bajaga"],
  ]
  for (const [source, expected] of cases) assert.equal(parentHref(source), expected, source)
})

test("real artist name supplies NUM and all Serbian letters without guessing from ASCII slugs", () => {
  for (const [name, letter] of [["100 Band", "num"], ["  357", "num"], ["!Test", "num"], ["Bajaga", "b"], ["The Beatles", "t"], ["\u010carobnjaci", "\u010d"], ["\u0106ana", "\u0107"], ["\u0110or\u0111e Bala\u0161evi\u0107", "\u0111"], ["D\u017ea Ili Bu", "d\u017e"], ["Ljuba", "lj"], ["Njujork", "nj"], ["\u0160aban", "\u0161"], ["\u017deljko", "\u017e"]]) {
    assert.equal(artistIndexHref("pesme", "domace", name), `/pesme/domace/slovo/${encodeURIComponent(letter)}`, name)
  }
  assert.equal(parentHref("/pesme/domace/djordje-balasevic"), "/pesme/domace", "safe fallback until real-name hint mounts")
  assert.equal(activeParentHref("/pesme/domace/djordje-balasevic", { pathname: "/pesme/domace/djordje-balasevic", href: artistIndexHref("pesme", "domace", "\u0110or\u0111e Bala\u0161evi\u0107"), owner: "artist" }), "/pesme/domace/slovo/%C4%91")
})

test("biography parent links match its existing first-character letter indexes", () => {
  assert.equal(parentHref("/biografija/narodne/slovo/num"), "/biografija/narodne")
  assert.equal(parentHref("/biografija/domace/slovo"), "/biografija/domace")
  assert.equal(parentHref("/biografija/domace"), "/biografija")
  assert.equal(parentHref("/biografija"), "/")
  assert.equal(artistIndexHref("biografija", "domace", "D\u017ea Ili Bu"), "/biografija/domace/slovo/d")
  assert.equal(artistIndexHref("biografija", "domace", "Ljuba"), "/biografija/domace/slovo/l")
  assert.equal(artistIndexHref("biografija", "domace", "100 Band"), "/biografija/domace/slovo/num")
})

test("stale artist hints never apply to a letter, a song, another artist or the homepage", () => {
  const hint = { pathname: "/pesme/narodne/100-band", href: "/pesme/narodne/slovo/num", owner: "artist" }
  assert.equal(activeParentHref(hint.pathname, hint), hint.href)
  for (const pathname of ["/pesme/narodne/slovo/num", "/pesme/narodne/100-band/song", "/pesme/narodne/drugi", "/"]) assert.equal(activeParentHref(pathname, hint), parentHref(pathname))
})

test("admin editing never returns to a legacy redirect that leads back to the editor", () => {
  for (const source of ["/admin/songs/new", "/admin/songs/id", "/admin/songs/id/edit"]) assert.equal(parentHref(source), "/admin/songs")
  assert.equal(parentHref("/admin/artists/id/edit/merge"), "/admin/artists/id/edit")
  assert.equal(parentHref("/admin/artists/id/edit"), "/admin/artists")
  assert.equal(parentHref("/admin/artists"), "/admin")
  assert.equal(parentHref("/admin/predlozi/id"), "/admin/predlozi")
  assert.equal(parentHref("/admin"), "/")
})

test("other section parents are existing indexes, not missing top-list routes", () => {
  const cases = [
    ["/plejliste/id", "/plejliste"], ["/plejliste/kategorija/rock", "/plejliste/kategorija"],
    ["/profile/plejliste", "/profile"], ["/listening-playlist/id", "/listening-playlist"],
    ["/akordi/c", "/akordi"], ["/top-50/domace", "/pesme/domace"],
    ["/top-50/unknown", "/pesme"], ["/top-listening-playlists/domace", "/plejliste"],
    ["/favorite", "/"], ["/signup", "/"], ["/login", "/"],
  ]
  for (const [source, expected] of cases) assert.equal(parentHref(source), expected, source)
})

test("unsafe paths and hints cannot redirect offsite, to themselves or into path traversal", () => {
  for (const value of [null, "", "https://evil.test", "//evil.test", "/\\evil", "/pesme/%2F%2Fevil", "/pesme/..", "/pesme/%2e%2e", "/pesme/%", "/pesme/\n", "/pesme?target=evil"]) assert.equal(parentHref(value), null, String(value))
  for (const value of ["https://evil.test", "//evil.test", "/pesme/%2f", "/pesme/../admin", "/pesme/narodne"]) assert.equal(activeParentHref("/pesme/narodne", { pathname: "/pesme/narodne", href: value, owner: "bad" }), "/pesme")
})

test("header uses a translated parent link and scoped hints instead of any browser history API", () => {
  const button = fs.readFileSync(path.join(__dirname, "../app/components/BackButton.tsx"), "utf8")
  assert.match(button, /<Link\s+href=\{href\}/)
  assert.match(button, /t\("Nazad"\)/)
  assert.doesNotMatch(button, /router\.back|history\.|document\.referrer|sessionStorage/)
  const targets = fs.readFileSync(path.join(__dirname, "../app/components/BackNavigation.tsx"), "utf8")
  assert.match(targets, /current\?\.owner === owner/)
  assert.match(targets, /BackNavigationTarget\(\{ pathname, href \}/)
})
