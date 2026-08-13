/**
 * PER-TENANT (per-vendor) settings schema.
 * ----------------------------------------
 * Every field here is customisable by each vendor in the dashboard and stored
 * server-side against their Organization. This is the multi-tenant heart of the
 * rebuild: LINE tokens, payment provider keys, booking rules, branding, etc.
 *
 * SECURITY PATTERN (mirrors production): all third-party secrets are WRITE-ONLY.
 * The API never returns the raw secret — only a `hasX` boolean and/or a masked
 * value. The client sends a blank value to mean "leave unchanged".
 */

/** Default Organization settings object (used when creating a tenant / as a form seed). */
export const defaultOrgSettings = {
  // ---- identity ----
  name: '',
  slug: '',
  contactEmail: '',
  contactPhone: '',
  description: '',
  address: '',
  addressHint: '',
  imageFileId: null,
  instagramUrl: '',
  lineUrl: '',

  // ---- per-tenant analytics (injected into the vendor's public booking page) ----
  gaMeasurementId: '', // 例：G-XXXXXXXXXX
  metaPixelId: '', // 純數字，例：1234567890123456

  // ---- booking rules ----
  requireOrderApproval: false,
  isPaymentEnabled: false,
  remittanceInfo: '',
  orderExpiryMinutes: null, // 空 = 不自動取消
  selfCancelMinutes: 720, // 顧客自行取消時限 (預設 12h)
  customerBookingWindowDays: 60, // 滾動天數
  customerBookingLeadDays: 0, // 最少提前預約天數
  customerBookingFixedStartDate: null, // 指定日期區間 (與滾動天數二選一)
  customerBookingFixedEndDate: null,
  allowCustomerPickStaff: false,
  allowCustomerPickEquipment: false,
  allowLineOnlyBooking: false,

  // ---- login ----
  isSmsLoginEnabled: true,

  // ---- LINE Login / LIFF (stored on the org; separate from the messaging bot) ----
  lineLiffId: '', // 格式如 1234567890-AbCdEfGh
  lineLoginChannelId: '', // 純數字
}

/**
 * LINE Messaging API (chatbot) config — stored via its own endpoint (line-bot),
 * NOT on the org object. Secrets are write-only (server returns has-flags and
 * masked values only).
 */
export const defaultLineBotSettings = {
  isEnabled: false,
  isFlexMenuEnabled: false, // LINE 卡片選單 (beta)
  oaBasicId: '', // LINE 官方帳號 ID / 基本 ID，例：@abc123
  channelSecret: '', // 32 字元 hex；送出空字串 = 不變更
  channelAccessToken: '', // 長字串；送出空字串 = 不變更
  // read-only, returned by GET:
  hasChannelSecret: false,
  hasChannelAccessToken: false,
  webhookUrl: '', // 伺服器產生，貼到 LINE Developers Console
}

/** Validation rules for the LINE Messaging fields (verbatim from production). */
export const lineBotValidation = {
  oaBasicId: {
    pattern: /^@?[a-zA-Z0-9._-]{4,20}$/,
    maxLength: 64,
    error: '格式應為 @abc123 或 abc123（4-20 字元，限英數、底線、連字號、點）',
  },
  channelSecret: {
    pattern: /^[a-fA-F0-9]{32}$/,
    maxLength: 128,
    error: 'Channel Secret 應為 32 字元 hex（0-9, a-f）',
  },
  channelAccessToken: {
    minLength: 100,
    error: 'Channel Access Token 看起來太短，請確認是否完整複製',
  },
  allOrNothing: '三個欄位需一起填寫或一起清空',
}

/** ECPay (綠界) payment provider — write-only keys. */
export const defaultEcpaySettings = {
  isEnabled: false,
  merchantId: '', // 商店代號 (MerchantID)，例：2000132
  hashKey: '', // 空 = 不變更
  hashIv: '', // 空 = 不變更
  hasHashKey: false,
  hasHashIv: false,
}

/** JKOPay (街口支付) payment provider — write-only keys. */
export const defaultJkopaySettings = {
  isEnabled: false,
  storeId: '', // 商店代號 (Store ID)
  apiKey: '',
  secretKey: '',
  hasApiKey: false,
  hasSecretKey: false,
}

// Only ONE online payment provider may be enabled at a time.
export const PAYMENT_PROVIDERS = ['ecpay', 'jkopay']

/** Subscription plans (name → monthly price in TWD). */
export const PLANS = {
  SOLO: { name: '個人版', monthly: 0 },
  MULTI: { name: '團隊版', monthly: 790 },
  SYSTEM: { name: '專業版', monthly: 2990 },
  UNIVERSE: { name: '企業版', monthly: 7990 },
}

/** Notification channels and event types (drives the 通知設定 page). */
export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'LINE']
export const NOTIFICATION_EVENTS = [
  'BOOKING_REMINDER',
  'ORDER_EXPIRED',
  'MANUAL_BROADCAST',
  'WAITING_SLOT_AVAILABLE',
  'BIRTHDAY',
  'ORDER_CONFIRMED_TO_CUSTOMER',
  'ORDER_CONFIRMED_TO_MERCHANT',
  'ORDER_AWAITING_CONFIRM_TO_MERCHANT',
  'LEAD_MATCHED',
  'SPLIT_INVITE',
  'LOGIN_CODE',
]
