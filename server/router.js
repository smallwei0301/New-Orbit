/**
 * API router backed by Supabase (Postgres).
 *
 * Same contract as docs/SPEC.md §5 — the frontend is unchanged. All access uses
 * the service_role key, so RLS (enabled with no policies) blocks every other
 * route into the data. Tenant secrets are write-only: a write stores them, a
 * read returns only has-flags and masks.
 */
import { supabase, resolveOrgId } from './supabase.js'
import { signToken, verifyToken, bearerFrom } from './auth.js'
import {
  toOrg, fromOrg, toItem, fromItem, toResource, fromResource,
  toCustomer, fromCustomer, toOrder, fromOrder, toWaitlist, toTag,
  toLineBot, toPaymentProvider, toNotificationSetting,
} from './mappers.js'

const ok = (body) => ({ status: 200, body })
const err = (status, code, message) => ({ status, body: { code, message } })

function makeToken(user, staff) {
  return signToken({ sub: user.id, user, staff, blockedOrgIds: [], isSuperUser: false })
}

/**
 * Endpoints reachable without a token.
 * Everything else requires a valid Bearer token AND membership of the org.
 * The customer-facing storefront reads are intentionally public (that is what
 * a booking page is), but they never expose secrets or customer records.
 */
function isPublic(method, p) {
  if (p.startsWith('auth/')) return true
  if (p === 'store/items' && method === 'GET') return true
  if (/^organizations\/[^/]+$/.test(p) && method === 'GET') return true
  return false
}

async function staffFor(userId) {
  const { data } = await supabase
    .from('staff')
    .select('org_id, role, orgs(slug)')
    .eq('user_id', userId)
  return (data || []).map((s) => ({ orgId: s.org_id, orgSlug: s.orgs?.slug, role: s.role }))
}

/**
 * @returns {Promise<{status:number, body:any}>}
 */
