#!/usr/bin/env node
/**
 * Orbit API smoke test — the verification harness.
 * ------------------------------------------------
 * 對「跑起來的 API」做端對端契約測試：認證、租戶隔離、機密遮罩、CRUD 往返。
 * 任何後端改動（server/、api/）後都必須跑過全綠才算完成。
 *
 *   node scripts/smoke.mjs                          # 打線上 (new-orbit.vercel.app)
 *   SMOKE_BASE_URL=http://localhost:8080/api/v1 node scripts/smoke.mjs   # 打本地
 *
 * 需要的測試資料（server/seed.sql 會建立）：
 *   - 商家 midao + 帳號 demo@orbit.test / demo1234
 *   - 第二商家 smoke-b + 帳號 smoke-b@orbit.test / smoketest（跨租戶隔離測試用）
 * 若 smoke-b 不存在，跨租戶測試會標記為 SKIP（其餘照跑）。
 *
 * 結束碼：全部通過 = 0；任何失敗 = 1。低階模型請以結束碼為準，不要自行解讀。
 */

const BASE = (process.env.SMOKE_BASE_URL || 'https://new-orbit.vercel.app/api/v1').replace(/\/+$/, '')
const ORG_A = process.env.SMOKE_ORG || 'midao'
const USER_A = { email: process.env.SMOKE_EMAIL || 'demo@orbit.test', password: process.env.SMOKE_PASSWORD || 'demo1234' }
const ORG_B = process.env.SMOKE_ORG_B || 'smoke-b'
const USER_B = { email: process.env.SMOKE_EMAIL_B || 'smoke-b@orbit.test', password: process.env.SMOKE_PASSWORD_B || 'smoketest' }

let passed = 0, failed = 0, skipped = 0
const fail = (name, detail) => { failed++; console.log(`  ✗ ${name}\n      ${detail}`) }
const pass = (name) => { passed++; console.log(`  ✓ ${name}`) }
const skip = (name, why) => { skipped++; console.log(`  - SKIP ${name} (${why})`) }

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}/${path.replace(/^\/+/, '')}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch { /* HTML error page etc. */ }
  return { status: res.status, json }
}

/** check(名稱, 預期敘述, 實際 {status,json}, 判斷函式) */
function check(name, expect, r, predicate) {
  try {
    if (predicate(r)) pass(name)
    else fail(name, `expect ${expect}, got HTTP ${r.status} ${JSON.stringify(r.json)?.slice(0, 200)}`)
  } catch (e) {
    fail(name, `predicate threw: ${e.message}; got HTTP ${r.status} ${JSON.stringify(r.json)?.slice(0, 200)}`)
  }
}

console.log(`Orbit smoke → ${BASE}\n`)

// ---------------- 1. 公開端點 ----------------
console.log('公開端點')
{
  const r = await req('GET', `store/items?orgId=${ORG_A}`)
  check('GET store/items（公開）回 200 且有資料', '200 + data[]', r,
    (r) => r.status === 200 && Array.isArray(r.json?.data) && r.json.data.length > 0)
  if (r.status === 404) {
    console.log('\n💥 連公開端點都 404 — 可能是 vercel.json rewrite 壞了或部署尚未完成。先修這個再說。')
    process.exit(1)
  }
}
{
  const r = await req('GET', `organizations/${ORG_A}`)
  check('GET organizations/:slug（公開）回 200', `200 + slug=${ORG_A}`, r,
    (r) => r.status === 200 && r.json?.slug === ORG_A)
}

// ---------------- 2. 認證 ----------------
console.log('認證')
{
  const r = await req('GET', `customers?orgId=${ORG_A}`)
  check('無 token 打受保護端點回 401', '401 INVALID_TOKEN', r,
    (r) => r.status === 401 && r.json?.code === 'INVALID_TOKEN')
}
{
  const r = await req('POST', 'auth/sign-in', { body: { email: USER_A.email, password: 'wrong-password' } })
  check('錯誤密碼回 401', '401 INVALID_CREDENTIALS', r,
    (r) => r.status === 401 && r.json?.code === 'INVALID_CREDENTIALS')
}
let tokenA = null, refreshA = null
{
  const r = await req('POST', 'auth/sign-in', { body: USER_A })
  check('正確帳密回 token + refreshToken', '200 + tokens', r,
    (r) => r.status === 200 && !!r.json?.token && !!r.json?.refreshToken)
  tokenA = r.json?.token
  refreshA = r.json?.refreshToken
}
if (!tokenA) {
  console.log('\n💥 拿不到 token，後面全部無法測。')
  process.exit(1)
}
{
  const r = await req('POST', 'auth/refresh', { body: { refreshToken: refreshA } })
  check('auth/refresh 換得新 token', '200 + token', r,
    (r) => r.status === 200 && !!r.json?.token)
}
{
  const r = await req('GET', 'me', { token: tokenA })
  check('GET me 回自己的帳號', `200 + email=${USER_A.email}`, r,
    (r) => r.status === 200 && r.json?.user?.email === USER_A.email)
}

