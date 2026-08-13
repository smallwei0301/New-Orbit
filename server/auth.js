/**
 * Token signing / verification (HS256, no dependency).
 *
 * Tokens were previously unsigned placeholders, which is fine on localhost but
 * unacceptable once the API is public: anyone could forge one, or simply call
 * the endpoints with no token at all. These are real signed JWTs and the router
 * rejects anything that fails verification.
 */
import crypto from 'crypto'

const b64u = (buf) => Buffer.from(buf).toString('base64url')
const unb64u = (s) => Buffer.from(s, 'base64url').toString('utf8')

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET is not set')
  return s
}

export function signToken(payload, ttlSeconds = 7 * 86400) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSeconds }
  const data = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(body))}`
  const sig = crypto.createHmac('sha256', secret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

/** @returns payload object, or null when missing/tampered/expired. */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const data = `${parts[0]}.${parts[1]}`
  const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url')
  // constant-time compare
  const a = Buffer.from(parts[2])
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  let payload
  try { payload = JSON.parse(unb64u(parts[1])) } catch { return null }
  if (payload.exp && payload.exp * 1000 < Date.now()) return null
  return payload
}

export function bearerFrom(headers = {}) {
  const h = headers.authorization || headers.Authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m ? m[1] : null
}
