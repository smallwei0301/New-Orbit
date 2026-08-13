/**
 * Customer-facing booking flow (顧客端預約流程).
 * A stepper wizard: 指定人員/設備 → 選擇時段 → 預約資訊 → 確認預約資訊 → 預約已提交.
 * Everything here is mock data driven by local `step` state — there is no
 * backend wired up yet. An 身份驗證 modal can be triggered from step 3.
 */
import { useEffect, useState } from 'react'
import { Button, Card, Badge, Field, Input } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { useParams, useNavigate, Link } from 'react-router-dom'

const STEP_STAFF = 'staff'
const STEP_SLOT = 'slot'
const STEP_INFO = 'info'
const STEP_CONFIRM = 'confirm'
const STEP_SUCCESS = 'success'

const STEP_ORDER = [STEP_STAFF, STEP_SLOT, STEP_INFO, STEP_CONFIRM]
const STEP_LABELS = {
  [STEP_STAFF]: '指定人員 / 設備',
  [STEP_SLOT]: '選擇時段',
  [STEP_INFO]: '預約資訊',
  [STEP_CONFIRM]: '確認預約',
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const MAX_SLOTS = 3
const TIME_SLOTS = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '19:00']

const BUSINESS_HOURS = [
  { days: '一至五', times: '09:00–18:00' },
  { days: '六', times: '10:00–16:00' },
  { days: '日', times: '公休' },
]

const STAFF_LIST = [
  { id: 'staff-amy', name: 'Amy 美容師' },
  { id: 'staff-ben', name: 'Ben 美容師' },
  { id: 'staff-cindy', name: 'Cindy 美容師' },
]

const EQUIPMENT_LIST = [
  { id: 'eq-bed-a', name: '美容床 A' },
  { id: 'eq-bed-b', name: '美容床 B' },
]

const ITEM = {
  name: '深層潔顏護理 60 分鐘',
  duration: 60,
  deposit: 500,
  fullPrice: 1200,
  isGroup: true,
  groupSize: 3,
  isPackage: true,
  packageIncludes: [
    { name: '臉部深層清潔', duration: 60, price: 1200, qty: 1 },
    { name: '肩頸舒壓按摩', duration: 30, price: 800, qty: 1 },
  ],
}

const ADDON_LIST = [
  { id: 'addon-scrub', name: '深層去角質', extraMinutes: 15, price: 300 },
  { id: 'addon-stone', name: '熱石舒緩', extraMinutes: 20, price: 500 },
  { id: 'addon-eye', name: '眼部護理', extraMinutes: 10, price: 200 },
]

const TODAY = new Date(2026, 7, 5) // mock "now" — 2026-08-05（三）

function buildWeek(base) {
  const days = []
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push(d)
  }
  return days
}

function formatDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function weekdayLabel(d) {
  return WEEKDAY_LABELS[d.getDay()]
}

function slotKey(date, time) {
  return `${date.toDateString()}_${time}`
}