// ---------------- 3. 讀取（A 商家） ----------------
console.log('讀取')
let customerAId = null, orgAUuid = null
{
  const r = await req('GET', `customers?orgId=${ORG_A}`, { token: tokenA })
  check('帶 token 讀 customers 回資料', '200 + data[]', r,
    (r) => r.status === 200 && Array.isArray(r.json?.data) && r.json.data.length > 0)
  customerAId = r.json?.data?.[0]?.id || null
  orgAUuid = r.json?.data?.[0]?.orgId || null
}
{
  const r = await req('GET', `orders?orgId=${ORG_A}`, { token: tokenA })
  check('讀 orders 回資料', '200 + data[]', r,
    (r) => r.status === 200 && Array.isArray(r.json?.data))
}
{
  const r = await req('GET', `customers?orgId=this-org-does-not-exist`, { token: tokenA })
  check('不存在的 orgId 回 404（不能 fallback 到別家）', '404 ORG_NOT_FOUND', r,
    (r) => r.status === 404 && r.json?.code === 'ORG_NOT_FOUND')
}

// ---------------- 4. 機密遮罩 ----------------
console.log('機密遮罩')
{
  const r = await req('GET', `line-bot?orgId=${ORG_A}`, { token: tokenA })
  const raw = JSON.stringify(r.json || {})
  check('line-bot GET 只回 has/masked，無原始機密欄位', 'no channelSecret/channelAccessToken', r,
    (r) => r.status === 200 &&
      r.json?.channelSecret === undefined && r.json?.channelAccessToken === undefined &&
      !raw.includes('channel_secret') && 'hasChannelSecret' in (r.json || {}))
}
{
  const r = await req('GET', `payment-providers/ecpay?orgId=${ORG_A}`, { token: tokenA })
  check('payment-providers GET 無 hashKey/hashIv 原始值', 'has-flags only', r,
    (r) => r.status === 200 &&
      r.json?.hashKey === undefined && r.json?.hashIv === undefined && 'hasHashKey' in (r.json || {}))
}

// ---------------- 5. 寫入往返（自我清理） ----------------
console.log('寫入往返')
{
  const name = `smoke-${Math.random().toString(36).slice(2, 8)}`
  const c = await req('POST', `tags?orgId=${ORG_A}`, { token: tokenA, body: { name } })
  check('POST tags 建立標籤', '200 + id', c, (r) => r.status === 200 && !!r.json?.id)
  const id = c.json?.id
  if (id) {
    const u = await req('PUT', `tags/${id}?orgId=${ORG_A}`, { token: tokenA, body: { name: `${name}-renamed` } })
    check('PUT tags/:id 改名', '200 + new name', u,
      (r) => r.status === 200 && r.json?.name === `${name}-renamed`)
    const d = await req('DELETE', `tags/${id}?orgId=${ORG_A}`, { token: tokenA })
    check('DELETE tags/:id 刪除', '200 ok', d, (r) => r.status === 200 && r.json?.ok === true)
  } else {
    skip('PUT/DELETE tags', '建立失敗，無 id 可續測')
  }
}

// ---------------- 6. 跨租戶隔離（需要 smoke-b 商家） ----------------
console.log('跨租戶隔離')
{
  const rb = await req('POST', 'auth/sign-in', { body: USER_B })
  const tokenB = rb.json?.token
  if (!tokenB) {
    skip('全部跨租戶測試', `${ORG_B} 商家或帳號不存在 — 在 DB 跑 server/seed.sql 可建立`)
  } else {
    {
      const r = await req('GET', `customers?orgId=${ORG_A}`, { token: tokenB })
      check('B 的 token 讀 A 商家的 customers 回 403', '403 INSUFFICIENT_PERMISSION', r,
        (r) => r.status === 403 && r.json?.code === 'INSUFFICIENT_PERMISSION')
    }
    if (customerAId) {
      const r = await req('GET', `customers/${customerAId}?orgId=${ORG_B}`, { token: tokenB })
      check('B 用自家 orgId 讀 A 的 customer uuid 回 404（:id 路由必須以 org 過濾）', '404', r,
        (r) => r.status === 404)
    } else skip('B 讀 A 的 customer :id', '沒拿到 A 的 customer id')
    if (customerAId) {
      const r = await req('PUT', `customers/${customerAId}?orgId=${ORG_B}`,
        { token: tokenB, body: { note: 'hacked' } })
      check('B 嘗試改寫 A 的 customer 回 404（不得寫入）', '404', r,
        (r) => r.status === 404)
    } else skip('B 改寫 A 的 customer', '沒拿到 A 的 customer id')
    if (orgAUuid) {
      const r = await req('PUT', `organizations/${orgAUuid}`, { token: tokenB, body: { name: 'hacked' } })
      check('B 嘗試改寫 A 的商家設定回 403', '403', r, (r) => r.status === 403)
    } else skip('B 改寫 A 的商家設定', '沒拿到 A 的 org uuid')
    {
      const r = await req('GET', `line-bot?orgId=${ORG_A}`, { token: tokenB })
      check('B 讀 A 的 LINE 設定回 403', '403', r, (r) => r.status === 403)
    }
  }
}

// ---------------- 結果 ----------------
console.log(`\n結果：${passed} 通過 / ${failed} 失敗 / ${skipped} 略過`)
if (failed > 0) {
  console.log('❌ smoke FAILED — 不要 merge，先修到全綠。')
  process.exit(1)
}
console.log('✅ smoke PASSED')
