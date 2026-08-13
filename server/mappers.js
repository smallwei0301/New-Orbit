/**
 * DB (snake_case) <-> API (camelCase) mappers.
 * The API shape is the contract the frontend already consumes, so it must not
 * change just because the storage layer moved to Postgres.
 */

const ts = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '')

export const toOrg = (r) =>
  r && {
    id: r.id,
    slug: r.slug,
    name: r.name,
    contactEmail: r.contact_email || '',
    contactPhone: r.contact_phone || '',
    description: r.description || '',
    address: r.address || '',
    addressHint: r.address_hint || '',
    instagramUrl: r.instagram_url || '',
    lineUrl: r.line_url || '',
    gaMeasurementId: r.ga_measurement_id || '',
    metaPixelId: r.meta_pixel_id || '',
    isPaymentEnabled: r.is_payment_enabled,
    requireOrderApproval: r.require_order_approval,
    remittanceInfo: r.remittance_info || '',
    orderExpiryMinutes: r.order_expiry_minutes,
    selfCancelMinutes: r.self_cancel_minutes,
    customerBookingWindowDays: r.customer_booking_window_days,
    customerBookingLeadDays: r.customer_booking_lead_days,
    customerBookingFixedStartDate: r.customer_booking_fixed_start_date,
    customerBookingFixedEndDate: r.customer_booking_fixed_end_date,
    allowCustomerPickStaff: r.allow_customer_pick_staff,
    allowCustomerPickEquipment: r.allow_customer_pick_equipment,
    allowLineOnlyBooking: r.allow_line_only_booking,
    isSmsLoginEnabled: r.is_sms_login_enabled,
    lineLiffId: r.line_liff_id || '',
    lineLoginChannelId: r.line_login_channel_id || '',
    plan: r.plan,
    planDisplayName: r.plan_display_name,
  }

export const fromOrg = (b) => {
  const out = {}
  const m = {
    name: 'name', slug: 'slug', contactEmail: 'contact_email', contactPhone: 'contact_phone',
    description: 'description', address: 'address', addressHint: 'address_hint',
    instagramUrl: 'instagram_url', lineUrl: 'line_url', gaMeasurementId: 'ga_measurement_id',
    metaPixelId: 'meta_pixel_id', isPaymentEnabled: 'is_payment_enabled',
    requireOrderApproval: 'require_order_approval', remittanceInfo: 'remittance_info',
    orderExpiryMinutes: 'order_expiry_minutes', selfCancelMinutes: 'self_cancel_minutes',
    customerBookingWindowDays: 'customer_booking_window_days',
    customerBookingLeadDays: 'customer_booking_lead_days',
    customerBookingFixedStartDate: 'customer_booking_fixed_start_date',
    customerBookingFixedEndDate: 'customer_booking_fixed_end_date',
    allowCustomerPickStaff: 'allow_customer_pick_staff',
    allowCustomerPickEquipment: 'allow_customer_pick_equipment',
    allowLineOnlyBooking: 'allow_line_only_booking',
    isSmsLoginEnabled: 'is_sms_login_enabled', lineLiffId: 'line_liff_id',
    lineLoginChannelId: 'line_login_channel_id',
  }
  for (const [k, col] of Object.entries(m)) if (b[k] !== undefined) out[col] = b[k] === '' && col.endsWith('_date') ? null : b[k]
  return out
}

export const toItem = (r) =>
  r && {
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    description: r.description || '',
    mode: r.mode,
    price: r.price,
    deposit: r.deposit,
    durationMinutes: r.duration_minutes,
    capacity: r.capacity,
    isPublished: r.is_published,
    sortOrder: r.sort_order,
    resources: (r.item_resources || []).map((ir) => ir.resources?.name).filter(Boolean),
  }

export const fromItem = (b) => {
  const out = {}
  const m = { name: 'name', description: 'description', mode: 'mode', price: 'price',
    deposit: 'deposit', durationMinutes: 'duration_minutes', capacity: 'capacity',
    isPublished: 'is_published', sortOrder: 'sort_order' }
  for (const [k, col] of Object.entries(m)) if (b[k] !== undefined) out[col] = b[k]
  return out
}

