/**
 * Supabase client for the API server.
 *
 * Uses the SERVICE ROLE key, which bypasses RLS. Every table has RLS enabled
 * with no policies, so this key is the ONLY way to read/write data — that is
 * what keeps tenant secrets (LINE tokens, payment keys) unreachable from the
 * browser. NEVER expose this key to the frontend or commit it.
 */
import { createClient } from '@supabase/supabase-js'

export const MISSING_ENV_MESSAGE =
  'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / AUTH_SECRET. ' +
  'Set them in .env locally, or in Vercel → Project Settings → Environment Variables (then redeploy).'

/** True when every server-side secret is present. */
export function hasServerEnv() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.AUTH_SECRET)
}

// Created lazily: on serverless we must NOT exit the process — we want a clean
// error response instead, and cold starts should not crash the whole function.
let _client = null
function getClient() {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error(MISSING_ENV_MESSAGE)
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

// Proxy so existing `supabase.from(...)` call sites keep working unchanged.
export const supabase = new Proxy(
  {},
  {
    get(_t, prop) {
      const c = getClient()
      const v = c[prop]
      return typeof v === 'function' ? v.bind(c) : v
    },
  }
)

/** Cache of org slug/id → uuid so we don't re-query on every request. */
const orgCache = new Map()
const isUuid = (s) =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

/**
 * Accepts a uuid or a slug ("midao") and resolves it to the org uuid.
 * STRICT: an unknown slug returns null — never fall back to "some" org and
 * never cache a failed lookup. Falling back would let a request scoped to a
 * non-existent org silently read another tenant's data (the router's
 * membership guard compares against whatever we return here).
 */
export async function resolveOrgId(key) {
  if (!key) return null
  if (isUuid(key)) return key
  if (orgCache.has(key)) return orgCache.get(key)

  const { data } = await supabase.from('orgs').select('id').eq('slug', key).maybeSingle()
  if (!data) return null
  orgCache.set(key, data.id)
  return data.id
}
