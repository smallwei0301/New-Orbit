import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, PageHeader, Badge, Field, Input, Toggle } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { notificationService } from '../../lib/services.js'
import { useApi, useMutation, errorMessage } from '../../lib/useApi.js'

/**
 * 通知設定 — Notification Settings.
 * Event list + editor + broadcast-confirm flow described in docs/UI-COPY.md #16.
 * Saved settings + quota are fetched from the API; per-event defaults below
 * are the fallback used until a row has actually been saved for that event.
 */

const CONTENT_PLACEHOLDER =
  '親愛的 {{客戶名稱}}，您的預約 {{服務名稱}} 將於 {{預約時間}} 開始，請準時參加。'

const EVENT_TYPES = [
  {
    id: 'BOOKING_REMINDER',
    label: '預約提醒',
    desc: '預約前自動提醒客戶，減少爽約',
    audience: 'customer',
    timing: 'minutesBeforeStart',
    placeholders: ['{{客戶名稱}}', '{{服務名稱}}', '{{預約時間}}', '{{商家名稱}}'],
    subjectPlaceholder: '例：{{商家名稱}} 預約提醒 - {{服務名稱}}',
    defaultSubject: '【{{商家名稱}}】預約提醒：{{服務名稱}}',
    defaultBody:
      '親愛的 {{客戶名稱}}，您好：\n\n提醒您預約的「{{服務名稱}}」將於 {{預約時間}} 開始，記得準時前來。\n\n期待與您相見！\n— {{商家名稱}}',
  },
  {
    id: 'ORDER_EXPIRED',
    label: '預約逾時提醒',
    desc: '未付款超時自動催繳，提升收款率',
    audience: 'customer',
    timing: 'minutesBeforeExpiry',
    placeholders: ['{{客戶名稱}}', '{{服務名稱}}', '{{預約時間}}', '{{商家名稱}}'],
    subjectPlaceholder: '例：{{商家名稱}} 預約提醒 - {{服務名稱}}',
    defaultSubject: '【{{商家名稱}}】預約尚未完成付款',
    defaultBody:
      '親愛的 {{客戶名稱}}，您好：\n\n您預約的「{{服務名稱}}」（{{預約時間}}）尚未完成付款，請盡快完成付款以保留名額，逾時預約將自動取消。\n— {{商家名稱}}',
  },
  {
    id: 'MANUAL_BROADCAST',
    label: '手動廣播',
    desc: '手動推播公告給所有客戶',
    audience: 'customer',
    timing: 'none',
    broadcast: true,
    placeholders: ['{{客戶名稱}}', '{{商家名稱}}'],
    subjectPlaceholder: '例：{{商家名稱}} 公告通知',
    defaultSubject: '【{{商家名稱}}】最新消息',
    defaultBody: '親愛的 {{客戶名稱}}，您好：\n\n（請在此填寫您要公告的內容）\n— {{商家名稱}}',
  },
  {
    id: 'WAITING_SLOT_AVAILABLE',
    label: '候補名額釋出',
    desc: '有人取消釋出名額時通知候補名單',
    audience: 'customer',
    timing: 'none',
    placeholders: ['{{客戶名稱}}', '{{項目名稱}}', '{{確認期限}}', '{{商家名稱}}'],
    subjectPlaceholder: '例：{{商家名稱}} 預約提醒 - {{服務名稱}}',
    defaultSubject: '【{{商家名稱}}】{{項目名稱}} 有名額釋出！',
    defaultBody:
      '親愛的 {{客戶名稱}}，您好：\n\n您候補中的「{{項目名稱}}」剛剛有名額釋出，請於 {{確認期限}} 前至「我的預約 → 候補」頁面確認報名，逾時將自動遞補給下一位。\n期待與您相見！\n— {{商家名稱}}',
  },
  {
    id: 'BIRTHDAY',
    label: '生日祝福',
    desc: '每天 09:00 自動寄送生日祝福，可設定提前幾天發送',
    audience: 'customer',
    timing: 'daysBefore',
    placeholders: ['{{客戶名稱}}', '{{商家名稱}}'],
    subjectPlaceholder: '例：{{商家名稱}} 公告通知',
    defaultSubject: '【{{商家名稱}}】生日快樂！',
    defaultBody: '親愛的 {{客戶名稱}}，生日快樂！\n\n感謝您一直以來的支持，祝您生日愉快。\n— {{商家名稱}}',
  },
  {
    id: 'ORDER_CONFIRMED_TO_CUSTOMER',
    label: '預約確認 — 通知客人',
    desc: '預約轉為「已確認」時自動通知客人',
    audience: 'customer',
    timing: 'none',
    placeholders: ['{{客戶名稱}}', '{{預約明細}}', '{{服務名稱}}', '{{預約時間}}', '{{商家名稱}}'],
    subjectPlaceholder: '例：{{商家名稱}} 預約提醒 - {{服務名稱}}',
    defaultSubject: '【{{商家名稱}}】您的預約已確認',
    defaultBody: '您好，您在「{{商家名稱}}」的預約已確認：\n{{預約明細}}\n如需更改請聯絡商家。',
  },
  {
    id: 'ORDER_CONFIRMED_TO_MERCHANT',
    label: '預約確認 — 通知商家',
    desc: '預約轉為「已確認」時通知商家聯絡 Email / 電話 / LINE',
    audience: 'merchant',
    timing: 'none',
    placeholders: [
      '{{客戶名稱}}',
      '{{預約明細}}',
      '{{服務名稱}}',
      '{{預約時間}}',
      '{{商家名稱}}',
      '{{客戶電話}}',
      '{{後台連結}}',
    ],
    subjectPlaceholder: '例：{{商家名稱}} 公告通知',
    defaultSubject: '新預約已確認',
    defaultBody: '客戶 {{客戶名稱}} 的預約已確認：\n{{預約明細}}\n聯絡電話：{{客戶電話}}',
  },
  {
    id: 'ORDER_AWAITING_CONFIRM_TO_MERCHANT',
    label: '預約待確認 — 通知商家',
    desc: '客人填入匯款後五碼時通知商家進後台確認',
    audience: 'merchant',
    timing: 'none',
    placeholders: [
      '{{客戶名稱}}',
      '{{預約明細}}',
      '{{服務名稱}}',
      '{{預約時間}}',
      '{{商家名稱}}',
      '{{客戶電話}}',
      '{{後台連結}}',
    ],
    subjectPlaceholder: '例：{{商家名稱}} 公告通知',
    defaultSubject: '有預約等待確認匯款',
    defaultBody:
      '客戶 {{客戶名稱}} 已填寫匯款帳號後五碼，請至後台核對並確認預約：\n{{預約明細}}\n聯絡電話：{{客戶電話}}\n前往後台確認：{{後台連結}}',
  },
  {
    id: 'LEAD_MATCHED',
    label: '潛在客戶通知 — 通知商家',
    desc: '社群貼文命中你設定的關鍵字時通知你（客戶開發）',
    audience: 'merchant',
    timing: 'none',
    placeholders: ['{{關鍵字}}', '{{貼文內容}}', '{{貼文連結}}', '{{發文者}}', '{{商家名稱}}'],
    subjectPlaceholder: '例：{{商家名稱}} 公告通知',
    defaultSubject: '【{{商家名稱}}】有人在找你的服務：{{關鍵字}}',
    defaultBody:
      '有人在 Threads 上提到「{{關鍵字}}」：\n{{發文者}}\n{{貼文內容}}\n貼文連結：{{貼文連結}}\n想接觸的話，建議直接在貼文下留言或私訊。',
  },
  {
    id: 'SPLIT_INVITE',
    label: '揪團邀請',
    desc: '在預約管理把座位分享連結發給同行者（手動觸發）',
    audience: 'customer',
    timing: 'none',
    placeholders: ['{{商家名稱}}', '{{服務名稱}}', '{{預約時間}}', '{{揪團連結}}'],
    subjectPlaceholder: '例：{{商家名稱}} 預約提醒 - {{服務名稱}}',
    defaultSubject: '揪團邀請 — {{服務名稱}}',
    defaultBody:
      '您好！「{{商家名稱}}」邀請您加入揪團預約：{{服務名稱}} {{預約時間}}。\n請點擊以下連結加入並完成付款：\n{{揪團連結}}',
  },
  {
    id: 'LOGIN_HISTORY',
    label: '登入紀錄',
    desc: '顧客 / 員工以簡訊驗證碼或 Email 連結登入的紀錄（計入通知額度）',
    audience: 'customer',
    timing: 'none',
    logOnly: true,
    placeholders: [],
  },
]

