/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS tests for public contact settings. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const { PUBLIC_CONTACT_EMAIL, CONTACT_MAILTO, RIGHTS_REPORT_MAILTO } = require("../lib/site-contact.ts")
const { parentHref } = require("../lib/navigation/parent.ts")

test("contact links use the owner-approved public mailbox, not a placeholder", () => {
  assert.equal(PUBLIC_CONTACT_EMAIL, "nemanjaivanovic979@gmail.com")
  assert.equal(CONTACT_MAILTO, `mailto:${PUBLIC_CONTACT_EMAIL}`)
  const url = new URL(RIGHTS_REPORT_MAILTO)
  assert.equal(url.protocol, "mailto:")
  assert.equal(url.pathname, PUBLIC_CONTACT_EMAIL)
  assert.match(url.searchParams.get("subject"), /Prijava povrede prava/)
  assert.match(url.searchParams.get("body"), /URL spornog sadrzaja:\n/)
  assert.doesNotMatch(url.searchParams.get("body"), /JMBG|lozinka|kartic/i)
})

test("rights-report page returns to its containing contact section", () => {
  assert.equal(parentHref("/prijava-povrede"), "/kontakt")
  assert.equal(parentHref("/kontakt"), "/")
})
