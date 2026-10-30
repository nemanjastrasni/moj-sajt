/* eslint-disable @typescript-eslint/no-require-imports -- Isolated PostgreSQL backup helpers; never a production restore. */
const fs = require('node:fs/promises'), path = require('node:path'), { spawn } = require('node:child_process'), { randomBytes } = require('node:crypto'), net = require('node:net')
const { Client } = require('pg'), { keyId, validateKey, hashFile, encryptArchive, decryptArchive } = require('./backup-crypto.cjs')
const ROOT = path.resolve(__dirname, '../..')
function inside(root, target) { const relative = path.relative(path.resolve(root), path.resolve(target)); return relative && !relative.startsWith('..') && !path.isAbsolute(relative) }
function backupLocation(root, keyFile) {
  root = path.resolve(root); keyFile = path.resolve(keyFile)
  if (!path.parse(root).root || root === path.parse(root).root || root === ROOT || inside(ROOT, root) || inside(root, ROOT) || inside(ROOT, keyFile) || inside(root, keyFile)) throw Error('BACKUP_AND_KEY_MUST_BE_OUTSIDE_REPOSITORY_AND_SEPARATE')
  for (const cloud of [process.env.OneDrive, process.env.OneDriveConsumer, process.env.OneDriveCommercial].filter(Boolean)) if (root === path.resolve(cloud) || inside(cloud, root) || inside(cloud, keyFile)) throw Error('USE_A_LOCAL_NON_SYNCED_BACKUP_LOCATION')
  return { root, keyFile }
}
async function run(exe, args, { env = process.env, timeout = 300000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = '', timedOut = false
    const timer = setTimeout(() => { timedOut = true; child.kill() }, timeout)
    child.stdout.on('data', chunk => { if (stdout.length < 100000) stdout += chunk })
    child.stderr.on('data', chunk => { if (stderr.length < 100000) stderr += chunk })
    child.on('error', () => { clearTimeout(timer); reject(Error('BACKUP_TOOL_START_FAILED')) })
    child.on('close', code => { clearTimeout(timer); if (code !== 0 || timedOut) reject(Object.assign(Error(timedOut ? 'BACKUP_TOOL_TIMEOUT' : 'BACKUP_TOOL_FAILED'), { tool: path.basename(exe), privateDiagnostic: stderr })); else resolve({ stdout, warning: Boolean(stderr.trim()) }) })
  })
}
async function privateDirectory(directory) {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 })
  if ((await fs.lstat(directory)).isSymbolicLink()) throw Error('PRIVATE_DIRECTORY_MUST_NOT_BE_A_LINK')
  if (path.resolve(await fs.realpath(directory)).toLowerCase() !== path.resolve(directory).toLowerCase()) throw Error('PRIVATE_DIRECTORY_MUST_NOT_TRAVERSE_A_LINK')
  if (process.platform !== 'win32') { await fs.chmod(directory, 0o700); return }
  const script = `
$ErrorActionPreference='Stop'
$p=$env:GAK_PRIVATE_DIRECTORY
$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
$owner=(Get-Acl -LiteralPath $env:GAK_REPOSITORY).GetOwner([System.Security.Principal.SecurityIdentifier])
$ids=@($sid,$owner,(New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')),(New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')))
$allowed=@($ids | ForEach-Object {$_.Value})
function Test-PrivateAcl($acl) {
  if(!$acl.AreAccessRulesProtected){return $false}
  $seen=@()
  foreach($r in $acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])) {
    if($r.IdentityReference.Value -notin $allowed -or $r.AccessControlType -ne 'Allow' -or $r.FileSystemRights -ne 'FullControl' -or $r.InheritanceFlags -ne 'ContainerInherit, ObjectInherit' -or $r.PropagationFlags -ne 'None'){return $false}
    $seen+= $r.IdentityReference.Value
  }
  foreach($id in $allowed){if($id -notin $seen){return $false}}
  return $true
}
$acl=Get-Acl -LiteralPath $p
if(Test-PrivateAcl $acl){exit 0}
$acl.SetAccessRuleProtection($true,$false)
foreach($r in @($acl.GetAccessRules($true,$false,[System.Security.Principal.SecurityIdentifier]))) { [void]$acl.RemoveAccessRuleSpecific($r) }
foreach($id in $ids) {
  $r=New-Object System.Security.AccessControl.FileSystemAccessRule($id,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
  $acl.AddAccessRule($r)
}
Set-Acl -LiteralPath $p -AclObject $acl
if(!(Test-PrivateAcl (Get-Acl -LiteralPath $p))){throw 'Private directory verification failed'}
`
  // Keep the repository owner included, even when running under a sandbox identity.
  const env = { ...process.env, GAK_PRIVATE_DIRECTORY: directory, GAK_REPOSITORY: ROOT }
  // Windows PowerShell must not inherit PowerShell 7's incompatible module paths.
  delete env.PSModulePath
  await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env, timeout: 15000 })
}
async function readKey(file, create = false) {
  try { const stat = await fs.lstat(file); if (!stat.isFile() || stat.size > 1024) throw Error('INVALID_BACKUP_KEY'); return validateKey(JSON.parse(await fs.readFile(file, 'utf8'))) }
  catch (error) {
    if (error.code !== 'ENOENT' || !create) throw error
    const key = randomBytes(32)
    await fs.writeFile(file, JSON.stringify({ version: 1, id: keyId(key), key: key.toString('base64') }), { flag: 'wx', mode: 0o600 })
    return key
  }
}
function sourceEnv(connection, ca) {
  const url = new URL(connection)
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !ca || !path.isAbsolute(ca)) throw Error('INVALID_VERIFIED_DATABASE_CONFIGURATION')
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw Error('UNSAFE_TLS_OVERRIDE')
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1) || 'postgres'), PGSSLMODE: 'verify-full', PGSSLROOTCERT: ca, PGCONNECT_TIMEOUT: '15', PGOPTIONS: '-c statement_timeout=180000', PGAPPNAME: 'gitarakordi-application-backup' }
  for (const name of ['PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGSSLCERT', 'PGSSLKEY', 'PGPASSFILE']) delete env[name]
  return env
}
async function fingerprint(db) {
  const names = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename)
  const tables = []
  for (const name of names) {
    const qualified = db.escapeIdentifier('public') + '.' + db.escapeIdentifier(name)
    const row = (await db.query(`SELECT count(*)::int AS rows, md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), '')) AS hash FROM ${qualified} t`)).rows[0]
    tables.push({ name, ...row })
  }
  const security = (await db.query("SELECT c.relname AS name,c.relrowsecurity AS rls,c.relforcerowsecurity AS forced,(SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) AS policies,(SELECT count(*)::int FROM pg_constraint k WHERE k.conrelid=c.oid) AS constraints,(SELECT count(*)::int FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal) AS triggers FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname")).rows
  return { tables, security }
}
async function cleanup(workRoot, work) {
  if (!inside(workRoot, work) || !/^run-[a-f0-9]{24}$/.test(path.basename(work)) || (await fs.lstat(work)).isSymbolicLink()) throw Error('UNSAFE_TEMPORARY_CLEANUP_TARGET')
  await fs.rm(path.resolve(work), { recursive: true, force: true })
}
async function workDirectory(root) { const workRoot = path.join(root, '.work'); await privateDirectory(workRoot); const work = path.join(workRoot, 'run-' + randomBytes(12).toString('hex')); await fs.mkdir(work, { mode: 0o700 }); return { workRoot, work } }
async function freePort() { const server = net.createServer(); await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) }); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port }
async function restoreTest(bin, archive, manifest, work) {
  try { await fs.access(path.resolve(bin, '../share/postgres.bki')) }
  catch { throw Error('LOCAL_POSTGRES_INSTALLATION_INCOMPLETE') }
  const data = path.join(work, 'cluster'), password = randomBytes(32).toString('hex'), pwfile = path.join(work, 'local-test-password'), port = await freePort()
  await fs.writeFile(pwfile, password, { flag: 'wx', mode: 0o600 })
  const pg = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''))
  await run(pg('initdb'), ['-D', data, '-U', 'backup_test', '--encoding=UTF8', '--locale=C', '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--pwfile=' + pwfile])
  let started = false, stopped = false
  try {
    await run(pg('pg_ctl'), ['-D', data, '-l', path.join(work, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -c ssl=off`]); started = true
    const db = new Client({ host: '127.0.0.1', port, user: 'backup_test', password, database: 'postgres', ssl: false, connectionTimeoutMillis: 10000 })
    await db.connect()
    try {
      const directory = (await db.query('SHOW data_directory')).rows[0].data_directory
      if (path.resolve(directory).toLowerCase() !== path.resolve(data).toLowerCase()) throw Error('RESTORE_TARGET_IS_NOT_OUR_TEMPORARY_CLUSTER')
      for (const role of ['anon', 'authenticated', 'service_role']) await db.query('CREATE ROLE ' + db.escapeIdentifier(role) + ' NOLOGIN')
      await db.query('CREATE DATABASE gitarakordi_restore TEMPLATE template0')
    } finally { await db.end() }
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: 'backup_test', PGPASSWORD: password, PGDATABASE: 'gitarakordi_restore', PGSSLMODE: 'disable', PGCONNECT_TIMEOUT: '10' }
    await run(pg('pg_restore'), ['--dbname=gitarakordi_restore', '--exit-on-error', '--no-owner', '--no-privileges', '--clean', '--if-exists', archive], { env })
    const restored = new Client({ host: '127.0.0.1', port, user: 'backup_test', password, database: 'gitarakordi_restore', ssl: false, connectionTimeoutMillis: 10000 })
    await restored.connect()
    try {
      const actual = await fingerprint(restored)
      if (JSON.stringify(actual.tables) !== JSON.stringify(manifest.tables) || JSON.stringify(actual.security) !== JSON.stringify(manifest.security)) throw Error('RESTORED_DATA_OR_SECURITY_DID_NOT_MATCH')
      return { passed: true, tables: actual.tables.length, rows: actual.tables.reduce((sum, table) => sum + table.rows, 0), rowHashesMatch: true, securityFlagsAndObjectCountsMatch: true, sourceDatabaseWritten: false }
    } finally { await restored.end() }
  } finally {
    if (started) {
      try { await run(pg('pg_ctl'), ['-D', data, '-w', '-m', 'fast', 'stop']); stopped = true }
      catch { throw Object.assign(Error('LOCAL_TEST_CLUSTER_REQUIRES_ATTENTION'), { keepWork: true }) }
    }
    if (started && !stopped) throw Error('LOCAL_TEST_CLUSTER_REQUIRES_ATTENTION')
  }
}
module.exports = { ROOT, inside, backupLocation, run, privateDirectory, readKey, sourceEnv, fingerprint, cleanup, workDirectory, restoreTest, hashFile, encryptArchive, decryptArchive }