function defaultSettingsFor(event) {
  const base = {
    enabled: event.id !== 'LEAD_MATCHED',
    channels: { email: true, sms: false, line: false },
    advanceValue: event.timing === 'daysBefore' ? 0 : event.timing === 'minutesBeforeExpiry' ? 10 : 60,
    subject: event.defaultSubject || '',
    body: event.defaultBody || '',
  }
  if (event.id === 'BOOKING_REMINDER') base.channels = { email: true, sms: false, line: true }
  if (event.id === 'ORDER_EXPIRED') base.channels = { email: true, sms: true, line: false }
  if (event.id === 'MANUAL_BROADCAST') base.channels = { email: true, sms: false, line: true }
  if (event.id === 'WAITING_SLOT_AVAILABLE') base.channels = { email: true, sms: true, line: true }
  if (event.id === 'BIRTHDAY') base.channels = { email: false, sms: false, line: true }
  if (event.id === 'SPLIT_INVITE') base.channels = { email: false, sms: false, line: true }
  if (event.id === 'LOGIN_HISTORY') base.channels = { email: true, sms: true, line: false }
  return base
}

/** Merge saved API rows (one per channel) for an event into the editor shape, filling gaps with defaults. */
function settingsFromRows(event, rows) {
  const base = defaultSettingsFor(event)
  const channels = { email: false, sms: false, line: false }
  const channelKey = { EMAIL: 'email', SMS: 'sms', LINE: 'line' }
  let enabled = false
  let advanceValue = base.advanceValue
  let subject = base.subject
  let body = base.body
  rows.forEach((row) => {
    const key = channelKey[row.channel]
    if (!key) return
    channels[key] = true
    if (row.isEnabled) enabled = true
    if (row.offsetMinutes != null) advanceValue = row.offsetMinutes
    if (row.subjectTemplate) subject = row.subjectTemplate
    if (row.bodyTemplate) body = row.bodyTemplate
  })
  return { enabled, channels, advanceValue, subject, body }
}

