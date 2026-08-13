/**
 * Vercel serverless entry point — catches every /api/* request and delegates
 * to the same router used by the local server, so there is one implementation
 * of the API contract regardless of where it runs.
 *
 * Env vars required on Vercel (Project Settings → Environment Variables):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_SECRET
 * None of these may be VITE_-prefixed — they must stay server-side.
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
  const query = Object.fromEntries(url.searchParams.entries())

  let body = {}
  if (req.body && typeof req.body === 'object') {
    body = req.body
  } else if (typeof req.body === 'string' && req.body) {
    try { body = JSON.parse(req.body) } catch { body = {} }
  }

  try {
    const result = await handle(req.method, url.pathname, query, body, req.headers)
    res.status(result.status).json(result.body)
  } catch (e) {
    console.error('[api]', e)
    res.status(500).json({ code: 'INTERNAL', message: e.message })
  }
}
