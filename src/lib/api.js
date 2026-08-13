/**
 * API client + endpoint registry.
 * -------------------------------
 * The base URL comes from env (VITE_API_BASE_URL). Two axios instances:
 *   - `api`  : authenticated; attaches Bearer token, handles 401 refresh + 402 plan-gate.
 *   - `raw`  : unauthenticated; used for auth endpoints.
 *
 * ENDPOINTS mirrors the paths discovered in the production bundle so a
 * self-hosted backend can implement the same contract.
 */
import axios from 'axios'
import { config } from '../config/env.js'
import { auth } from './auth.js'

export const raw = axios.create({ baseURL: config.apiBaseUrl })
export const api = axios.create({ baseURL: config.apiBaseUrl })

api.interceptors.request.use((cfg) => {
  const token = auth.getToken()
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

let refreshing = null
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { response, config: original } = error
    if (!response) return Promise.reject(error) // network error → 無法連線到伺服器
    // 402: plan feature required → surface an upgrade banner (handled by caller)
    if (response.status === 402 && response.data?.code === 'PLAN_FEATURE_REQUIRED') {
      return Promise.reject(error)
    }
    // 401: try one refresh
    if (response.status === 401 && !original._retried && !original.url?.includes('auth/refresh')) {
      original._retried = true
      try {
        refreshing =
          refreshing ||
          raw.post('auth/refresh', { refreshToken: auth.getRefreshToken() }).then((res) => {
            auth.setTokens(res.data.token, res.data.refreshToken)
            return res.data.token
          })
        const token = await refreshing
        refreshing = null
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch (e) {
        refreshing = null
        auth.clear()
        const slug = location.pathname.split('/')[1]
        location.href = slug ? `/${slug}/sign-in` : '/sign-in'
        return Promise.reject(e)
      }
    }
    return Promise.reject(error)
  }
)

/** Endpoint paths (relative to apiBaseUrl) — the contract a self-hosted backend must serve. */
export const ENDPOINTS = {
  auth: {
    signUp: 'auth/sign-up',
    signIn: 'auth/sign-in',
    checkEmail: 'auth/check-email',
    logout: 'auth/logout',
    refresh: 'auth/refresh',
    forgotPassword: 'auth/forgot-password',
    verifyResetToken: 'auth/verify-reset-token',
    resetPassword: 'auth/reset-password',
    resendVerification: 'auth/resend-verification',
    activate: 'auth/activate',
    sendSignInLink: 'auth/send-sign-in-link',
    verifyLoginCode: 'auth/verify-login-code',
    exchangeToOrgToken: 'auth/exchange-to-org-token',
    acceptStaffInvitation: 'auth/accept-staff-invitation',
  },
  me: 'me',
  organizations: {
    create: 'organizations',
    getBySlug: (slug) => `organizations/${slug}`,
    checkSlug: 'organizations/check-slug',
    update: (id) => `organizations/${id}`,
    customerLayout: (id) => `organizations/${id}/customer-layout`,
    brandingImages: (id) => `organizations/${id}/branding-images`,
    merchantLineBindingCode: (id) => `organizations/${id}/merchant-line-binding-code`,
  },
  members: { list: 'members', invite: 'members/invite', revoke: 'members/revoke' },
  items: 'store/items',
  item: (id) => `items/${id}`,
  orders: 'orders',
  storeOrders: 'store/orders',
  customers: { lookupByPhone: 'customers/lookup-by-phone' },
  tags: 'tags',
  resourceLeaves: 'resource-leaves',
  holidays: 'holidays',
  payments: 'payments',
  waitingLists: 'me/waiting-lists',
  notifications: {
    settings: 'notification-settings',
    quota: 'notification-settings/quota',
    history: 'notification-settings/history',
    broadcasts: 'notification-broadcasts',
  },
  lineBot: {
    get: (orgId) => `line-bot?orgId=${orgId}`,
    upsert: (orgId) => `line-bot?orgId=${orgId}`,
    test: (orgId) => `line-bot/test?orgId=${orgId}`,
    sessions: (orgId) => `line-bot/sessions?orgId=${orgId}`,
  },
  paymentProviders: {
    ecpay: 'payment-providers/ecpay',
    jkopay: 'payment-providers/jkopay',
  },
  googleCalendar: {
    status: 'integrations/google-calendar/status',
    connect: 'integrations/google-calendar/connect',
    disconnect: 'integrations/google-calendar',
  },
  subscriptions: {
    me: 'subscriptions/me',
    upgrade: 'subscriptions/upgrade',
    cancel: 'subscriptions/cancel',
    payments: 'subscriptions/payments',
  },
  files: 'files',
  ai: {
    parsePricingTable: 'ai/parse-pricing-table',
    ordersReconcile: 'ai/orders-reconcile',
    chat: 'chat',
  },
}