function formatDuration(mins) {
  const m = Math.max(0, mins)
  if (m < 60) return `${m} 分鐘`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} 小時` : `${h} 小時 ${r} 分鐘`
}

function nextResetDate() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `${next.getFullYear()}/${String(next.getMonth() + 1).padStart(2, '0')}/${String(next.getDate()).padStart(2, '0')}`
}

/** Format the quota `resetAt` from the API; falls back to the 1st of next month. */
function formatResetDate(resetAt) {
  if (!resetAt) return nextResetDate()
  const d = new Date(resetAt)
  if (Number.isNaN(d.getTime())) return nextResetDate()
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function pct(used, total) {
  if (!total) return 0
  return Math.min(100, Math.max(0, (used / total) * 100))
}

const PAYMENT_EXPIRY_MINUTES = 60
const DAILY_BROADCAST_LIMIT = 3
const MOCK_CUSTOMER_COUNT = 86

export default function Notifications() {
  const { orgSlug } = useParams()

  const { data: quota, loading: quotaLoading } = useApi(
    () => notificationService.quota({ orgId: orgSlug }),
    [orgSlug]
  )
  const { data: settingsRows, reload: reloadSettings } = useApi(
    () => notificationService.list({ orgId: orgSlug }),
    [orgSlug],
    { fallback: [] }
  )

  // Saved settings per event, seeded from the API rows and falling back to the
  // hard-coded defaults above for events that were never saved yet.
  const savedMap = useMemo(() => {
    const rowsByEvent = {}
    ;(settingsRows || []).forEach((row) => {
      if (!rowsByEvent[row.eventType]) rowsByEvent[row.eventType] = []
      rowsByEvent[row.eventType].push(row)
    })
    const map = {}
    EVENT_TYPES.forEach((e) => {
      const rows = rowsByEvent[e.id]
      map[e.id] = rows && rows.length > 0 ? settingsFromRows(e, rows) : defaultSettingsFor(e)
    })
    return map
  }, [settingsRows])

  const [selectedId, setSelectedId] = useState(EVENT_TYPES[0].id)
  const [pendingSelectId, setPendingSelectId] = useState(null)
  // Only events the user has actually touched get an entry here; everything
  // else reads straight from savedMap.
  const [draft, setDraft] = useState({})
  const [toast, setToast] = useState(null)

  // Merchant/customer contact prerequisites (mocked) — drive channel disable reasons.
  const [prereq, setPrereq] = useState({
    lineBotConfigured: true,
    merchantLineBound: false,
    merchantEmailConfigured: true,
    merchantPhoneConfigured: false,
  })

  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false)
  const [broadcastState, setBroadcastState] = useState(null) // { sent, failed, total }
  const [broadcastCountToday, setBroadcastCountToday] = useState(0)

  const [topupModal, setTopupModal] = useState(null) // 'sms' | 'ai' | null

  const toastTimer = useRef(null)
  const broadcastTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (broadcastTimer.current) clearInterval(broadcastTimer.current)
    }
  }, [])

  const showToast = (message) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }

  const event = useMemo(() => EVENT_TYPES.find((e) => e.id === selectedId), [selectedId])
  const current = draft[selectedId] || savedMap[selectedId]
  const dirty = draft[selectedId]
    ? JSON.stringify(draft[selectedId]) !== JSON.stringify(savedMap[selectedId])
    : false

  const updateCurrent = (patch) => {
    setDraft((d) => ({ ...d, [selectedId]: { ...(d[selectedId] || savedMap[selectedId]), ...patch } }))
  }
  const updateChannel = (key, value) => {
    updateCurrent({ channels: { ...current.channels, [key]: value } })
  }

  const requestSelect = (id) => {
    if (id === selectedId) return
    if (dirty) {
      setPendingSelectId(id)
    } else {
      setSelectedId(id)
    }
  }
  const discardAndSwitch = () => {
    setDraft((d) => {
      const next = { ...d }
      delete next[selectedId]
      return next
    })
    setSelectedId(pendingSelectId)
    setPendingSelectId(null)
  }
  const keepEditing = () => setPendingSelectId(null)

  const channelDisableReason = (channelKey) => {
    if (event.audience === 'customer' && channelKey === 'line' && !prereq.lineBotConfigured) {
      return '尚未設定 LINE Bot，請至「LINE 整合」頁面完成設定後啟用'
    }
    if (event.audience === 'merchant') {
      if (channelKey === 'line' && !prereq.merchantLineBound) {
        return '尚未綁定商家 LINE 通知帳號，請點下方「綁定 LINE」完成綁定'
      }
      if (channelKey === 'email' && !prereq.merchantEmailConfigured) {
        return '尚未設定商家聯絡 Email，請至「商家設定」填寫後啟用'
      }
      if (channelKey === 'sms' && !prereq.merchantPhoneConfigured) {
        return '尚未設定商家聯絡電話，請至「商家設定」填寫後啟用'
      }
    }
    return null
  }

  const validateCurrent = () => {
    if (event.logOnly) return true
    if ((event.timing === 'minutesBeforeStart' || event.timing === 'minutesBeforeExpiry') && current.advanceValue < 1) {
      showToast('請填寫發送時間，至少 1 分鐘')
      return false
    }
    if (!current.body.trim()) {
      showToast('通知內容不可為空，請輸入要發送的訊息')
      return false
    }
    return true
  }

  const { run: runSave, saving } = useMutation(async () => {
    const channelsToSave = ['email', 'sms', 'line'].filter((k) => current.channels[k])
    await Promise.all(
      channelsToSave.map((k) =>
        notificationService.save({
          eventType: selectedId,
          channel: k.toUpperCase(),
          isEnabled: current.enabled,
          offsetMinutes: event.logOnly || event.timing === 'none' ? null : current.advanceValue,
          subjectTemplate: current.subject,
          bodyTemplate: current.body,
        })
      )
    )
  })

  const handleSave = async () => {
    if (!validateCurrent()) return
    try {
      await runSave()
      reloadSettings()
      showToast('已儲存')
    } catch (e) {
      showToast(`儲存失敗：${errorMessage(e)}`)
    }
  }

  const bindMerchantLine = () => {
    setPrereq((p) => ({ ...p, merchantLineBound: true }))
    showToast('已儲存')
  }

  const channelsActiveCount = Object.entries(current.channels).filter(
    ([k, v]) => v && !channelDisableReason(k)
  ).length

  const openBroadcastConfirm = () => {
    if (channelsActiveCount === 0) {
      showToast('廣播發送失敗，請檢查通知管道設定')
      return
    }
    if (broadcastCountToday >= DAILY_BROADCAST_LIMIT) {
      showToast('今日廣播次數已達上限（每日最多 3 次）')
      return
    }
    setShowBroadcastConfirm(true)
  }

  const runBroadcast = () => {
    const total = MOCK_CUSTOMER_COUNT
    const willFail = Math.max(0, Math.round(total * 0.04))
    setBroadcastState({ sent: 0, failed: 0, total })
    let sent = 0
    let failed = 0
    broadcastTimer.current = setInterval(() => {
      const chunk = Math.max(1, Math.round(total / 12))
      const remaining = total - sent - failed
      const step = Math.min(chunk, remaining)
      const failStep = failed < willFail ? Math.min(step, willFail - failed) : 0
      failed += failStep
      sent += step - failStep
      setBroadcastState({ sent, failed, total })
      if (sent + failed >= total) {
        clearInterval(broadcastTimer.current)
        broadcastTimer.current = null
        setBroadcastCountToday((c) => c + 1)
        setTimeout(() => {
          setShowBroadcastConfirm(false)
          setBroadcastState(null)
          showToast(`廣播發送完成，共發送 ${sent} 封`)
        }, 500)
      }
    }, 220)
  }

  const smsCharCount = current.body.length

  return (
    <div>
      <PageHeader
        title="通知設定"
        subtitle="設定自動通知規則，自訂發送時機與訊息內容"
        actions={<Button onClick={handleSave}>{saving ? '儲存中...' : '儲存設定'}</Button>}
      />

      {/* Quota cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-orbit-400">本月非簡訊通知額度</div>
          {quotaLoading ? (
            <div className="mt-2 text-sm text-orbit-400">載入中...</div>
          ) : (
            <>
              <div className="mt-2 font-serif text-2xl font-semibold text-orbit-900">
                {(quota?.nonSms?.used ?? 0).toLocaleString()} / {(quota?.nonSms?.total ?? 0).toLocaleString()}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-orbit-warm">
                <div
                  className="h-full rounded-full bg-orbit-primary"
                  style={{ width: `${pct(quota?.nonSms?.used ?? 0, quota?.nonSms?.total ?? 0)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-orbit-400">下次 reset：{formatResetDate(quota?.resetAt)}</div>
            </>
          )}
        </Card>
        <Card>
          <div className="text-sm text-orbit-400">本月簡訊通知額度</div>
          {quotaLoading ? (
            <div className="mt-2 text-sm text-orbit-400">載入中...</div>
          ) : (
            <>
              <div className="mt-2 font-serif text-2xl font-semibold text-orbit-900">
                {(quota?.sms?.used ?? 0).toLocaleString()} / {(quota?.sms?.total ?? 0).toLocaleString()}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-orbit-warm">
                <div
                  className="h-full rounded-full bg-orbit-primary"
                  style={{ width: `${pct(quota?.sms?.used ?? 0, quota?.sms?.total ?? 0)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-orbit-400">下次 reset：{formatResetDate(quota?.resetAt)}</div>
            </>
          )}
        </Card>
        <Card>
          <div className="text-sm text-orbit-400">加購額度</div>
          <div className="mt-2 font-serif text-2xl font-semibold text-orbit-900">
            {quotaLoading ? '載入中...' : quota?.topUp ?? 0}
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="text-xs" onClick={() => setTopupModal('sms')}>
              加購簡訊額度
            </Button>
            <Button variant="outline" className="text-xs" onClick={() => setTopupModal('ai')}>
              加購 AI 額度
            </Button>
          </div>
        </Card>
      </div>

      {/* Event list + editor */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="p-2">
          <div className="space-y-1">
            {EVENT_TYPES.map((e) => {
              const active = e.id === selectedId
              const isDirtyForThis = draft[e.id]
                ? JSON.stringify(draft[e.id]) !== JSON.stringify(savedMap[e.id])
                : false
              return (
                <button
                  key={e.id}
                  onClick={() => requestSelect(e.id)}
                  className={clsx(
                    'block w-full rounded-xl px-3 py-2.5 text-left transition-colors',
                    active ? 'bg-orbit-primary text-white' : 'hover:bg-orbit-warm'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={clsx('text-sm font-medium', active ? 'text-white' : 'text-orbit-900')}>
                      {e.label}
                    </span>
                    {isDirtyForThis && (
                      <span
                        className={clsx(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[10px]',
                          active ? 'bg-white/20 text-white' : 'bg-orbit-danger/10 text-orbit-danger'
                        )}
                      >
                        尚未儲存
                      </span>
                    )}
                  </div>
                  <div className={clsx('mt-0.5 text-xs leading-relaxed', active ? 'text-white/80' : 'text-orbit-400')}>
                    {e.desc}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-orbit-900">{event.label}</h3>
              <p className="mt-0.5 text-xs text-orbit-400">{event.desc}</p>
            </div>
            <Badge tone={current.enabled ? 'success' : 'default'}>{current.enabled ? '啟用' : '停用'}</Badge>
          </div>

          <div className="space-y-6">
            <Toggle
              checked={current.enabled}
              onChange={(v) => updateCurrent({ enabled: v })}
              label={current.enabled ? '啟用' : '停用'}
              hint="記得儲存"
            />

            {event.logOnly ? (
              <div className="rounded-xl bg-orbit-info-bg p-4 text-xs leading-relaxed text-orbit-500">
                {event.desc}
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-2 text-sm font-medium text-orbit-700">
                    通知管道 <span className="font-normal text-orbit-400">（可複選）</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      ['email', 'Email'],
                      ['sms', '簡訊'],
                      ['line', 'LINE'],
                    ].map(([key, label]) => {
                      const reason = channelDisableReason(key)
                      const disabled = Boolean(reason)
                      return (
                        <div
                          key={key}
                          className={clsx(
                            'rounded-xl border p-3',
                            disabled ? 'border-orbit-border bg-orbit-warm/50' : 'border-orbit-border bg-white'
                          )}
                        >
                          <label className={clsx('flex items-center gap-2', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
                            <input
                              type="checkbox"
                              checked={current.channels[key] && !disabled}
                              disabled={disabled}
                              onChange={(e) => updateChannel(key, e.target.checked)}
                              className="h-4 w-4 rounded border-orbit-border text-orbit-primary focus:ring-orbit-primary/30"
                            />
                            <span className="text-sm text-orbit-700">{label}</span>
                          </label>
                          {reason && (
                            <p className="mt-1.5 text-[11px] leading-relaxed text-orbit-danger">{reason}</p>
                          )}
                          {reason && key === 'line' && event.audience === 'merchant' && (
                            <Button variant="outline" className="mt-2 w-full text-xs" onClick={bindMerchantLine}>
                              綁定 LINE 通知帳號
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {event.timing === 'daysBefore' && (
                  <Field label="提前幾天發送" hint="0 = 生日當天發送；填 7 則於生日前 7 天發送。">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={current.advanceValue}
                        onChange={(e) => updateCurrent({ advanceValue: Number(e.target.value) })}
                        className="max-w-[120px]"
                      />
                      <span className="text-sm text-orbit-400">天前</span>
                    </div>
                  </Field>
                )}

                {event.timing === 'minutesBeforeStart' && (
                  <Field label="預約開始前多久發送">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={current.advanceValue}
                        onChange={(e) => updateCurrent({ advanceValue: Number(e.target.value) })}
                        className="max-w-[120px]"
                      />
                      <span className="text-sm text-orbit-400">分鐘</span>
                    </div>
                  </Field>
                )}

                {event.timing === 'minutesBeforeExpiry' && (
                  <Field
                    label="預約過期前多久發送提醒"
                    hint={`建立預約後 ${formatDuration(PAYMENT_EXPIRY_MINUTES - current.advanceValue)} 發送通知`}
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={current.advanceValue}
                        onChange={(e) => updateCurrent({ advanceValue: Number(e.target.value) })}
                        className="max-w-[120px]"
                      />
                      <span className="text-sm text-orbit-400">分鐘</span>
                    </div>
                  </Field>
                )}

                <Field label="郵件主旨">
                  <Input
                    value={current.subject}
                    onChange={(e) => updateCurrent({ subject: e.target.value })}
                    placeholder={event.subjectPlaceholder}
                  />
                </Field>

                <Field
                  label="通知內容"
                  hint={`簡訊約 ${smsCharCount} 字 = ${smsCharCount} 則（超過 1 則，會多計額度）`}
                >
                  <textarea
                    value={current.body}
                    onChange={(e) => updateCurrent({ body: e.target.value })}
                    placeholder={CONTENT_PLACEHOLDER}
                    rows={6}
                    className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                  />
                </Field>

                {event.placeholders.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-medium text-orbit-500">可用變數</div>
                    <div className="flex flex-wrap gap-2">
                      {event.placeholders.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateCurrent({ body: current.body + p })}
                          className="rounded-full bg-orbit-warm px-2.5 py-1 text-xs text-orbit-500 hover:bg-orbit-border/60"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-orbit-border pt-4">
              {dirty && <span className="text-xs text-orbit-danger">尚未儲存</span>}
              <div className="ml-auto flex gap-2">
                {event.broadcast && (
                  <Button variant="outline" onClick={openBroadcastConfirm}>
                    立即發送廣播
                  </Button>
                )}
                <Button onClick={handleSave}>{saving ? '儲存中...' : '儲存'}</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Unsaved-changes confirm */}
      {pendingSelectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-orbit-900">尚未儲存</h3>
            <p className="mt-2 text-sm text-orbit-500">你有尚未儲存的修改，離開後變更將會遺失。</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={keepEditing}>
                繼續編輯
              </Button>
              <Button variant="danger" onClick={discardAndSwitch}>
                捨棄變更
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast confirm modal */}
      {showBroadcastConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-orbit-900">確認發送廣播</h3>
            <p className="mt-2 text-sm text-orbit-500">此操作會立即發送通知給所有客戶，無法撤回</p>

            <div className="mt-4 space-y-3 rounded-xl bg-orbit-warm p-4 text-sm">
              <div>
                <div className="text-xs text-orbit-400">通知管道</div>
                <div className="mt-1 flex gap-1.5">
                  {[
                    ['email', 'Email'],
                    ['sms', '簡訊'],
                    ['line', 'LINE'],
                  ]
                    .filter(([k]) => current.channels[k] && !channelDisableReason(k))
                    .map(([k, label]) => (
                      <Badge key={k} tone="info">
                        {label}
                      </Badge>
                    ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-orbit-400">郵件主旨</div>
                <div className="mt-1 text-orbit-700">{current.subject || '（未填寫）'}</div>
              </div>
              <div>
                <div className="text-xs text-orbit-400">通知內容</div>
                <div className="mt-1 whitespace-pre-wrap text-orbit-700">{current.body || '（未填寫）'}</div>
              </div>
            </div>

            {broadcastState && (
              <div className="mt-4">
                <div className="mb-1.5 text-xs text-orbit-400">
                  發送中 {broadcastState.sent}（失敗 {broadcastState.failed}）/{broadcastState.total}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-orbit-warm">
                  <div
                    className="h-full rounded-full bg-orbit-primary transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        ((broadcastState.sent + broadcastState.failed) / broadcastState.total) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={Boolean(broadcastState)}
                onClick={() => setShowBroadcastConfirm(false)}
              >
                取消
              </Button>
              <Button disabled={Boolean(broadcastState)} onClick={runBroadcast}>
                {broadcastState ? '發送中...' : '確認發送'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top-up modal */}
      {topupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-orbit-900">
              {topupModal === 'sms' ? '加購簡訊額度' : '加購 AI 額度'}
            </h3>
            <p className="mt-2 text-sm text-orbit-500">
              {topupModal === 'sms'
                ? '簡訊通知一則 NT$3。本月簡訊額度用完後，可透過官方 LINE 聯繫我們，由專人為您加值。'
                : 'AI 額度每 100 萬 credits NT$100。本月額度用完後，可透過官方 LINE 聯繫我們，由專人為您加值。'}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTopupModal(null)}>
                取消
              </Button>
              <Button onClick={() => setTopupModal(null)}>前往 LINE 聯繫</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-orbit-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
