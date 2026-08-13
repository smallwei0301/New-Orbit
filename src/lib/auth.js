/**
 * Auth token storage — cookie based, matching production.
 * `token` = JWT access (7d), `refreshToken` = refresh (60d).
 * Cookies set with Secure/SameSite=Strict/path=/.
 */
const ACCESS = 'token'
const REFRESH = 'refreshToken'

function setCookie(name, value, maxAgeDays) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeDays * 86400}; SameSite=Strict${secure}`
}
function getCookie(name) {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  return hit ? hit.slice(name.length + 1) : null
}
function eraseCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0`
}

export const auth = {
  getToken: () => getCookie(ACCESS),
  getRefreshToken: () => getCookie(REFRESH),
  setTokens(token, refreshToken) {
    if (token) setCookie(ACCESS, token, 7)
    if (refreshToken) setCookie(REFRESH, refreshToken, 60)
  },
  clear() {
    eraseCookie(ACCESS)
    eraseCookie(REFRESH)
  },
  /** Decode a JWT payload client-side (no verification). */
  decode(token) {
    try {
      const payload = token.split('.')[1]
      return JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))))
    } catch {
      return null
    }
  },
  isExpired(token) {
    const p = this.decode(token)
    return !p || (p.exp && p.exp * 1000 < Date.now())
  },
}
