/**
 * Domain services — thin wrappers over the axios instance in api.js.
 * Pages should call these rather than axios directly, so swapping the
 * backend or changing an endpoint only touches this file + ENDPOINTS.
 */
import { api, raw, ENDPOINTS } from './api.js'

const data = (p) => p.then((r) => r.data)
/** Unwrap `{ data: [...] }` list envelopes into a plain array. */
const list = (p) => p.then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || []))

export const authService = {
  signIn: (email, password) => data(raw.post(ENDPOINTS.auth.signIn, { email, password })),
  signUp: (payload) => data(raw.post(ENDPOINTS.auth.signUp, payload)),
  forgotPassword: (email) => data(raw.post(ENDPOINTS.auth.forgotPassword, { email })),
  me: () => data(api.get(ENDPOINTS.me)),
  logout: () => data(api.post(ENDPOINTS.auth.logout, {})),
}

export const orgService = {
  getBySlug: (slug) => data(api.get(ENDPOINTS.organizations.getBySlug(slug))),
  update: (id, payload) => data(api.put(ENDPOINTS.organizations.update(id), payload)),
  checkSlug: (slug, orgId) => data(api.get(ENDPOINTS.organizations.checkSlug, { params: { slug, orgId } })),
}

export const itemService = {
  list: (params) => list(api.get(ENDPOINTS.items, { params })),
  get: (id) => data(api.get(ENDPOINTS.item(id))),
  create: (payload) => data(api.post(ENDPOINTS.items, payload)),
  update: (id, payload) => data(api.put(ENDPOINTS.item(id), payload)),
  remove: (id) => data(api.delete(ENDPOINTS.item(id))),
}

export const resourceService = {
  list: (params) => list(api.get('resources', { params })),
  get: (id) => data(api.get(`resources/${id}`)),
  create: (payload) => data(api.post('resources', payload)),
  update: (id, payload) => data(api.put(`resources/${id}`, payload)),
  remove: (id) => data(api.delete(`resources/${id}`)),
}

export const orderService = {
  list: (params) => list(api.get(ENDPOINTS.orders, { params })),
  get: (id) => data(api.get(`orders/${id}`)),
  update: (id, payload) => data(api.put(`orders/${id}`, payload)),
}

export const customerService = {
  list: (params) => list(api.get('customers', { params })),
  get: (id) => data(api.get(`customers/${id}`)),
  update: (id, payload) => data(api.put(`customers/${id}`, payload)),
}

export const tagService = {
  list: (params) => list(api.get(ENDPOINTS.tags, { params })),
  create: (payload) => data(api.post(ENDPOINTS.tags, payload)),
  update: (id, payload) => data(api.put(`tags/${id}`, payload)),
  remove: (id) => data(api.delete(`tags/${id}`)),
}

export const waitlistService = {
  list: (params) => list(api.get('waitlist', { params })),
}

/** 店家公休日。POST accepts one object or `{ items: [...] }` for batch. */
export const holidayService = {
  list: (params) => list(api.get('holidays', { params })),
  create: (payload, params) => data(api.post('holidays', payload, { params })),
  remove: (id) => data(api.delete(`holidays/${id}`)),
}

/** 人員/資源休假。Same batch-friendly POST shape. */
export const resourceLeaveService = {
  list: (params) => list(api.get('resource-leaves', { params })),
  create: (payload, params) => data(api.post('resource-leaves', payload, { params })),
  remove: (id) => data(api.delete(`resource-leaves/${id}`)),
}

export const lineBotService = {
  get: (orgId) => data(api.get('line-bot', { params: { orgId } })),
  upsert: (orgId, payload) => data(api.put('line-bot', payload, { params: { orgId } })),
  test: (orgId) => data(api.post('line-bot/test', {}, { params: { orgId } })),
}

export const paymentProviderService = {
  get: (provider) => data(api.get(`payment-providers/${provider}`)),
  upsert: (provider, payload) => data(api.put(`payment-providers/${provider}`, payload)),
}

export const notificationService = {
  list: (params) => list(api.get(ENDPOINTS.notifications.settings, { params })),
  save: (payload) => data(api.post(ENDPOINTS.notifications.settings, payload)),
  quota: (params) => data(api.get(ENDPOINTS.notifications.quota, { params })),
}

export const subscriptionService = {
  me: (params) => data(api.get(ENDPOINTS.subscriptions.me, { params })),
  payments: (params) => list(api.get(ENDPOINTS.subscriptions.payments, { params })),
  cancel: (params) => data(api.post(ENDPOINTS.subscriptions.cancel, {}, { params })),
  upgrade: (plan, params) => data(api.post(ENDPOINTS.subscriptions.upgrade, { plan }, { params })),
}

export const dashboardService = {
  overview: (params) => data(api.get('dashboard/overview', { params })),
}
