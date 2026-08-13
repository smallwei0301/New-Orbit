/**
 * Build-time / deploy-time configuration.
 * ---------------------------------------
 * These are PLATFORM-level values (one per deployment), read from Vite env vars.
 * Per-tenant credentials (LINE, ECPay, JKOPay, GA, Pixel...) are NOT here —
 * they live in the database and are edited by each vendor in the admin UI.
 * See src/config/tenant.js for that schema.
 */
const env = import.meta.env

export const config = {
  // Relative by default: works in dev (Vite proxy) and in production (same-origin /api).
  apiBaseUrl: env.VITE_API_BASE_URL || '/api/v1',
  basePath: env.VITE_BASE_PATH || '/',
  appMode: env.VITE_APP_MODE || 'development',

  // platform-wide analytics (optional; only load when set AND not opted-out)
  tracking: {
    gtmId: env.VITE_GTM_ID || '',
    hotjarId: env.VITE_HOTJAR_ID || '',
    fbPixelId: env.VITE_FB_PIXEL_ID || '',
  },

  marketingHost: env.VITE_MARKETING_HOST || 'https://booking.homo.tw',
  support: {
    lineUrl: env.VITE_SUPPORT_LINE_URL || 'https://line.me/R/ti/p/@209agtiq',
    email: env.VITE_SUPPORT_EMAIL || 'vicky.chou@homo.tw',
  },
}

export const isProd = config.appMode === 'prod'

/** Tracking opt-out: `?skip-tracking=true` writes a cookie; internal users skip analytics. */
export function isTrackingSkipped() {
  if (typeof document === 'undefined') return true
  return document.cookie.split('; ').some((c) => c === 'skip_tracking=1')
}