function getSlotsForDate(date) {
  const weekday = date.getDay()
  if (weekday === 0) return [] // 公休
  return TIME_SLOTS.map((time, idx) => {
    if (time === '19:00') return { time, status: 'outside' }
    const seed = (date.getDate() + idx) % 6
    if (seed === 0) return { time, status: 'full' }
    if (seed === 3) return { time, status: 'booked' }
    return { time, status: 'available' }
  })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^09\d{8}$/

export default function BookingFlow() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(STEP_STAFF)
  const [toast, setToast] = useState('')

  // Step 1 — 指定人員/設備
  const [staffMode, setStaffMode] = useState('none') // 'staff' | 'equipment' | 'none'
  const [staffId, setStaffId] = useState(null)

  // Step 2 — 選擇時段
  const week = buildWeek(TODAY)
  const [selectedDate, setSelectedDate] = useState(week[0])
  const [selectedSlots, setSelectedSlots] = useState([])
  const [addonQty, setAddonQty] = useState({})

  // Step 3 — 預約資訊
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    note: '',
    birthday: '',
  })
  const [errors, setErrors] = useState({})

  // Step 4 — 確認預約資訊
  const [paymentMethod, setPaymentMethod] = useState('later') // 'jkopay' | 'card' | 'later'
  const [submitting, setSubmitting] = useState(false)

  // 身份驗證 modal
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyStage, setVerifyStage] = useState('contact') // 'contact' | 'code'
  const [verifyContact, setVerifyContact] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifySending, setVerifySending] = useState(false)
  const [verifyChecking, setVerifyChecking] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [verifyCountdown, setVerifyCountdown] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (verifyCountdown <= 0) return undefined
    const t = setTimeout(() => setVerifyCountdown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [verifyCountdown])

  const stepIndex = STEP_ORDER.indexOf(step)

  const goBack = () => {
    if (step === STEP_SUCCESS) return
    if (stepIndex <= 0) {
      navigate(`/${orgSlug}`)
      return
    }
    setStep(STEP_ORDER[stepIndex - 1])
  }

  const handleClose = () => {
    navigate(`/${orgSlug}`)
  }

  const addonMinutes = ADDON_LIST.reduce(
    (sum, a) => sum + (addonQty[a.id] || 0) * a.extraMinutes,
    0
  )
  const addonTotal = ADDON_LIST.reduce(
    (sum, a) => sum + (addonQty[a.id] || 0) * a.price,
    0
  )
  const selectedAddons = ADDON_LIST.filter((a) => (addonQty[a.id] || 0) > 0)
  const totalDuration = ITEM.duration + addonMinutes

  const setAddonCount = (id, delta) => {
    setAddonQty((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      return { ...prev, [id]: next }
    })
  }

  const toggleSlot = (date, time, status) => {
    if (status === 'booked') return
    if (status === 'full') {
      setToast('已加入候補')
      return
    }
    const key = slotKey(date, time)
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => slotKey(s.date, s.time) === key)
      if (exists) return prev.filter((s) => slotKey(s.date, s.time) !== key)
      if (prev.length >= MAX_SLOTS) {
        setToast(`最多只能選 ${MAX_SLOTS} 個時段`)
        return prev
      }
      return [...prev, { date, time, status }]
    })
  }

  const removeSlot = (date, time) => {
    setSelectedSlots((prev) => prev.filter((s) => slotKey(s.date, s.time) !== slotKey(date, time)))
  }

  const hasOutsideHoursSelected = selectedSlots.some((s) => s.status === 'outside')

  const slotConfirmHint = () => {
    if (!selectedDate) return '請先選擇預約日期'
    if (selectedSlots.length === 0) return '請選擇預約時間'
    return null
  }

  const handleSlotConfirm = () => {
    const hint = slotConfirmHint()
    if (hint) {
      setToast(selectedSlots.length === 0 ? '請至少選擇一個時段' : '請選擇預約日期和時間')
      return
    }
    setStep(STEP_INFO)
  }

  const validateInfo = () => {
    const e = {}
    if (!customer.name.trim()) e.name = '請填寫姓名'
    if (customer.email && !EMAIL_RE.test(customer.email)) e.email = 'Email 格式不正確'
    if (!customer.phone.trim()) e.phone = '請填寫手機號碼'
    else if (!PHONE_RE.test(customer.phone.trim()))
      e.phone = '請輸入有效的手機號碼（09 開頭，共 10 碼）'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleInfoNext = () => {
    if (!validateInfo()) return
    setStep(STEP_CONFIRM)
  }

  const handleSubmitBooking = () => {
    setSubmitting(true)
    const delay = paymentMethod === 'later' ? 700 : 900
    setTimeout(() => {
      setSubmitting(false)
      setStep(STEP_SUCCESS)
    }, delay)
  }

  const openVerify = () => {
    setVerifyOpen(true)
    setVerifyStage('contact')
    setVerifyError('')
    setVerifyCode('')
  }

  const closeVerify = () => setVerifyOpen(false)

  const handleSendCode = () => {
    if (!verifyContact.trim()) {
      setVerifyError('請輸入 Email 或手機號碼')
      return
    }
    setVerifyError('')
    setVerifySending(true)
    setTimeout(() => {
      setVerifySending(false)
      setVerifyStage('code')
      setVerifyCountdown(60)
    }, 700)
  }

  const handleCheckCode = () => {
    if (!verifyCode.trim()) return
    setVerifyChecking(true)
    setTimeout(() => {
      setVerifyChecking(false)
      setCustomer((prev) => ({
        ...prev,
        phone: PHONE_RE.test(verifyContact) ? verifyContact : prev.phone,
        email: EMAIL_RE.test(verifyContact) ? verifyContact : prev.email,
      }))
      setVerifyOpen(false)
      setToast('身份驗證成功，已帶入資料')
    }, 700)
  }

  const perPerson = Math.round(ITEM.fullPrice / ITEM.groupSize)
  const depositAmount = ITEM.deposit
  const submitLabel = submitting
    ? paymentMethod === 'later'
      ? '預約提交中...'
      : '前往付款中...'
    : '確認並送出預約'

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-orbit-400">
        載入中...
      </div>
    )
  }

  return (
    <div>
      {/* Wizard shell header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {step !== STEP_SUCCESS && (
            <button
              type="button"
              aria-label="返回上一步"
              onClick={goBack}
              className="grid h-8 w-8 place-items-center rounded-full bg-orbit-warm text-orbit-500 hover:bg-orbit-primary hover:text-white"
            >
              ‹
            </button>
          )}
          <h1 className="font-serif text-xl font-semibold text-orbit-900">預約流程</h1>
        </div>
        {step !== STEP_SUCCESS && (
          <button
            type="button"
            aria-label="關閉預約"
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-full text-orbit-400 hover:bg-orbit-warm hover:text-orbit-700"
          >
            ×
          </button>
        )}
      </div>

      {/* Step indicator */}
      {step !== STEP_SUCCESS && (
        <div className="mb-6 flex items-center gap-2">
          {STEP_ORDER.map((key, idx) => (
            <div key={key} className="flex flex-1 items-center gap-2">
              <div
                className={clsx(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-medium',
                  idx < stepIndex && 'bg-orbit-primary text-white',
                  idx === stepIndex && 'bg-orbit-primary text-white',
                  idx > stepIndex && 'bg-orbit-warm text-orbit-400'
                )}
              >
                {idx + 1}
              </div>
              <span
                className={clsx(
                  'hidden text-xs sm:inline',
                  idx === stepIndex ? 'text-orbit-900' : 'text-orbit-400'
                )}
              >
                {STEP_LABELS[key]}
              </span>
              {idx < STEP_ORDER.length - 1 && (
                <div className="h-px flex-1 bg-orbit-border" />
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="mb-4 rounded-xl bg-orbit-info-bg px-4 py-2 text-sm text-orbit-700">
          {toast}
        </div>
      )}

      {/* Step 1: 指定人員 / 設備 */}
      {step === STEP_STAFF && (
        <Card>
          <h2 className="font-medium text-orbit-900">指定人員 / 設備</h2>
          <p className="mt-1 text-xs text-orbit-400">
            可指定特定人員 / 設備，或交由系統自動安排
          </p>

          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium text-orbit-700">服務人員</div>
              <div className="flex flex-wrap gap-2">
                {STAFF_LIST.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setStaffMode('staff')
                      setStaffId(s.id)
                    }}
                    className={clsx(
                      'rounded-full px-4 py-1.5 text-sm',
                      staffMode === 'staff' && staffId === s.id
                        ? 'bg-orbit-primary text-white'
                        : 'bg-orbit-warm text-orbit-500'
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-orbit-700">設備 / 場地</div>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_LIST.map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => {
                      setStaffMode('equipment')
                      setStaffId(eq.id)
                    }}
                    className={clsx(
                      'rounded-full px-4 py-1.5 text-sm',
                      staffMode === 'equipment' && staffId === eq.id
                        ? 'bg-orbit-primary text-white'
                        : 'bg-orbit-warm text-orbit-500'
                    )}
                  >
                    {eq.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStaffMode('none')
                setStaffId(null)
              }}
              className={clsx(
                'w-full rounded-xl border px-4 py-2.5 text-left text-sm',
                staffMode === 'none'
                  ? 'border-orbit-primary bg-orbit-warm text-orbit-900'
                  : 'border-orbit-border text-orbit-500'
              )}
            >
              不指定（系統自動安排）
            </button>
          </div>

          <div className="mt-6 flex justify-between gap-3">
            <Button variant="outline" onClick={goBack}>
              返回
            </Button>
            <Button variant="primary" onClick={() => setStep(STEP_SLOT)}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: 選擇時段 */}
      {step === STEP_SLOT && (
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-orbit-900">營業時間</h2>
            </div>
            <div className="space-y-1">
              {BUSINESS_HOURS.map((b) => (
                <div key={b.days} className="text-xs text-orbit-500">
                  週{b.days} {b.times}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {week.map((d) => {
                const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString()
                return (
                  <button
                    key={d.toDateString()}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={clsx(
                      'flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-xs',
                      isSelected ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
                    )}
                  >
                    <span>{formatDate(d)}</span>
                    <span>週{weekdayLabel(d)}</span>
                  </button>
                )
              })}
            </div>

            {selectedDate ? (
              <div>
                <div className="mb-2 text-xs text-orbit-400">
                  {formatDate(selectedDate)} 星期{weekdayLabel(selectedDate)}
                </div>
                {getSlotsForDate(selectedDate).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-orbit-border p-6 text-center text-sm text-orbit-400">
                    此日期沒有可用時段
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {getSlotsForDate(selectedDate).map((slot) => {
                        const key = slotKey(selectedDate, slot.time)
                        const isSelected = selectedSlots.some(
                          (s) => slotKey(s.date, s.time) === key
                        )
                        let title = ''
                        if (slot.status === 'full')
                          title = staffId
                            ? '指定的人員 / 設備此時段已滿，可改選其他人員或不指定'
                            : '此時段已額滿，點擊加入候補'
                        else if (slot.status === 'booked') title = '已被預約'
                        else if (slot.status === 'outside') title = '營業時間外，仍可代客建立'

                        return (
                          <button
                            key={slot.time}
                            type="button"
                            title={title}
                            disabled={slot.status === 'booked'}
                            onClick={() => toggleSlot(selectedDate, slot.time, slot.status)}
                            className={clsx(
                              'rounded-full border px-3.5 py-1.5 text-sm',
                              slot.status === 'booked' &&
                                'cursor-not-allowed border-orbit-border bg-orbit-warm text-orbit-300 line-through',
                              slot.status === 'full' &&
                                'border-orbit-danger/30 bg-orbit-danger/10 text-orbit-danger',
                              slot.status === 'outside' &&
                                !isSelected &&
                                'border-dashed border-orbit-border text-orbit-400',
                              slot.status === 'available' &&
                                !isSelected &&
                                'border-orbit-border text-orbit-700',
                              isSelected &&
                                slot.status !== 'booked' &&
                                'border-orbit-primary bg-orbit-primary text-white'
                            )}
                          >
                            {slot.status === 'full' ? `${slot.time}・候補` : slot.time}
                          </button>
                        )
                      })}
                    </div>
                    {selectedSlots.length === 0 && (
                      <p className="mt-2 text-xs text-orbit-400">
                        {formatDate(selectedDate)}，請選擇預約時間
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-orbit-400">請先選擇預約日期</p>
            )}

            {hasOutsideHoursSelected && (
              <p className="mt-3 rounded-xl bg-orbit-info-bg p-3 text-xs text-orbit-500">
                注意：已選時段為營業時間外。仍可照常建立預約，請自行確認能提供服務。
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 font-medium text-orbit-900">
              加購項目（選填，會延長預約時長）
            </h2>
            <div className="mt-3 space-y-3">
              {ADDON_LIST.map((a) => {
                const qty = addonQty[a.id] || 0
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-orbit-900">{a.name}</div>
                      <div className="text-xs text-orbit-400">
                        +{a.extraMinutes} 分 · NT$ {a.price}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="減少數量"
                        onClick={() => setAddonCount(a.id, -1)}
                        className="grid h-7 w-7 place-items-center rounded-full bg-orbit-warm text-orbit-500"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm text-orbit-900">{qty}</span>
                      <button
                        type="button"
                        aria-label="增加數量"
                        onClick={() => setAddonCount(a.id, 1)}
                        className="grid h-7 w-7 place-items-center rounded-full bg-orbit-warm text-orbit-500"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-xs text-orbit-400">
              {totalDuration} 分鐘
              {addonMinutes > 0 && `（含加購共 ${totalDuration} 分鐘）`}
            </p>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-orbit-900">已選時段（{selectedSlots.length}）</h2>
              <span className="text-xs text-orbit-400">
                {selectedSlots.length > 0
                  ? `已選 ${selectedSlots.length} / ${MAX_SLOTS} 個時段`
                  : `請選擇時段（最多 ${MAX_SLOTS}）`}
              </span>
            </div>
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-orbit-400">請選擇至少一個時段</p>
            ) : (
              <div className="space-y-2">
                {selectedSlots.map((s) => (
                  <div
                    key={slotKey(s.date, s.time)}
                    className="flex items-center justify-between rounded-xl bg-orbit-warm px-3.5 py-2"
                  >
                    <span className="text-sm text-orbit-900">
                      {formatDate(s.date)}（{weekdayLabel(s.date)}） {s.time}
                    </span>
                    <button
                      type="button"
                      aria-label="移除此時段"
                      onClick={() => removeSlot(s.date, s.time)}
                      className="text-orbit-400 hover:text-orbit-danger"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-between gap-3">
              <Button variant="outline" onClick={goBack}>
                返回
              </Button>
              <Button variant="primary" onClick={handleSlotConfirm}>
                {selectedSlots.length > 1 ? '確認所選時段' : '確認日期與時間'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: 預約資訊 */}
      {step === STEP_INFO && (
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-medium text-orbit-900">預約資訊</h2>
            <Button variant="ghost" className="text-xs" onClick={openVerify}>
              身份驗證
            </Button>
          </div>
          <p className="mb-5 text-xs text-orbit-400">請確認您的資料</p>

          <div className="space-y-4">
            <Field label="姓名" hint={errors.name}>
              <Input
                value={customer.name}
                placeholder="請輸入姓名"
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
              />
            </Field>
            <Field label="Email (選填)" hint={errors.email}>
              <Input
                value={customer.email}
                placeholder="請輸入 Email"
                onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
              />
            </Field>
            <Field label="手機號碼" hint={errors.phone}>
              <Input
                value={customer.phone}
                placeholder="09xxxxxxxx"
                maxLength={10}
                onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
              />
            </Field>
            <Field label="備註">
              <textarea
                value={customer.note}
                onChange={(e) => setCustomer((c) => ({ ...c, note: e.target.value }))}
                placeholder="如有特殊需求或備註事項，請在此填寫"
                rows={3}
                className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              />
            </Field>
            <Field label="生日 (選填)" hint="填寫後無法修改">
              <Input
                type="date"
                value={customer.birthday}
                disabled={!!customer.birthday}
                onChange={(e) => setCustomer((c) => ({ ...c, birthday: e.target.value }))}
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-between gap-3">
            <Button variant="outline" onClick={goBack}>
              返回
            </Button>
            <Button variant="primary" onClick={handleInfoNext}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: 確認預約資訊 */}
      {step === STEP_CONFIRM && (
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-orbit-900">確認預約資訊</h2>
            <p className="mt-1 text-xs text-orbit-400">請確認以下資訊無誤後送出預約</p>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-orbit-900">預約項目</h3>
              <div className="flex gap-1.5">
                {ITEM.isPackage && <Badge tone="info">套票</Badge>}
                {ITEM.isGroup && <Badge>揪團</Badge>}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-orbit-400">項目名稱</div>
              <div className="text-sm text-orbit-900">{ITEM.name}</div>
            </div>

            <div className="mt-4 space-y-1">
              <div className="text-sm text-orbit-400">
                預約時間（{selectedSlots.length}）
              </div>
              <div className="space-y-1">
                {selectedSlots.map((s) => (
                  <div key={slotKey(s.date, s.time)} className="text-sm text-orbit-900">
                    {formatDate(s.date)}（{weekdayLabel(s.date)}） {s.time}
                  </div>
                ))}
              </div>
            </div>

            {ITEM.isGroup && (
              <p className="mt-4 rounded-xl bg-orbit-info-bg p-3 text-xs leading-relaxed text-orbit-500">
                {`這是 ${ITEM.groupSize} 人揪團套票。您先付自己的份額，購買後可至「我的預約」分享連結給 ${
                  ITEM.groupSize - 1
                } 位同行者各自付款；全員付清後才會發出兌換券。`}
              </p>
            )}

            {ITEM.isPackage && (
              <div className="mt-4">
                <div className="mb-1 text-sm text-orbit-400">套票包含</div>
                <div className="space-y-1">
                  {ITEM.packageIncludes.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <span className="text-orbit-900">
                        {p.name}
                        {p.qty > 1 && ` × ${p.qty}`}
                      </span>
                      <span className="text-orbit-400">
                        {p.duration} 分鐘 · 單次 NT$ {p.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAddons.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-sm text-orbit-400">
                  加購項目（共 {selectedAddons.length} 項）
                </div>
                <div className="space-y-1">
                  {selectedAddons.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-orbit-900">
                        {a.name} × {addonQty[a.id]}
                      </span>
                      <span className="text-orbit-400">
                        +{a.extraMinutes * addonQty[a.id]} 分鐘 · NT$ {a.price * addonQty[a.id]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-orbit-border pt-4">
              <span className="text-sm font-medium text-orbit-700">應付定金</span>
              <span className="text-lg font-semibold text-orbit-900">
                NT$ {depositAmount + addonTotal}
              </span>
            </div>
            <p className="mt-1 text-right text-xs text-orbit-400">
              （定金 NT$ {depositAmount}，平均每人 NT$ {perPerson}）
            </p>
          </Card>

          <Card>
            <h3 className="mb-3 font-medium text-orbit-900">預約人資訊</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-orbit-400">姓名</span>
                <span className="text-orbit-900">{customer.name || '未填寫'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orbit-400">手機號碼</span>
                <span className="text-orbit-900">{customer.phone || '未填寫'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orbit-400">備註</span>
                <span className="text-orbit-900">{customer.note || '未填寫'}</span>
              </div>
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-orbit-700">
              預約已送出，請選擇付款方式
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                ['jkopay', '使用街口支付'],
                ['card', '線上刷卡'],
                ['later', '稍後付款'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentMethod(key)}
                  className={clsx(
                    'rounded-xl border px-3.5 py-2.5 text-sm',
                    paymentMethod === key
                      ? 'border-orbit-primary bg-orbit-warm text-orbit-900'
                      : 'border-orbit-border text-orbit-500'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-between gap-3">
              <Button variant="outline" onClick={goBack} disabled={submitting}>
                返回
              </Button>
              <Button variant="primary" onClick={handleSubmitBooking} disabled={submitting}>
                {submitLabel}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 5: 預約已提交 (success) */}
      {step === STEP_SUCCESS && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-orbit-success-bg text-2xl text-orbit-success">
              ✓
            </div>
            <h2 className="font-serif text-xl font-semibold text-orbit-900">預約已提交</h2>
            <p className="mt-1 text-sm text-orbit-400">您的預約已成功送出</p>
          </div>

          <Card>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-orbit-400">項目</span>
                <span className="text-orbit-900">{ITEM.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orbit-400">預約時間</span>
                <span className="text-right text-orbit-900">
                  {selectedSlots.map((s) => (
                    <div key={slotKey(s.date, s.time)}>
                      {formatDate(s.date)}（{weekdayLabel(s.date)}） {s.time}
                    </div>
                  ))}
                </span>
              </div>
              <div className="flex justify-between border-t border-orbit-border pt-2">
                <span className="text-orbit-400">應付定金</span>
                <span className="font-medium text-orbit-900">
                  NT$ {depositAmount + addonTotal}
                </span>
              </div>
            </div>
          </Card>

          {paymentMethod !== 'later' ? null : (
            <Card>
              <h3 className="mb-2 font-medium text-orbit-900">付款資訊</h3>
              <p className="text-xs leading-relaxed text-orbit-500">
                轉帳完成後，請至我的預約填寫帳號末五碼以加速對帳 →
              </p>
            </Card>
          )}

          <Card>
            <h3 className="mb-2 font-medium text-orbit-900">預約人資訊</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-orbit-400">姓名</span>
                <span className="text-orbit-900">{customer.name || '未填寫'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orbit-400">手機</span>
                <span className="text-orbit-900">{customer.phone || '未填寫'}</span>
              </div>
            </div>
          </Card>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={handleClose}>
              關閉
            </Button>
            <Link to={`/${orgSlug}/orders`} className="flex-1">
              <Button variant="primary" className="w-full">
                前往我的預約
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 身份驗證 modal */}
      {verifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            {verifyStage === 'contact' ? (
              <div>
                <h3 className="font-serif text-lg font-semibold text-orbit-900">身份驗證</h3>
                <p className="mt-1 text-xs text-orbit-400">
                  請輸入您的聯絡方式，我們將發送驗證碼
                </p>
                <div className="mt-4">
                  <Field label="手機號碼" hint={verifyError}>
                    <Input
                      value={verifyContact}
                      onChange={(e) => setVerifyContact(e.target.value)}
                      placeholder="09xxxxxxxx"
                    />
                  </Field>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={closeVerify}>
                    返回
                  </Button>
                  <Button variant="primary" onClick={handleSendCode} disabled={verifySending}>
                    {verifySending ? '發送中...' : '發送驗證碼'}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-serif text-lg font-semibold text-orbit-900">輸入驗證碼</h3>
                <p className="mt-1 text-xs text-orbit-400">
                  驗證碼已發送至 {verifyContact}
                </p>
                <p className="text-xs text-orbit-400">驗證碼 5 分鐘內有效</p>
                <div className="mt-4">
                  <Field label="驗證碼">
                    <Input
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="請輸入 6 碼驗證碼"
                      maxLength={6}
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  {verifyCountdown > 0 ? (
                    <span className="text-xs text-orbit-400">
                      {verifyCountdown} 秒後可重新發送
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      className="text-xs text-orbit-primary"
                    >
                      重新發送驗證碼
                    </button>
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={closeVerify}>
                    返回
                  </Button>
                  <Button variant="primary" onClick={handleCheckCode} disabled={verifyChecking}>
                    {verifyChecking ? '驗證中...' : '確認驗證碼'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
