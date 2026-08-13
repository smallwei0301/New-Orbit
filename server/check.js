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
  // head+count 對「不存在的資料表」會回 count=null 但 error=null，
  // 直接印 ✓ 會讓指向錯誤專案的 .env 看起來一切正常。null 一律當失敗。
  if (error || count === null) {
    failed = true
    console.log(`  ✗ ${t.padEnd(12)} ${error?.message || '查無此資料表（是否指向錯誤的 Supabase 專案？）'}`)
  } else {
    console.log(`  ✓ ${t.padEnd(12)} ${count} rows`)
  }
}

const { data: login } = await supabase.rpc('verify_login', {
  p_email: 'demo@orbit.test',
  p_password: 'demo1234',
})
if (login?.length) {
  console.log('  ✓ demo login works')
} else {
  failed = true
  console.log('  ✗ demo login failed（示範資料未灌入？執行 server/seed.sql）')
}

console.log(
  failed
    ? '\n檢查未通過：確認 .env 的 SUPABASE_URL 指向正確的 Orbit 專案、SUPABASE_SERVICE_ROLE_KEY 正確，並已跑過 server/seed.sql'
    : '\n資料庫連線正常 ✨'
)
process.exit(failed ? 1 : 0)
