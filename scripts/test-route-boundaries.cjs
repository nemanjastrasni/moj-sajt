/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression test. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.join(__dirname, '..')

function errorBoundaries(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return errorBoundaries(file)
    return /^(?:global-)?error\.[jt]sx?$/.test(entry.name) ? [file] : []
  })
}

for (const file of errorBoundaries(path.join(root, 'app'))) {
  const relative = path.relative(root, file).split(path.sep).join('/')
  test(`${relative} explicitly declares a client error boundary`, () => {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const directives = []
    for (const statement of source.statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break
      directives.push(statement.expression.text)
    }
    assert.ok(directives.includes('use client'), `${relative} must declare "use client", even when re-exporting another client component`)
  })
}

const liveDataRoutes = [
  ...['narodne', 'domace', 'strane'].map(category => `app/top-50/${category}/page.tsx`),
  'app/api/latest/route.ts',
]

for (const relative of liveDataRoutes) {
  test(`${relative} reads live data on request, not during the build`, () => {
    const file = path.join(root, relative)
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const dynamic = source.statements
      .filter(statement => ts.isVariableStatement(statement) && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
      .flatMap(statement => [...statement.declarationList.declarations])
      .find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'dynamic')
    assert.ok(dynamic?.initializer && ts.isStringLiteral(dynamic.initializer))
    assert.equal(dynamic.initializer.text, 'force-dynamic')
  })
}
