import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, PageHeader, Badge, Field, Input } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { orderService, holidayService, resourceLeaveService, itemService } from '../../lib/services.js'
import { useApi, useMutation, errorMessage } from '../../lib/useApi.js'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const HOLIDAY_PLACEHOLDER =
  '例如：\n1/1 元旦整天\n過年 2/10-2/12\n2/20 下午 14:00-17:00 休診\n七月只有 7/23 有空'

const ORDER_STATUS_LABEL = { UNPAID: '待付款', PENDING: '待處理', CONFIRMED: '已確認', CANCELLED: '已取消' }
const ORDER_STATUS_TONE = { UNPAID: 'default', PENDING: 'default', CONFIRMED: 'success', CANCELLED: 'danger' }

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** `YYYY-MM-DD` for the given (0-indexed) month + day, matching the API's date fields. */
function isoDate(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

/** Locally parse a free-text holiday line into date(s) + optional time range.
 *  Best-effort only — the backend is the source of truth once saved. */
function parseHolidayLine(line, year) {
  let startTime = ''
  let endTime = ''
  let isAllDay = true
  const timeMatch = line.match(/(\d{1,2}):(\d{2})\s*[-~至]\s*(\d{1,2}):(\d{2})/)
  if (timeMatch) {
    startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
    endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`
    isAllDay = false
  }

  const rangeMatch = line.match(/(\d{1,2})\/(\d{1,2})\s*[-~至]\s*(\d{1,2})\/(\d{1,2})/)
  const singleMatch = !rangeMatch && line.match(/(\d{1,2})\/(\d{1,2})/)

  const dates = []
  if (rangeMatch) {
    const m1 = Number(rangeMatch[1])
    const d1 = Number(rangeMatch[2])
    const m2 = Number(rangeMatch[3])
    const d2 = Number(rangeMatch[4])
    const cur = new Date(year, m1 - 1, d1)
    const end = new Date(year, m2 - 1, d2)
    while (cur <= end) {
      dates.push(isoDate(cur.getFullYear(), cur.getMonth(), cur.getDate()))
      cur.setDate(cur.getDate() + 1)
    }
  } else if (singleMatch) {
    const m = Number(singleMatch[1])
    const d = Number(singleMatch[2])
    dates.push(isoDate(year, m - 1, d))
  }

  return { dates, startTime, endTime, isAllDay, note: line }
}

export default function CalendarPage() {
  const { orgSlug } = useParams()
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [itemFilter, setItemFilter] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const [holidayInput, setHolidayInput] = useState('')
  const [holidayParsing, setHolidayParsing] = useState(false)
  const [holidayDrafts, setHolidayDrafts] = useState([])

  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleConnecting, setGoogleConnecting] = useState(false)

  const [wizardStep, setWizardStep] = useState(1)
  const [wizardPhone, setWizardPhone] = useState('')

  const [toast, setToast] = useState('')
  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3200)
  }

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const monthFrom = isoDate(cursor.year, cursor.month, 1)
  const monthTo = isoDate(cursor.year, cursor.month, daysInMonth)

  const {
    data: orders,
    loading: ordersLoading,
    error: ordersError,
  } = useApi(
    () => orderService.list({ orgId: orgSlug, from: monthFrom, to: monthTo }),
    [orgSlug, monthFrom, monthTo],
    { fallback: [] }
  )

  const {
    data: holidays,
    loading: holidaysLoading,
    error: holidaysError,
    reload: reloadHolidays,
  } = useApi(
    () => holidayService.list({ orgId: orgSlug, from: monthFrom, to: monthTo }),
    [orgSlug, monthFrom, monthTo],
    { fallback: [] }
  )

  const {
    data: resourceLeaves,
    loading: leavesLoading,
    error: leavesError,
    reload: reloadLeaves,
  } = useApi(
    () => resourceLeaveService.list({ orgId: orgSlug, from: monthFrom, to: monthTo }),
    [orgSlug, monthFrom, monthTo],
    { fallback: [] }
  )

  const { data: items } = useApi(() => itemService.list({ orgId: orgSlug }), [orgSlug], { fallback: [] })

  const { run: runSaveHolidays, saving: savingHoliday } = useMutation(holidayService.create)
  const { run: runDeleteHoliday } = useMutation(holidayService.remove)
  const { run: runCancelLeave } = useMutation(resourceLeaveService.remove)

  const calendarLoading = ordersLoading || holidaysLoading || leavesLoading
  const calendarError = ordersError || holidaysError || leavesError

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedDay(null)
  }

  const prevMonth = () => {
    setCursor((c) => {
      const m = c.month - 1
      return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m }
    })
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCursor((c) => {
      const m = c.month + 1
      return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m }
    })
    setSelectedDay(null)
  }

  const days = useMemo(() => {
    const map = {}
    for (let d = 1; d <= daysInMonth; d++) {
      map[isoDate(cursor.year, cursor.month, d)] = {
        confirmed: 0,
        pending: 0,
        holiday: false,
        leave: false,
        leaveNames: [],
      }
    }
    ;(orders || []).forEach((o) => {
      const dateKey = (o.bookingAt || '').slice(0, 10)
      if (!map[dateKey]) return
      if (o.status === 'CONFIRMED') map[dateKey].confirmed += 1
      else if (o.status === 'PENDING') map[dateKey].pending += 1
    })
    ;(holidays || []).forEach((h) => {
      if (map[h.date]) map[h.date].holiday = true
    })
    ;(resourceLeaves || []).forEach((l) => {
      if (map[l.date]) {
        map[l.date].leave = true
        map[l.date].leaveNames.push(l.resourceName)
      }
    })
    return map
  }, [cursor, daysInMonth, orders, holidays, resourceLeaves])

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = (d) =>
    d === today.getDate() && cursor.month === today.getMonth() && cursor.year === today.getFullYear()

  const openDay = (d) => {
    if (!d) return
    setSelectedDay(d)
  }

  const selectedKey = selectedDay ? isoDate(cursor.year, cursor.month, selectedDay) : null

  const selectedHolidays = useMemo(
    () => (selectedKey ? (holidays || []).filter((h) => h.date === selectedKey) : []),
    [holidays, selectedKey]
  )
  const selectedLeaves = useMemo(
    () => (selectedKey ? (resourceLeaves || []).filter((l) => l.date === selectedKey) : []),
    [resourceLeaves, selectedKey]
  )
  const selectedOrders = useMemo(() => {
    if (!selectedKey) return []
    let list = (orders || []).filter((o) => (o.bookingAt || '').slice(0, 10) === selectedKey)
    if (itemFilter) list = list.filter((o) => o.itemName === itemFilter)
    return list.slice().sort((a, b) => (a.bookingAt || '').localeCompare(b.bookingAt || ''))
  }, [orders, selectedKey, itemFilter])

  const parseHolidayInput = () => {
    if (!holidayInput.trim()) return
    setHolidayParsing(true)
    setTimeout(() => {
      const lines = holidayInput
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const drafts = []
      lines.forEach((line, idx) => {
        const parsed = parseHolidayLine(line, cursor.year)
        parsed.dates.forEach((date, di) => {
          const conflictCount = (orders || []).filter((o) => {
            const oDate = (o.bookingAt || '').slice(0, 10)
            if (oDate !== date) return false
            if (parsed.isAllDay) return true
            const oTime = (o.bookingAt || '').slice(11, 16)
            return oTime >= parsed.startTime && oTime <= parsed.endTime
          }).length
          drafts.push({
            id: `draft-${idx}-${di}`,
            date,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            isAllDay: parsed.isAllDay,
            note: parsed.note,
            label: `${date}${parsed.isAllDay ? '（整天）' : `（${parsed.startTime}-${parsed.endTime}）`}`,
            conflictCount,
          })
        })
      })
      setHolidayDrafts(drafts)
      setHolidayParsing(false)
    }, 600)
  }

  const removeDraft = (id) => {
    setHolidayDrafts((list) => list.filter((d) => d.id !== id))
  }

  const saveHolidays = async () => {
    if (holidayDrafts.length === 0) return
    try {
      const payloadItems = holidayDrafts.map((d) => ({
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        isAllDay: d.isAllDay,
        note: d.note,
      }))
      await runSaveHolidays({ items: payloadItems }, { orgId: orgSlug })
      const count = holidayDrafts.length
      setShowHolidayModal(false)
      setHolidayInput('')
      setHolidayDrafts([])
      showToast(`已新增 ${count} 筆公休`)
      reloadHolidays()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  const deleteHoliday = async (h) => {
    if (!window.confirm('確定要刪除此公休設定嗎？')) return
    try {
      await runDeleteHoliday(h.id)
      showToast('已刪除公休')
      reloadHolidays()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  const cancelLeave = async (l) => {
    if (!window.confirm(`確定要取消 ${l.resourceName} 的休假嗎？`)) return
    try {
      await runCancelLeave(l.id)
      showToast('已取消休假')
      reloadLeaves()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  const connectGoogle = () => {
    setGoogleConnecting(true)
    setTimeout(() => {
      setGoogleConnecting(false)
      setGoogleConnected(true)
    }, 700)
  }

  const disconnectGoogle = () => {
    if (window.confirm('確定要解除 Google 行事曆連結嗎？\n\n已建立的事件不會被刪除，但之後的預約變動將不再同步。')) {
      setGoogleConnected(false)
    }
  }

  const wizardSteps = ['客人手機', '客人資訊', '預約項目', '日期與時間', '備註與確認']

  const closeWizard = () => {
    setShowWizard(false)
    setWizardStep(1)
    setWizardPhone('')
  }

  const nextWizardStep = () => {
    if (wizardStep === 1 && !wizardPhone.trim()) return
    setWizardStep((s) => Math.min(s + 1, wizardSteps.length))
  }

  return (
    <div>
      <PageHeader
        title="行事曆"
        subtitle="查看各項目的預約狀況"
        actions={
          <>
            <Button variant="outline" onClick={goToday}>
              今天
            </Button>
            <Button variant="outline" onClick={() => setShowHolidayModal(true)}>
              設定公休
            </Button>
            <Button variant="outline" onClick={() => setShowGoogleModal(true)}>
              Google 行事曆
            </Button>
            <Button variant="primary" onClick={() => setShowWizard(true)}>
              新增預約
            </Button>
          </>
        }
      />

      {/* Filter + legend */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xs flex-1">
          <select
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value)}
            className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
          >
            <option value="">篩選項目...</option>
            {(items || []).map((it) => (
              <option key={it.id} value={it.name}>
                {it.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4 text-xs text-orbit-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orbit-success" />
            已確認
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orbit-warm border border-orbit-border" />
            待處理
          </span>
        </div>
      </div>

      {/* Month nav */}
      <Card className="mb-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="上個月"
            onClick={prevMonth}
            className="rounded-full px-3 py-1.5 text-sm text-orbit-500 hover:bg-orbit-warm"
          >
            ← 上個月
          </button>
          <div className="font-serif text-lg font-semibold text-orbit-900">
            {cursor.year} 年 {cursor.month + 1} 月
          </div>
          <button
            type="button"
            aria-label="下個月"
            onClick={nextMonth}
            className="rounded-full px-3 py-1.5 text-sm text-orbit-500 hover:bg-orbit-warm"
          >
            下個月 →
          </button>
        </div>

        {calendarLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-orbit-400">載入中...</div>
        ) : calendarError ? (
          <div className="flex items-center justify-center py-12 text-sm text-orbit-danger">
            載入預約資料失敗
          </div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-orbit-400">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1.5">
                  {w}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d, idx) => {
                if (!d) return <div key={`empty-${idx}`} className="min-h-[92px]" />
                const key = isoDate(cursor.year, cursor.month, d)
                const info = days[key]
                const active = selectedDay === d
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => openDay(d)}
                    aria-label={`${cursor.year} 年 ${cursor.month + 1} 月 ${d} 日`}
                    className={clsx(
                      'min-h-[92px] rounded-lg border p-2 text-left align-top transition-colors',
                      active
                        ? 'border-orbit-primary bg-orbit-primary/5'
                        : 'border-orbit-border bg-white hover:bg-orbit-warm/50',
                      isToday(d) && !active && 'ring-1 ring-orbit-primary/40'
                    )}
                  >
                    <div
                      className={clsx(
                        'mb-1 text-xs font-medium',
                        isToday(d) ? 'text-orbit-primary' : 'text-orbit-700'
                      )}
                    >
                      {d}
                    </div>
                    <div className="flex flex-col gap-1">
                      {info?.holiday && <Badge tone="default">休</Badge>}
                      {info?.leave && <Badge tone="info">請假</Badge>}
                      {!info?.holiday && info?.confirmed > 0 && (
                        <Badge tone="success">已確認 {info.confirmed}</Badge>
                      )}
                      {!info?.holiday && info?.pending > 0 && (
                        <Badge tone="default">待處理 {info.pending}</Badge>
                      )}
                      {!info?.holiday && !info?.leave && !info?.confirmed && !info?.pending && (
                        <span className="text-[11px] text-orbit-300">此日無預約</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* Day detail panel */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-orbit-900">預約詳情</h3>
          {selectedDay && (
            <span className="text-xs text-orbit-400">
              共 {selectedOrders.length} 筆預約
            </span>
          )}
        </div>
        {!selectedDay && (
          <p className="py-6 text-center text-sm text-orbit-400">點擊日期查看預約詳情</p>
        )}

        {selectedDay && selectedHolidays.length > 0 && (
          <div className="mb-3 space-y-2">
            {selectedHolidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-xl border border-orbit-border bg-orbit-warm/40 p-3 text-sm"
              >
                <div>
                  <div className="text-orbit-900">
                    公休{h.isAllDay ? '（整天）' : `（${h.startTime}-${h.endTime}）`}
                  </div>
                  {h.note && <div className="text-xs text-orbit-400">{h.note}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteHoliday(h)}
                  className="text-xs text-orbit-400 hover:text-orbit-danger"
                >
                  刪除公休
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedDay && selectedLeaves.length > 0 && (
          <div className="mb-3 space-y-2">
            {selectedLeaves.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl border border-orbit-border p-3 text-sm"
              >
                <div className="text-orbit-500">
                  人員休假：{l.resourceName}
                  {l.isAllDay ? '（整天）' : `（${l.startTime}-${l.endTime}）`}
                </div>
                <button
                  type="button"
                  onClick={() => cancelLeave(l)}
                  className="text-xs text-orbit-400 hover:text-orbit-danger"
                >
                  取消休假
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedDay && selectedOrders.length === 0 && (
          <p className="py-6 text-center text-sm text-orbit-400">此日無預約</p>
        )}

        {selectedDay && selectedOrders.length > 0 && (
          <div className="space-y-2">
            {selectedOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl border border-orbit-border p-3 text-sm hover:bg-orbit-warm/40"
                title="點擊查看預約"
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-orbit-400">{(o.bookingAt || '').slice(11, 16)}</span>
                  <div>
                    <div className="text-orbit-900">{o.customerName}</div>
                    <div className="text-xs text-orbit-400">{o.itemName}</div>
                  </div>
                </div>
                <Badge tone={ORDER_STATUS_TONE[o.status] || 'default'}>
                  {ORDER_STATUS_LABEL[o.status] || o.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Google Calendar sync card */}
      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-orbit-900">Google 行事曆同步</h3>
          {googleConnected ? <Badge tone="success">已連結</Badge> : <Badge>未連結</Badge>}
        </div>
        <p className="mb-3 text-xs leading-relaxed text-orbit-400">
          將「已確認」的預約自動同步到 Google 行事曆，方便老闆與員工從手機 / 電腦隨時查看排程。
        </p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-xs leading-relaxed text-orbit-400">
          <li>
            所有「已確認」的預約會同步到一本獨立的 「Orbit 預約」 行事曆，不影響你的個人行事曆。
          </li>
          <li>Orbit 會在你的 Google 帳號下建立一本獨立的 「Orbit 預約」行事曆，不會動到個人行事曆的事件。</li>
          <li>客戶姓名、電話、備註會寫進事件描述。</li>
          <li>預約改期、取消會自動同步（每分鐘檢查一次）。</li>
          <li>員工要看，老闆在 Google Calendar 中把這本行事曆分享給員工帳號即可。</li>
        </ul>
        {googleConnected ? (
          <Button variant="outline" onClick={disconnectGoogle}>
            解除連結
          </Button>
        ) : (
          <Button variant="primary" onClick={connectGoogle} disabled={googleConnecting}>
            {googleConnecting ? '連結中…' : '連結 Google 帳號'}
          </Button>
        )}
      </Card>

      {/* Set public holiday modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">設定公休日</h3>
            <p className="mb-4 text-xs text-orbit-400">輸入公休時段</p>

            <Field>
              <textarea
                value={holidayInput}
                onChange={(e) => setHolidayInput(e.target.value)}
                placeholder={HOLIDAY_PLACEHOLDER}
                rows={5}
                className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:whitespace-pre-line placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              />
            </Field>

            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={parseHolidayInput} disabled={holidayParsing}>
                {holidayParsing ? 'AI 解析中...' : 'AI 解析'}
              </Button>
            </div>

            {holidayDrafts.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-orbit-700">
                  即將新增（{holidayDrafts.length}）
                </h4>
                <div className="space-y-2">
                  {holidayDrafts.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl border border-orbit-border p-3 text-sm"
                    >
                      <div>
                        <div className="text-orbit-900">{d.label}</div>
                        {d.conflictCount > 0 && (
                          <div className="mt-0.5 text-xs text-orbit-danger">
                            有 {d.conflictCount} 筆預約在公休時段內
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label="移除"
                        onClick={() => removeDraft(d.id)}
                        className="text-xs text-orbit-400 hover:text-orbit-danger"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHolidayModal(false)
                  setHolidayInput('')
                  setHolidayDrafts([])
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={saveHolidays}
                disabled={savingHoliday || holidayDrafts.length === 0}
              >
                {savingHoliday ? '儲存中...' : `儲存（${holidayDrafts.length}）`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar modal (opened from toolbar button, mirrors the card above) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">Google 行事曆同步</h3>
            <p className="mb-4 text-xs leading-relaxed text-orbit-400">
              Orbit 會在你的 Google 帳號下建立一本獨立的 「Orbit 預約」行事曆，不會動到個人行事曆的事件。
            </p>
            {googleConnected ? (
              <>
                <p className="mb-4 text-xs text-orbit-500">
                  員工要查看，請在 Google Calendar 中將該行事曆分享給員工的 Google 帳號：
                </p>
                <Button variant="outline" className="mb-4 w-full">
                  開啟 Google Calendar 設定
                </Button>
                <Button variant="outline" className="w-full" onClick={disconnectGoogle}>
                  解除連結
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                onClick={connectGoogle}
                disabled={googleConnecting}
              >
                {googleConnecting ? '連結中…' : '連結 Google 帳號'}
              </Button>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setShowGoogleModal(false)}>
                關閉
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create booking on behalf wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">代客建立預約</h3>
            <p className="mb-4 text-xs text-orbit-400">
              Step {wizardStep} / {wizardSteps.length}：{wizardSteps[wizardStep - 1]}
            </p>

            {wizardStep === 1 && (
              <Field label="客人手機" hint="先輸入手機，下一步系統會自動辨識是否為本店客人">
                <Input
                  value={wizardPhone}
                  onChange={(e) => setWizardPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                />
              </Field>
            )}

            {wizardStep === 2 && (
              <div className="space-y-3">
                <Field label="客人姓名">
                  <Input placeholder="請輸入姓名" />
                </Field>
                <p className="text-xs text-orbit-400">新客人 / 直接以此客人建立預約</p>
              </div>
            )}

            {wizardStep === 3 && (
              <Field label="預約項目">
                <Input placeholder="輸入名稱搜尋..." />
              </Field>
            )}

            {wizardStep === 4 && (
              <Field label="日期與時間" hint="下一步會選擇預約時段">
                <Input type="datetime-local" />
              </Field>
            )}

            {wizardStep === 5 && (
              <Field label="備註">
                <Input placeholder="（選填）" />
              </Field>
            )}

            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                onClick={() => (wizardStep === 1 ? closeWizard() : setWizardStep((s) => s - 1))}
              >
                {wizardStep === 1 ? '取消' : '上一步'}
              </Button>
              {wizardStep < wizardSteps.length ? (
                <Button variant="primary" onClick={nextWizardStep}>
                  下一步
                </Button>
              ) : (
                <Button variant="primary" onClick={closeWizard}>
                  建立預約
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-orbit-900 px-4 py-2 text-sm text-white shadow-orbit-card">
          {toast}
        </div>
      )}
    </div>
  )
}
