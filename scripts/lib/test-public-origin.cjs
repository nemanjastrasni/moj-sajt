/* eslint-disable @typescript-eslint/no-require-imports -- Each Node test fixture uses site.test, independently of NextAuth's localhost default. */
const { after } = require("node:test")
const previous = process.env.NEXTAUTH_URL
process.env.NEXTAUTH_URL = "https://site.test"
after(() => { if (previous === undefined) delete process.env.NEXTAUTH_URL; else process.env.NEXTAUTH_URL = previous })