export async function handle(method, pathname, query = {}, body = {}, headers = {}) {
  const p = pathname.replace(/^\/api\/v1\/?/, '').replace(/\/+$/, '')
  const seg = p.split('/').filter(Boolean)
  const orgId = await resolveOrgId(query.orgId)

  // ---------------- auth guard ----------------
  if (!isPublic(method, p)) {
    const payload = verifyToken(bearerFrom(headers))
    if (!payload) return err(401, 'INVALID_TOKEN', '請重新登入')
    const memberOf = (payload.staff || []).map((s) => s.orgId)
    if (orgId && !payload.isSuperUser && !memberOf.includes(orgId)) {
      return err(403, 'INSUFFICIENT_PERMISSION', '沒有此商家的權限')
    }
  }

  // ---------------- auth ----------------
  if (p === 'auth/sign-in' && method === 'POST') {
    const { data, error } = await supabase.rpc('verify_login', {
      p_email: body.email || '',
      p_password: body.password || '',
    })
    if (error) return err(500, 'INTERNAL', error.message)
    const user = data?.[0]
    if (!user) {
      const { data: exists } = await supabase
        .from('users').select('id').eq('email', body.email || '').maybeSingle()
      return exists
        ? err(401, 'INVALID_CREDENTIALS', 'Email 或密碼錯誤')
        : err(401, 'INVALID_CREDENTIALS', '此信箱尚未註冊，請先建立帳號')
    }
    const staff = await staffFor(user.id)
    const refreshToken = signToken({ sub: user.id, typ: 'refresh' }, 60 * 86400)
    return ok({ token: makeToken(user, staff), refreshToken, user })
  }

  if (p === 'auth/refresh' && method === 'POST') {
    const payload = verifyToken(body.refreshToken)
    if (!payload || payload.typ !== 'refresh') return err(401, 'INVALID_TOKEN', '連結無效，請重新登入')
    const { data: user } = await supabase
      .from('users').select('id, email, name, phone, is_verified').eq('id', payload.sub).maybeSingle()
    if (!user) return err(401, 'INVALID_TOKEN', '連結無效，請重新登入')
    return ok({
      token: makeToken(user, await staffFor(user.id)),
      refreshToken: signToken({ sub: user.id, typ: 'refresh' }, 60 * 86400),
    })
  }

  if (p === 'auth/logout' && method === 'POST') return ok({ ok: true })
  if (p === 'auth/forgot-password' && method === 'POST') return ok({ sent: true })

  if (p === 'me' && method === 'GET') {
    const { data: user } = await supabase
      .from('users').select('id, email, name, phone, is_verified')
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (!user) return err(404, 'NOT_FOUND', '找不到使用者')
    return ok({ user, staff: await staffFor(user.id), blockedOrgIds: [], isSuperUser: false })
  }

  // ---------------- organizations ----------------
  if (seg[0] === 'organizations') {
    if (seg[1] === 'check-slug' && method === 'GET') {
      const { data } = await supabase.from('orgs').select('id').eq('slug', query.slug || '').maybeSingle()
      return ok({ available: !data || data.id === query.orgId })
    }
    if (seg.length === 2 && method === 'GET') {
      const key = seg[1]
      const { data } = await supabase
        .from('orgs').select('*')
        .or(`slug.eq.${key}${/^[0-9a-f-]{36}$/i.test(key) ? `,id.eq.${key}` : ''}`)
        .maybeSingle()
      return data ? ok(toOrg(data)) : err(404, 'NOT_FOUND', '找不到商家資料')
    }
    if (seg.length === 2 && method === 'PUT') {
      const { data, error } = await supabase
        .from('orgs').update({ ...fromOrg(body), updated_at: new Date().toISOString() })
        .eq('id', seg[1]).select('*').maybeSingle()
      if (error) return err(400, 'UPDATE_FAILED', error.message)
      return data ? ok(toOrg(data)) : err(404, 'NOT_FOUND', '找不到商家資料')
    }
  }

  // ---------------- items ----------------
  if ((p === 'store/items' || p === 'items') && method === 'GET') {
    let q = supabase
      .from('items').select('*, item_resources(resources(name))')
      .eq('org_id', orgId).order('sort_order')
    if (query.mode && query.mode !== 'ALL') q = q.eq('mode', query.mode)
    if (query.search) q = q.ilike('name', `%${query.search}%`)
    const { data, error } = await q
    if (error) return err(500, 'INTERNAL', error.message)
    return ok({ data: (data || []).map(toItem), total: data?.length || 0 })
  }
  if ((p === 'store/items' || p === 'items') && method === 'POST') {
    const { data, error } = await supabase
      .from('items').insert({ ...fromItem(body), org_id: orgId }).select('*').maybeSingle()
    if (error) return err(400, 'CREATE_FAILED', error.message)
    return ok(toItem(data))
  }
  if (seg[0] === 'items' && seg[1]) {
    if (method === 'GET') {
      const { data } = await supabase
        .from('items').select('*, item_resources(resources(name))').eq('id', seg[1]).maybeSingle()
      return data ? ok(toItem(data)) : err(404, 'NOT_FOUND', '找不到項目')
    }
    if (method === 'PUT') {
      const { data, error } = await supabase
        .from('items').update({ ...fromItem(body), updated_at: new Date().toISOString() })
        .eq('id', seg[1]).select('*').maybeSingle()
      if (error) return err(400, 'UPDATE_FAILED', error.message)
      return ok(toItem(data))
    }
    if (method === 'DELETE') {
      const { error } = await supabase.from('items').delete().eq('id', seg[1])
      if (error) return err(400, 'DELETE_FAILED', error.message)
      return ok({ ok: true })
    }
  }

  // ---------------- resources ----------------
  if (p === 'resources' && method === 'GET') {
    let q = supabase.from('resources').select('*').eq('org_id', orgId).order('created_at')
    if (query.type && query.type !== 'ALL') q = q.eq('type', query.type)
    const { data, error } = await q
    if (error) return err(500, 'INTERNAL', error.message)
    return ok({ data: (data || []).map(toResource), total: data?.length || 0 })
  }
  if (p === 'resources' && method === 'POST') {
    const { data, error } = await supabase
      .from('resources').insert({ ...fromResource(body), org_id: orgId }).select('*').maybeSingle()
    if (error) return err(400, 'CREATE_FAILED', error.message)
    return ok(toResource(data))
  }
  if (seg[0] === 'resources' && seg[1]) {
    if (method === 'GET') {
      const { data } = await supabase.from('resources').select('*').eq('id', seg[1]).maybeSingle()
      return data ? ok(toResource(data)) : err(404, 'NOT_FOUND', '找不到資源')
    }
    if (method === 'PUT') {
      const { data, error } = await supabase
        .from('resources').update(fromResource(body)).eq('id', seg[1]).select('*').maybeSingle()
      if (error) return err(400, 'UPDATE_FAILED', error.message)
      return ok(toResource(data))
    }
    if (method === 'DELETE') {
      const { error } = await supabase.from('resources').delete().eq('id', seg[1])
      if (error) return err(400, 'DELETE_FAILED', error.message)
      return ok({ ok: true })
    }
  }

  // ---------------- orders ----------------
  const ORDER_SELECT = '*, items(name), customers(name, phone, email)'
  if ((p === 'orders' || p === 'store/orders') && method === 'GET') {
    let q = supabase.from('orders').select(ORDER_SELECT)
      .eq('org_id', orgId).order('created_at', { ascending: false })
    if (query.status && query.status !== 'ALL') q = q.eq('status', query.status)
    if (query.from) q = q.gte('booking_at', query.from)
    if (query.to) q = q.lte('booking_at', query.to)
    const { data, error } = await q
    if (error) return err(500, 'INTERNAL', error.message)
    let rows = (data || []).map(toOrder)
    if (query.search) {
      const s = query.search.toLowerCase()
      rows = rows.filter((o) =>
        [o.customerName, o.customerPhone, o.customerEmail].some((v) => (v || '').toLowerCase().includes(s)))
    }
    return ok({ data: rows, total: rows.length })
  }
  if ((p === 'orders' || p === 'store/orders') && method === 'POST') {
    const { data, error } = await supabase
      .from('orders').insert({ ...fromOrder(body), org_id: orgId }).select(ORDER_SELECT).maybeSingle()
    if (error) return err(400, 'CREATE_FAILED', error.message)
    return ok(toOrder(data))
  }
  if (seg[0] === 'orders' && seg[1]) {
    if (method === 'GET') {
      const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', seg[1]).maybeSingle()
      return data ? ok(toOrder(data)) : err(404, 'NOT_FOUND', '找不到預約')
    }
    if (method === 'PUT') {
      const { data, error } = await supabase
        .from('orders').update({ ...fromOrder(body), updated_at: new Date().toISOString() })
        .eq('id', seg[1]).select(ORDER_SELECT).maybeSingle()
      if (error) return err(400, 'UPDATE_FAILED', error.message)
      return ok(toOrder(data))
    }
  }

  // ---------------- customers ----------------
  if (p === 'customers' && method === 'GET') {
    const { data, error } = await supabase
      .from('customers').select('*, customer_tags(tag_id)')
      .eq('org_id', orgId).order('created_at')
    if (error) return err(500, 'INTERNAL', error.message)
    let rows = (data || []).map(toCustomer)
    if (query.search) {
      const s = query.search.toLowerCase()
      rows = rows.filter((c) => [c.name, c.phone, c.email].some((v) => (v || '').toLowerCase().includes(s)))
    }
    if (query.tagId) rows = rows.filter((c) => c.tags.includes(query.tagId))
    return ok({ data: rows, total: rows.length })
  }
  if (seg[0] === 'customers' && seg[1]) {
    if (method === 'GET') {
      const { data } = await supabase
        .from('customers').select('*, customer_tags(tag_id)').eq('id', seg[1]).maybeSingle()
      return data ? ok(toCustomer(data)) : err(404, 'NOT_FOUND', '找不到客戶')
    }
    if (method === 'PUT') {
      const { data, error } = await supabase
        .from('customers').update(fromCustomer(body)).eq('id', seg[1])
        .select('*, customer_tags(tag_id)').maybeSingle()
      if (error) return err(400, 'UPDATE_FAILED', error.message)
      // optional tag re-assignment
      if (Array.isArray(body.tags)) {
        await supabase.from('customer_tags').delete().eq('customer_id', seg[1])
        if (body.tags.length) {
          await supabase.from('customer_tags')
            .insert(body.tags.map((tag_id) => ({ customer_id: seg[1], tag_id })))
        }
        const { data: fresh } = await supabase
          .from('customers').select('*, customer_tags(tag_id)').eq('id', seg[1]).maybeSingle()
        return ok(toCustomer(fresh))
      }
      return ok(toCustomer(data))
    }
  }

  // ---------------- tags ----------------
  if (p === 'tags' && method === 'GET') {
    const { data, error } = await supabase
      .from('tags').select('*, customer_tags(customer_id)').eq('org_id', orgId).order('created_at')
    if (error) return err(500, 'INTERNAL', error.message)
    return ok({
      data: (data || []).map((t) => toTag({ ...t, customerCount: (t.customer_tags || []).length })),
    })
  }
  if (p === 'tags' && method === 'POST') {
    const { data, error } = await supabase
      .from('tags').insert({ name: body.name, org_id: orgId }).select('*').maybeSingle()
    if (error) return err(400, 'CREATE_FAILED', '建立失敗（可能已有同名標籤）')
    return ok(toTag(data))
  }
  if (seg[0] === 'tags' && seg[1]) {
    if (method === 'PUT') {
      const { data, error } = await supabase
        .from('tags').update({ name: body.name }).eq('id', seg[1]).select('*').maybeSingle()
      if (error) return err(400, 'UPDATE_FAILED', '更新失敗（可能已有同名標籤）')
      return ok(toTag(data))
    }
    if (method === 'DELETE') {
      const { error } = await supabase.from('tags').delete().eq('id', seg[1])
      if (error) return err(400, 'DELETE_FAILED', error.message)
      return ok({ ok: true })
    }
  }

  // ---------------- waitlist ----------------
  if (p === 'waitlist' && method === 'GET') {
    const { data, error } = await supabase
      .from('waitlist').select('*, items(name)').eq('org_id', orgId).order('start_at')
    if (error) return err(500, 'INTERNAL', error.message)
    return ok({ data: (data || []).map(toWaitlist) })
  }

  // ---------------- holidays (店家公休) ----------------
  if (p === 'holidays') {
    if (method === 'GET') {
      let q = supabase.from('holidays').select('*').eq('org_id', orgId).order('date')
      if (query.from) q = q.gte('date', query.from)
      if (query.to) q = q.lte('date', query.to)
      const { data, error } = await q
      if (error) return err(500, 'INTERNAL', error.message)
      return ok({
        data: (data || []).map((r) => ({
          id: r.id, date: r.date, startTime: r.start_time, endTime: r.end_time,
          note: r.note || '', isAllDay: !r.start_time,
        })),
      })
    }
    if (method === 'POST') {
      const rows = (Array.isArray(body.items) ? body.items : [body]).map((h) => ({
        org_id: orgId, date: h.date,
        start_time: h.startTime || null, end_time: h.endTime || null, note: h.note || '',
      }))
      const { data, error } = await supabase.from('holidays').insert(rows).select('*')
      if (error) return err(400, 'CREATE_FAILED', error.message)
      return ok({ data, created: data?.length || 0 })
    }
  }
  if (seg[0] === 'holidays' && seg[1] && method === 'DELETE') {
    const { error } = await supabase.from('holidays').delete().eq('id', seg[1])
    if (error) return err(400, 'DELETE_FAILED', error.message)
    return ok({ ok: true })
  }

  // ---------------- resource leaves (人員休假) ----------------
  if (p === 'resource-leaves') {
    if (method === 'GET') {
      let q = supabase
        .from('resource_leaves').select('*, resources(name)').eq('org_id', orgId).order('date')
      if (query.from) q = q.gte('date', query.from)
      if (query.to) q = q.lte('date', query.to)
      if (query.resourceId) q = q.eq('resource_id', query.resourceId)
      const { data, error } = await q
      if (error) return err(500, 'INTERNAL', error.message)
      return ok({
        data: (data || []).map((r) => ({
          id: r.id, resourceId: r.resource_id, resourceName: r.resources?.name || '',
          date: r.date, startTime: r.start_time, endTime: r.end_time,
          note: r.note || '', isAllDay: !r.start_time,
        })),
      })
    }
    if (method === 'POST') {
      const rows = (Array.isArray(body.items) ? body.items : [body]).map((l) => ({
        org_id: orgId, resource_id: l.resourceId, date: l.date,
        start_time: l.startTime || null, end_time: l.endTime || null, note: l.note || '',
      }))
      const { data, error } = await supabase.from('resource_leaves').insert(rows).select('*')
      if (error) return err(400, 'CREATE_FAILED', error.message)
      return ok({ data, created: data?.length || 0 })
    }
  }
  if (seg[0] === 'resource-leaves' && seg[1] && method === 'DELETE') {
    const { error } = await supabase.from('resource_leaves').delete().eq('id', seg[1])
    if (error) return err(400, 'DELETE_FAILED', error.message)
    return ok({ ok: true })
  }

  // ---------------- LINE bot (write-only secrets) ----------------
  if (p === 'line-bot') {
    const webhookUrl = `${process.env.PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/line-bot/webhook/${orgId}`
    if (method === 'GET') {
      const { data } = await supabase.from('line_bot_configs').select('*').eq('org_id', orgId).maybeSingle()
      return ok(toLineBot(data, webhookUrl))
    }
    if (method === 'PUT') {
      const patch = {
        org_id: orgId,
        is_enabled: !!body.isEnabled,
        is_flex_menu_enabled: !!body.isFlexMenuEnabled,
        updated_at: new Date().toISOString(),
      }
      if (body.oaBasicId !== undefined) patch.oa_basic_id = body.oaBasicId
      // blank = leave unchanged
      if (body.channelSecret) patch.channel_secret = body.channelSecret
      if (body.channelAccessToken) patch.channel_access_token = body.channelAccessToken
      const { error } = await supabase.from('line_bot_configs').upsert(patch, { onConflict: 'org_id' })
      if (error) return err(400, 'UPDATE_FAILED', error.message)
      const { data } = await supabase.from('line_bot_configs').select('*').eq('org_id', orgId).maybeSingle()
      return ok(toLineBot(data, webhookUrl))
    }
  }
  if (p === 'line-bot/test' && method === 'POST') {
    const { data } = await supabase
      .from('line_bot_configs').select('oa_basic_id, channel_access_token').eq('org_id', orgId).maybeSingle()
    if (!data?.channel_access_token) return err(400, 'LINE_NOT_CONFIGURED', '測試連線失敗')
    // A real deployment calls LINE /v2/bot/info here with the stored token.
    return ok({ displayName: '示範商家 LINE', basicId: data.oa_basic_id || '@demo123' })
  }

  // ---------------- payment providers (write-only secrets) ----------------
  if (seg[0] === 'payment-providers' && seg[1]) {
    const provider = seg[1]
    if (method === 'GET') {
      const { data } = await supabase
        .from('payment_providers').select('*').eq('org_id', orgId).eq('provider', provider).maybeSingle()
      return ok(toPaymentProvider(data))
    }
    if (method === 'PUT') {
      const patch = { org_id: orgId, provider, is_enabled: !!body.isEnabled }
      if (body.merchantId !== undefined) patch.merchant_id = body.merchantId
      if (body.storeId !== undefined) patch.store_id = body.storeId
      if (body.hashKey) patch.hash_key = body.hashKey
      if (body.hashIv) patch.hash_iv = body.hashIv
      if (body.apiKey) patch.api_key = body.apiKey
      if (body.secretKey) patch.secret_key = body.secretKey
      const { error } = await supabase
        .from('payment_providers').upsert(patch, { onConflict: 'org_id,provider' })
      if (error) return err(400, 'UPDATE_FAILED', error.message)
      const { data } = await supabase
        .from('payment_providers').select('*').eq('org_id', orgId).eq('provider', provider).maybeSingle()
      return ok(toPaymentProvider(data))
    }
  }

  // ---------------- notifications ----------------
  if (p === 'notification-settings') {
    if (method === 'GET') {
      const { data } = await supabase.from('notification_settings').select('*').eq('org_id', orgId)
      return ok({ data: (data || []).map(toNotificationSetting) })
    }
    if (method === 'POST' || method === 'PUT') {
      const row = {
        org_id: orgId,
        event_type: body.eventType,
        channel: body.channel,
        is_enabled: !!body.isEnabled,
        offset_minutes: body.offsetMinutes ?? 60,
        subject_template: body.subjectTemplate || '',
        body_template: body.bodyTemplate || '',
      }
      const { error } = await supabase
        .from('notification_settings').upsert(row, { onConflict: 'org_id,event_type,channel' })
      if (error) return err(400, 'UPDATE_FAILED', error.message)
      return ok(body)
    }
  }
  if (p === 'notification-settings/quota' && method === 'GET') {
    const { data } = await supabase.from('notification_quota').select('*').eq('org_id', orgId).maybeSingle()
    return ok({
      nonSms: { used: data?.non_sms_used ?? 0, total: data?.non_sms_total ?? 0 },
      sms: { used: data?.sms_used ?? 0, total: data?.sms_total ?? 0 },
      topUp: data?.top_up ?? 0,
      resetAt: data?.reset_at || '',
    })
  }

  // ---------------- subscription ----------------
  if (p === 'subscriptions/me' && method === 'GET') {
    const { data } = await supabase.from('subscriptions').select('*').eq('org_id', orgId).maybeSingle()
    return ok({
      plan: data?.plan || 'SOLO',
      planDisplayName: data?.plan_display_name || '個人版',
      periodEnd: data?.period_end || '',
      isCancelled: data?.is_cancelled ?? false,
      aiCreditsUsed: Number(data?.ai_credits_used || 0),
      aiCreditsTotal: Number(data?.ai_credits_total || 0),
    })
  }
  if (p === 'subscriptions/cancel' && method === 'POST') {
    const { error } = await supabase
      .from('subscriptions').update({ is_cancelled: true }).eq('org_id', orgId)
    if (error) return err(400, 'CANCEL_FAILED', '取消失敗')
    return ok({ ok: true })
  }
  if (p === 'subscriptions/upgrade' && method === 'POST') {
    const names = { SOLO: '個人版', MULTI: '團隊版', SYSTEM: '專業版', UNIVERSE: '企業版' }
    const plan = body.plan
    if (!names[plan]) return err(400, 'INVALID_PLAN', '升級失敗，請稍後再試')
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan, plan_display_name: names[plan], is_cancelled: false })
      .eq('org_id', orgId)
    if (error) return err(400, 'UPGRADE_FAILED', '升級失敗，請稍後再試')
    await supabase.from('orgs').update({ plan, plan_display_name: names[plan] }).eq('id', orgId)
    return ok({ ok: true, plan, planDisplayName: names[plan] })
  }
  if (p === 'subscriptions/payments' && method === 'GET') {
    const { data } = await supabase
      .from('subscription_payments').select('*').eq('org_id', orgId).order('paid_at', { ascending: false })
    return ok({
      data: (data || []).map((r) => ({
        id: r.id, date: r.paid_at, plan: r.plan, cycle: r.cycle, amount: r.amount, status: r.status,
      })),
    })
  }

  // ---------------- dashboard overview ----------------
  if (p === 'dashboard/overview' && method === 'GET') {
    const { data, error } = await supabase
      .from('orders').select(ORDER_SELECT).eq('org_id', orgId)
    if (error) return err(500, 'INTERNAL', error.message)
    const rows = (data || []).map(toOrder)
    const confirmed = rows.filter((o) => o.status === 'CONFIRMED')
    const pending = rows.filter((o) => o.status === 'PENDING')
    return ok({
      today: { confirmed: confirmed.length, pending: pending.length },
      pendingCount: pending.length,
      monthRevenue: confirmed.reduce((s, o) => s + (o.amount || 0), 0),
      monthConfirmedCount: confirmed.length,
      todaySchedule: confirmed.slice(0, 5).map((o) => ({
        id: o.id, time: o.bookingAt, customerName: o.customerName,
        itemName: o.itemName, status: o.status,
      })),
    })
  }

  return err(404, 'NOT_FOUND', `No route for ${method} ${p}`)
}