export const toResource = (r) =>
  r && {
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    type: r.type,
    capacity: r.capacity,
    staffEmail: r.staff_email,
    staffStatus: r.staff_status,
    monthlyCommission: r.monthly_commission,
  }

export const fromResource = (b) => {
  const out = {}
  const m = { name: 'name', type: 'type', capacity: 'capacity', staffEmail: 'staff_email',
    staffStatus: 'staff_status', monthlyCommission: 'monthly_commission' }
  for (const [k, col] of Object.entries(m)) if (b[k] !== undefined) out[col] = b[k]
  return out
}

export const toCustomer = (r) =>
  r && {
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    phone: r.phone || '',
    email: r.email || '',
    birthday: r.birthday || '',
    note: r.note || '',
    totalSpent: r.total_spent,
    isBlacklisted: r.is_blacklisted,
    tags: (r.customer_tags || []).map((ct) => ct.tag_id),
  }

export const fromCustomer = (b) => {
  const out = {}
  const m = { name: 'name', phone: 'phone', email: 'email', note: 'note',
    totalSpent: 'total_spent', isBlacklisted: 'is_blacklisted' }
  for (const [k, col] of Object.entries(m)) if (b[k] !== undefined) out[col] = b[k]
  if (b.birthday !== undefined) out.birthday = b.birthday || null
  return out
}

export const toOrder = (r) =>
  r && {
    id: r.id,
    orgId: r.org_id,
    itemId: r.item_id,
    itemName: r.items?.name || '',
    customerId: r.customer_id,
    customerName: r.customers?.name || '',
    customerPhone: r.customers?.phone || '',
    customerEmail: r.customers?.email || '',
    amount: r.amount,
    status: r.status,
    paymentStatus: r.payment_status,
    remittanceLast5: r.remittance_last5 || '',
    bookingAt: ts(r.booking_at),
    createdAt: ts(r.created_at),
    note: r.note || '',
  }

export const fromOrder = (b) => {
  const out = {}
  const m = { amount: 'amount', status: 'status', paymentStatus: 'payment_status',
    remittanceLast5: 'remittance_last5', note: 'note', itemId: 'item_id',
    customerId: 'customer_id' }
  for (const [k, col] of Object.entries(m)) if (b[k] !== undefined) out[col] = b[k]
  if (b.bookingAt !== undefined) out.booking_at = b.bookingAt || null
  return out
}

export const toWaitlist = (r) =>
  r && {
    id: r.id,
    orgId: r.org_id,
    itemId: r.item_id,
    itemName: r.items?.name || '(未知項目)',
    startAt: ts(r.start_at),
    capacity: r.capacity,
    waiting: r.waiting_count,
    notified: r.notified_count,
  }

export const toTag = (r) => r && { id: r.id, orgId: r.org_id, name: r.name, customerCount: r.customerCount ?? 0 }

/** LINE config — secrets are never returned, only has-flags + masks. */
export const toLineBot = (r, webhookUrl) => ({
  isEnabled: r?.is_enabled ?? false,
  isFlexMenuEnabled: r?.is_flex_menu_enabled ?? false,
  oaBasicId: r?.oa_basic_id || '',
  hasChannelSecret: !!r?.channel_secret,
  hasChannelAccessToken: !!r?.channel_access_token,
  channelSecretMasked: r?.channel_secret ? '••••••••' : '',
  channelAccessTokenMasked: r?.channel_access_token ? '••••••••' : '',
  webhookUrl,
})

/** Payment provider — same write-only treatment for keys. */
export const toPaymentProvider = (r) => ({
  isEnabled: r?.is_enabled ?? false,
  merchantId: r?.merchant_id || '',
  storeId: r?.store_id || '',
  hasHashKey: !!r?.hash_key,
  hasHashIv: !!r?.hash_iv,
  hasApiKey: !!r?.api_key,
  hasSecretKey: !!r?.secret_key,
})

export const toNotificationSetting = (r) =>
  r && {
    id: r.id,
    eventType: r.event_type,
    channel: r.channel,
    isEnabled: r.is_enabled,
    offsetMinutes: r.offset_minutes,
    subjectTemplate: r.subject_template || '',
    bodyTemplate: r.body_template || '',
  }
