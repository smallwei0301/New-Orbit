/**
 * Vercel serverless entry point.
 *
 * Every /api/* request is routed here by an explicit rewrite in vercel.json,
 * which passes the original path as `__path`. We do NOT rely on filename-based
 * catch-all routing ([...path].js), because Vercel's plain /api functions only
 * matched a single path segment that way — /api/v1/auth/sign-in 404'd.
 *
 * Env vars required on Vercel:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_SECRET
 * None may be VITE_-prefixed — they must stay server-side.
 */
import { handle } from '../server/router.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`)

  // Prefer the original path handed over by the rewrite; fall back to the real
  // URL so this same file works when run locally without any rewrite.
  const forced = url.searchParams.get('__path')
  const pathname = forced ? `/api/${String(forced).replace(/^\/+/, '')}` : url.pathname

  url.searchParams.delete('__path')
  const query = Object.fromEntries(url.searchParams.entries())

  let body = {}
  if (req.body && typeof req.body === 'object') {
    body = req.body
  } else if (typeof req.body === 'string' && req.body) {
    try { body = JSON.parse(req.body) } catch { body = {} }
  }

  try {
    const result = await handle(req.method, pathname, query, body, req.headers)
    res.status(result.status).json(result.body)
  } catch (e) {
    console.error('[api]', e)
    res.status(500).json({ code: 'INTERNAL', message: e.message })
  }
}
