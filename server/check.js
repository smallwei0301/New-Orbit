/**
 * Connection smoke test — `npm run db:check`
 * Confirms the service_role key works and the seed data is present.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(here, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const { supabase } = await import('./supabase.js')

const tables = ['orgs', 'users', 'items', 'resources', 'customers', 'tags', 'orders', 'waitlist']
let failed = false

for (const t of tables) {
  const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
  if (error) {
    failed = true
    console.log(`  ✗ ${t.padEnd(12)} ${error.message}`)
  } else {
    console.log(`  ✓ ${t.padEnd(12)} ${count} rows`)
  }
}

const { data: login } = await supabase.rpc('verify_login', {
  p_email: 'demo@orbit.test',
  p_password: 'demo1234',
})
console.log(login?.length ? '  ✓ demo login works' : '  ✗ demo login failed')

console.log(failed ? '\n連線失敗，請檢查 .env 的 SUPABASE_SERVICE_ROLE_KEY' : '\n資料庫連線正常 ✨')
process.exit(failed ? 1 : 0)
