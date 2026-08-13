/**
 * Orbit API server — `npm run api`
 * Thin HTTP wrapper around the Supabase-backed router.
 * Reads .env for SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
 */
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// --- load .env (no dependency) ---
const here = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(here, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const { hasServerEnv, MISSING_ENV_MESSAGE } = await import('./supabase.js')
if (!hasServerEnv()) {
  console.error(`\n[orbit] ${MISSING_ENV_MESSAGE}\n`)
  process.exit(1)
}
const { handle } = await import('./router.js')

const PORT = process.env.API_PORT || 8080

const server = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const query = Object.fromEntries(url.searchParams.entries())
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', async () => {
    let body = {}
    try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
    let result
    try {
      result = await handle(req.method, url.pathname, query, body, req.headers)
    } catch (e) {
      console.error('[api]', e)
      result = { status: 500, body: { code: 'INTERNAL', message: e.message } }
    }
    res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8', ...cors })
    res.end(JSON.stringify(result.body))
  })
})

server.listen(PORT, () => {
  console.log(`[orbit-api] http://localhost:${PORT}/api/v1  →  Supabase`)
})
