import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, PageHeader, Badge, Field, Input } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { common, status } from '../../i18n/strings.js'
import { orderService } from '../../lib/services.js'
import { useApi, errorMessage } from '../../lib/useApi.js'

/* ----------------------------------------------------------------------- */
/* Constants                                                               */
/* ----------------------------------------------------------------------- */

const STAFF_NAMES = ['小美', '阿宏', '雅雯']

const ORDER_STATUS_TABS = ['ALL', 'UNPAID', 'PENDING', 'CONFIRMED', 'CANCELLED']
const ORDER_STATUS_TONE = {
  CONFIRMED: 'success',
  PENDING: 'info',
  UNPAID: 'default',
  CANCELLED: 'danger',
}

function fmtMoney(n) {
  return `NT$ ${Number(n).toLocaleString('zh-Hant-TW')}`
}

/** Adapt a real API order (`{ id, itemName, customerName, status, ... }`) into
 *  the view-shape the existing markup + modals were built against, so the
 *  layout/interactions below don't need to change — only the data source does. */
function toViewOrder(o) {
  return {
    id: o.id,
    itemNames: [o.itemName],
    qty: 1,
    customer: {
      name: o.customerName,
      phone: o.customerPhone,
      email: o.customerEmail,
      isMember: false,
      isBlacklist: false,
    },
    amount: o.amount,
    orderStatus: o.status,
    paymentStatus: o.paymentStatus,
    providerLabel: '',
    last5: o.remittanceLast5 || '',
    bookingTime: o.bookingAt,
    createdTime: o.createdAt,
    note: o.note || '',
    isGroup: false,
    isAddon: false,
    groupSize: 1,
    paymentRecords: [],
    commissions: null,
  }
}

/* ----------------------------------------------------------------------- */
/* Toast helper                                                            */
/* ----------------------------------------------------------------------- */

function useToast() {
  const [toast, setToast] = useState('')
  const show = (msg) => {
    setToast(msg)
    window.clearTimeout(show._t)
    show._t = window.setTimeout(() => setToast(''), 2400)
  }
  return [toast, show]
}

/* ----------------------------------------------------------------------- */
/* Row sub-components                                                      */
/* ----------------------------------------------------------------------- */

function ContactCell({ customer, toast }) {
  const [copied, setCopied] = useState(false)
  const copyEmail = async () => {
    try {
      await navigator.clipboard?.writeText(customer.email)
    } catch {
      /* clipboard may be unavailable in sandbox */
    }
    setCopied(true)
    toast('Email 已複製')
    window.setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="text-xs text-orbit-500">
      <div>{customer.phone}</div>
      <button
        type="button"
        title={`${customer.email}（點擊複製）`}
        onClick={copyEmail}
        className="mt-0.5 text-orbit-primary hover:underline"
      >
        {copied ? 'Email 已複製' : customer.email}
      </button>
    </div>
  )
}

function NoteCell({ order, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(order.note || '')
  const [saving, setSaving] = useState(false)

  if (editing) {
    return (
      <div className="w-56">
        <textarea
          autoFocus
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="輸入這筆預約的備註"
          className="w-full rounded-xl border border-orbit-border bg-white px-3 py-2 text-xs text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
        />
        <div className="mt-1 text-[11px] text-orbit-400">清空後儲存即可移除備註。</div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" className="!px-3 !py-1 text-xs" onClick={() => setEditing(false)}>
            取消
          </Button>
          <Button
            className="!px-3 !py-1 text-xs"
            disabled={saving}
            onClick={() => {
              setSaving(true)
              Promise.resolve(onSave(draft)).finally(() => {
                setSaving(false)
                setEditing(false)
              })
            }}
          >
            {saving ? '儲存中…' : '儲存'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(order.note || '')
        setEditing(true)
      }}
      className="max-w-[10rem] truncate text-left text-xs text-orbit-500 hover:text-orbit-primary"
      title={order.note ? '點擊修改備註' : '點擊新增備註'}
    >
      {order.note || <span className="text-orbit-300">新增備註</span>}
    </button>
  )
}

/* ----------------------------------------------------------------------- */
/* Main page                                                               */
/* ----------------------------------------------------------------------- */

export default function Orders() {
  const { orgSlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [toast, showToast] = useToast()

  const [search, setSearch] = useState('')
  const [createdRange, setCreatedRange] = useState('')
  const [bookingRange, setBookingRange] = useState('')
  const [statusTab, setStatusTab] = useState('ALL')
  const [expanded, setExpanded] = useState({})

  const dateFilter = searchParams.get('date') || ''

  const [cashModal, setCashModal] = useState(null) // order
  const [markPaidModal, setMarkPaidModal] = useState(null) // order
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [changeTimeModal, setChangeTimeModal] = useState(null)
  const [changeItemModal, setChangeItemModal] = useState(null)
  const [commissionModal, setCommissionModal] = useState(null)

  const {
    data: rawOrders,
    loading,
    reload,
  } = useApi(
    () => orderService.list({ orgId: orgSlug, status: statusTab, search }),
    [statusTab, search],
    { fallback: [] }
  )

  // Local, mutable working copy — kept in sync with the fetched data, but the
  // existing modals (change time / change item / 分潤管理 / 快速對帳) are
  // still allowed to operate on it optimistically without a round-trip.
  const [orders, setOrders] = useState([])
  useEffect(() => {
    setOrders((rawOrders || []).map(toViewOrder))
  }, [rawOrders])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (dateFilter && !(o.bookingTime || '').startsWith(dateFilter)) return false
      return true
    })
  }, [orders, dateFilter])

  const updateOrder = (id, patch) => {
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  const setLast5 = async (order, value) => {
    if (value && !/^\d{5}$/.test(value)) {
      showToast('請輸入 5 碼數字')
      return
    }
    try {
      await orderService.update(order.id, { remittanceLast5: value })
      updateOrder(order.id, { last5: value })
      reload()
      showToast('匯款末五碼已更新')
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  const saveNote = async (order, note) => {
    try {
      await orderService.update(order.id, { note })
      updateOrder(order.id, { note })
      reload()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  const markAsPaid = async (order) => {
    await orderService.update(order.id, { status: 'CONFIRMED', paymentStatus: 'PAID' })
    updateOrder(order.id, {
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentRecords: [
        ...(order.paymentRecords || []),
        { id: `p_${Date.now()}`, amount: order.amount, method: '現金', createdAt: new Date().toLocaleString('zh-Hant-TW') },
      ],
    })
    reload()
  }

  return (
    <div>
      <PageHeader
        title="預約管理"
        subtitle={`共 ${filtered.length} 筆預約`}
        actions={<Button onClick={() => setReconcileOpen(true)}>快速對帳</Button>}
      />

      {dateFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-orbit-info-bg px-4 py-2 text-xs text-orbit-500">
          <span>
            目前篩選：預約 {dateFilter}
          </span>
          <button
            type="button"
            aria-label="清除預約篩選"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.delete('date')
              setSearchParams(next)
            }}
            className="ml-auto text-orbit-primary hover:underline"
          >
            清除
          </button>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="搜尋">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋客戶姓名、電話、Email"
            />
          </Field>
          <Field label="建立時間">
            <Input
              value={createdRange}
              onChange={(e) => setCreatedRange(e.target.value)}
              placeholder="建立時間範圍"
            />
          </Field>
          <Field label="預約時間">
            <Input
              value={bookingRange}
              onChange={(e) => setBookingRange(e.target.value)}
              placeholder="預約時間範圍"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ORDER_STATUS_TABS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusTab(key)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm',
                statusTab === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
              )}
            >
              {key === 'ALL' ? '全部' : status.order[key]}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <div className="text-sm text-orbit-400">{common.loading}</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <div className="text-sm font-medium text-orbit-500">目前沒有預約</div>
          <p className="max-w-md text-xs leading-relaxed text-orbit-400">
            當客戶完成預約後，預約會顯示在這裡
          </p>
        </Card>
      ) : (
        <div className="orbit-card overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-orbit-border text-xs text-orbit-400">
                {['項目', '客戶', '金額', '狀態', '聯絡', '匯款末五碼', '時間', '備註', '金流'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const isExpanded = !!expanded[o.id]
                const extraItems = o.itemNames.length - 1
                return (
                  <tr key={o.id} className="border-b border-orbit-border last:border-0 align-top">
                    {/* 項目 */}
                    <td className="px-4 py-3">
                      <div className="text-orbit-900">
                        {o.itemNames[0]}
                        {o.qty > 1 && <span className="text-orbit-400"> × {o.qty}</span>}
                      </div>
                      {extraItems > 0 && !isExpanded && (
                        <button
                          type="button"
                          className="mt-0.5 text-xs text-orbit-primary hover:underline"
                          onClick={() => setExpanded((s) => ({ ...s, [o.id]: true }))}
                        >
                          展開 +{extraItems}
                        </button>
                      )}
                      {extraItems > 0 && isExpanded && (
                        <div className="mt-1">
                          {o.itemNames.slice(1).map((n) => (
                            <div key={n} className="text-xs text-orbit-400">
                              {n}
                            </div>
                          ))}
                          <button
                            type="button"
                            className="mt-0.5 text-xs text-orbit-primary hover:underline"
                            onClick={() => setExpanded((s) => ({ ...s, [o.id]: false }))}
                          >
                            收合
                          </button>
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.isGroup && <Badge tone="info">揪團</Badge>}
                        {o.isAddon && <Badge>加購</Badge>}
                        {o.batchId && <Badge>整批合計</Badge>}
                      </div>
                    </td>

                    {/* 客戶 */}
                    <td className="px-4 py-3">
                      <Link
                        to={`/${orgSlug}/dashboard/orders/${o.id}`}
                        className="font-medium text-orbit-900 hover:text-orbit-primary hover:underline"
                      >
                        {o.customer.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.customer.isMember && <Badge>客戶</Badge>}
                        {o.customer.isBlacklist && <Badge tone="danger">黑名單</Badge>}
                      </div>
                    </td>

                    {/* 金額 */}
                    <td className="px-4 py-3">
                      <div className="text-orbit-900">{fmtMoney(o.amount)}</div>
                      {o.isGroup && (
                        <div className="mt-0.5 text-xs text-orbit-400">
                          全額 ${o.amount * o.groupSize} / 人
                        </div>
                      )}
                    </td>

                    {/* 狀態 */}
                    <td className="px-4 py-3">
                      <Badge tone={ORDER_STATUS_TONE[o.orderStatus]}>{status.order[o.orderStatus]}</Badge>
                    </td>

                    {/* 聯絡 */}
                    <td className="px-4 py-3">
                      <ContactCell customer={o.customer} toast={showToast} />
                    </td>

                    {/* 匯款末五碼 */}
                    <td className="px-4 py-3">
                      <input
                        defaultValue={o.last5}
                        placeholder="—"
                        maxLength={5}
                        onBlur={(e) => setLast5(o, e.target.value.trim())}
                        className="w-20 rounded-lg border border-orbit-border bg-white px-2 py-1 text-xs text-orbit-700 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                      />
                    </td>

                    {/* 時間 */}
                    <td className="px-4 py-3 text-xs text-orbit-500">
                      <div>預約 {o.bookingTime}</div>
                      <div className="mt-0.5 text-orbit-400">建立 {o.createdTime}</div>
                    </td>

                    {/* 備註 */}
                    <td className="px-4 py-3">
                      <NoteCell order={o} onSave={(note) => saveNote(o, note)} />
                    </td>

                    {/* 金流 */}
                    <td className="px-4 py-3 text-xs">
                      <div className="text-orbit-500">{status.payment[o.paymentStatus]}</div>
                      {o.providerLabel && <div className="mt-0.5 text-orbit-400">{o.providerLabel}</div>}
                      <div className="mt-0.5 text-orbit-400">付款紀錄（{o.paymentRecords.length} 筆）</div>
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <Button
                          variant="outline"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => setChangeTimeModal(o)}
                        >
                          更換時間
                        </Button>
                        <Button
                          variant="outline"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => setChangeItemModal(o)}
                        >
                          更換項目
                        </Button>
                        <Button
                          variant="outline"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => setCashModal(o)}
                        >
                          現金付款
                        </Button>
                        <Button
                          variant="outline"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => setMarkPaidModal(o)}
                        >
                          標註已付款
                        </Button>
                        <Button
                          variant="outline"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => setCommissionModal(o)}
                        >
                          分潤管理
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cash payment modal */}
      {cashModal && (
        <CashPaymentModal
          order={cashModal}
          onClose={() => setCashModal(null)}
          onConfirm={async (amount) => {
            await orderService.update(cashModal.id, { status: 'CONFIRMED', paymentStatus: 'PAID' })
            updateOrder(cashModal.id, {
              orderStatus: 'CONFIRMED',
              paymentStatus: 'PAID',
              paymentRecords: [
                ...cashModal.paymentRecords,
                { id: `p_${Date.now()}`, amount, method: '現金', createdAt: new Date().toLocaleString('zh-Hant-TW') },
              ],
            })
            reload()
          }}
        />
      )}

      {/* 標註已付款 confirm */}
      {markPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-2 font-serif text-lg font-semibold text-orbit-900">標註已付款</h3>
            <p className="mb-6 text-sm text-orbit-500">
              確定要把這筆預約標註為已付款 NT$ {markPaidModal.amount}？會新增一筆現金付款紀錄並把預約推進為已確認。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMarkPaidModal(null)}>
                返回
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await markAsPaid(markPaidModal)
                    setMarkPaidModal(null)
                    showToast('已標註付款')
                  } catch (e) {
                    showToast(errorMessage(e))
                  }
                }}
              >
                確定標註
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 更換預約時間 */}
      {changeTimeModal && (
        <ChangeTimeModal
          order={changeTimeModal}
          onClose={() => setChangeTimeModal(null)}
          onConfirm={(time) => {
            updateOrder(changeTimeModal.id, { bookingTime: time })
            setChangeTimeModal(null)
            showToast('已更換預約時間')
          }}
        />
      )}

      {/* 更換預約項目 */}
      {changeItemModal && (
        <ChangeItemModal
          order={changeItemModal}
          onClose={() => setChangeItemModal(null)}
          onConfirm={(name, amount) => {
            updateOrder(changeItemModal.id, { itemNames: [name], amount })
            setChangeItemModal(null)
            showToast('已更換預約項目')
          }}
        />
      )}

      {/* 分潤管理 */}
      {commissionModal && (
        <CommissionModal
          order={commissionModal}
          onClose={() => setCommissionModal(null)}
          onChange={(commissions) => updateOrder(commissionModal.id, { commissions })}
          toast={showToast}
        />
      )}

      {/* 快速對帳 */}
      {reconcileOpen && (
        <ReconcileModal
          orders={orders}
          onClose={() => setReconcileOpen(false)}
          onConfirm={async (ids) => {
            try {
              await Promise.all(
                ids.map((id) => orderService.update(id, { status: 'CONFIRMED', paymentStatus: 'PAID' }))
              )
              setOrders((list) =>
                list.map((o) =>
                  ids.includes(o.id)
                    ? {
                        ...o,
                        orderStatus: 'CONFIRMED',
                        paymentStatus: 'PAID',
                        paymentRecords: [
                          ...o.paymentRecords,
                          { id: `p_${Date.now()}_${o.id}`, amount: o.amount, method: '銀行轉帳', createdAt: new Date().toLocaleString('zh-Hant-TW') },
                        ],
                      }
                    : o
                )
              )
              reload()
              showToast(`已確認 ${ids.length} 筆預約`)
            } catch (e) {
              showToast(errorMessage(e))
            }
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-orbit-900 px-4 py-2 text-xs text-white shadow-orbit-card">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Cash payment modal                                                      */
/* ----------------------------------------------------------------------- */

function CashPaymentModal({ order, onClose, onConfirm }) {
  const [amount, setAmount] = useState(String(order.amount))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    const n = Number(amount)
    if (!Number.isInteger(n) || n < 1 || n > 99999999) {
      setError('金額需為 1 至 99,999,999 的整數')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onConfirm(n)
      setDone(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
        <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">現金付款</h3>
        {!done ? (
          <>
            <p className="mb-4 text-xs text-orbit-400">記錄為 PAID，預約會自動轉成已確認</p>
            <Field label="收款金額（NT$）" hint={error || '預設帶入預約金額，可調整為實際收到的數字（例如部分付款 / 含小費）'}>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
            </Field>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? '送出中…' : '確認'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-1 text-sm text-orbit-700">已記錄現金收款</p>
            <p className="mb-6 text-sm text-orbit-500">收款金額 NT$ {amount}</p>
            <div className="flex justify-end">
              <Button onClick={onClose}>完成</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Change booking time modal                                               */
/* ----------------------------------------------------------------------- */

function ChangeTimeModal({ order, onClose, onConfirm }) {
  const [time, setTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = () => {
    if (!time) {
      setError('請選擇新的預約時間')
      return
    }
    setError('')
    setSubmitting(true)
    window.setTimeout(() => {
      onConfirm(time)
      setSubmitting(false)
    }, 350)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-orbit-card">
        <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">更換預約時間</h3>
        <p className="mb-4 text-xs text-orbit-400">目前預約時間：{order.bookingTime}</p>
        <Field label="新的預約時間" hint={error}>
          <Input
            type="datetime-local"
            placeholder="載入可預約時段中…"
            onChange={(e) => setTime(e.target.value.replace('T', ' '))}
          />
        </Field>
        <p className="mt-4 rounded-xl bg-orbit-info-bg p-3 text-xs leading-relaxed text-orbit-500">
          注意：此時間系統不會自動檢查該時段是否已有其他預約，請務必確認後再進行修改。若此預約已產生兌換券，兌換券時間也將同步更新。
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? '更新中...' : '確認更換'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Change booking item modal                                               */
/* ----------------------------------------------------------------------- */

const CHANGEABLE_ITEMS = [
  { name: '臉部保養 60 分鐘', amount: 1800, duration: 60 },
  { name: '美甲全套', amount: 1200, duration: 90 },
  { name: '深層按摩 90 分鐘', amount: 2200, duration: 90 },
  { name: '剪髮造型', amount: 900, duration: 45 },
]

function ChangeItemModal({ order, onClose, onConfirm }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const list = CHANGEABLE_ITEMS.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-orbit-card">
        <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">更換預約項目</h3>
        <p className="mb-4 text-xs text-orbit-400">目前項目：{order.itemNames[0]}</p>

        {order.isGroup ? (
          <p className="text-sm text-orbit-500">
            此項目為揪團項目（多人拆帳），無法透過更換項目改過去，請取消後重新建立預約。
          </p>
        ) : (
          <>
            <Field label="新的項目">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="輸入名稱搜尋項目"
              />
            </Field>
            <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {list.length === 0 && (
                <p className="text-xs text-orbit-400">沒有其他可更換的服務項目。</p>
              )}
              {list.map((i) => (
                <button
                  key={i.name}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={clsx(
                    'block w-full rounded-xl border px-3 py-2 text-left text-sm',
                    selected?.name === i.name
                      ? 'border-orbit-primary bg-orbit-info-bg text-orbit-900'
                      : 'border-orbit-border text-orbit-700 hover:bg-orbit-warm'
                  )}
                >
                  {i.name}
                </button>
              ))}
            </div>
            {selected && (
              <>
                <p className="mt-3 text-sm text-orbit-700">
                  更換後金額：NT$ {selected.amount}（定金），時長 {selected.duration} 分鐘
                </p>
                <p className="mt-1 text-xs leading-relaxed text-orbit-400">
                  金額會依新項目重新計算（原付款紀錄不變），預約時間維持不變。系統不會檢查新項目的時長是否與其他預約衝突，也不會重新指派服務人員，請自行確認。
                </p>
              </>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                disabled={!selected || submitting}
                onClick={() => {
                  setSubmitting(true)
                  window.setTimeout(() => {
                    onConfirm(selected.name, selected.amount)
                    setSubmitting(false)
                  }, 350)
                }}
              >
                {submitting ? '更新中...' : '確認更換'}
              </Button>
            </div>
          </>
        )}
        {order.isGroup && (
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Commission split modal (分潤管理)                                        */
/* ----------------------------------------------------------------------- */

function CommissionModal({ order, onClose, onChange, toast }) {
  const [commissions, setCommissions] = useState(order.commissions)
  const [picked, setPicked] = useState('')

  const total = (commissions || []).reduce((s, c) => s + c.amount, 0)

  const addPerson = () => {
    if (!picked) return
    const next = commissions ? [...commissions] : []
    next.push({ id: `c_${Date.now()}`, name: picked, amount: 0 })
    const even = Math.round((order.amount / next.length) * 100) / 100
    const rebalanced = next.map((c) => ({ ...c, amount: even }))
    setCommissions(rebalanced)
    onChange(rebalanced)
    setPicked('')
    toast('已新增')
  }

  const remove = (id) => {
    if (!window.confirm('確定要移除這位人員？剩餘金額會平均分給其他人。')) return
    const remaining = commissions.filter((c) => c.id !== id)
    if (remaining.length === 0) {
      setCommissions([])
      onChange([])
    } else {
      const even = Math.round((order.amount / remaining.length) * 100) / 100
      const rebalanced = remaining.map((c) => ({ ...c, amount: even }))
      setCommissions(rebalanced)
      onChange(rebalanced)
    }
    toast('已移除')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-orbit-card">
        <h3 className="mb-4 font-serif text-lg font-semibold text-orbit-900">分潤管理</h3>

        {!commissions ? (
          <p className="text-sm text-orbit-500">
            此預約沒有分潤資料（可能尚未產票或為套票兌換券）
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-orbit-400">合計 NT$ {total}</p>
            {commissions.length === 0 ? (
              <p className="text-sm text-orbit-400">這張票尚未分派任何人員</p>
            ) : (
              <div className="space-y-2">
                {commissions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-orbit-border px-3 py-2 text-sm"
                  >
                    <span className="text-orbit-700">{c.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-orbit-900">NT$ {c.amount}</span>
                      <button
                        type="button"
                        aria-label="移除"
                        onClick={() => remove(c.id)}
                        className="text-xs text-orbit-400 hover:text-orbit-danger"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-orbit-warm p-3">
              <div className="mb-2 text-xs font-medium text-orbit-700">
                加人員（會自動平均分新總額）
              </div>
              <div className="flex gap-2">
                <select
                  value={picked}
                  onChange={(e) => setPicked(e.target.value)}
                  className="w-full rounded-xl border border-orbit-border bg-white px-3 py-2 text-sm text-orbit-700 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                >
                  <option value="">選擇人員...</option>
                  {STAFF_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={addPerson}>
                  加入
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onClose}>關閉</Button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Quick reconciliation (快速對帳 — AI)                                     */
/* ----------------------------------------------------------------------- */

const RECONCILE_PLACEHOLDER = `範例格式：

王小明 轉帳 帳號末五碼 78901 金額 NT$1,500
李大華 匯款 32456 $800

也可以直接貼上網銀截圖文字、CSV 等`

function parseRemittanceText(text) {
  const results = []
  const lines = text.split('\n')
  for (const line of lines) {
    const codeMatch = line.match(/(\d{5})/)
    const amountMatch = line.match(/(?:NT\$|\$)\s?([\d,]+)/i)
    if (codeMatch && amountMatch) {
      const nameMatch = line.match(/^([^\s\d]+)/)
      results.push({
        id: `r_${results.length}`,
        code: codeMatch[1],
        name: nameMatch ? nameMatch[1] : '',
        amount: Number(amountMatch[1].replace(/,/g, '')),
      })
    }
  }
  return results
}

function ReconcileModal({ orders, onClose, onConfirm }) {
  const [step, setStep] = useState(1)
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [rows, setRows] = useState([])
  const [matching, setMatching] = useState(false)
  const [matched, setMatched] = useState([])
  const [unmatched, setUnmatched] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [confirmedCount, setConfirmedCount] = useState(null)

  const titles = { 1: '快速對帳', 2: '確認解析結果', 3: '比對結果' }

  const runParse = () => {
    setParsing(true)
    window.setTimeout(() => {
      const parsed = parseRemittanceText(text)
      setRows(parsed)
      setParsing(false)
      setStep(2)
    }, 500)
  }

  const runMatch = () => {
    setMatching(true)
    window.setTimeout(() => {
      const nextMatched = []
      const nextUnmatched = []
      for (const r of rows) {
        const hit = orders.find(
          (o) => o.last5 === r.code && o.amount === r.amount && o.orderStatus !== 'CONFIRMED' && o.orderStatus !== 'CANCELLED'
        )
        if (hit) nextMatched.push({ ...r, order: hit })
        else nextUnmatched.push(r)
      }
      setMatched(nextMatched)
      setUnmatched(nextUnmatched)
      setMatching(false)
      setStep(3)
    }, 500)
  }

  const removeMatch = (id) => setMatched((m) => m.filter((x) => x.id !== id))

  const confirmAll = () => {
    setConfirming(true)
    Promise.resolve(onConfirm(matched.map((m) => m.order.id))).finally(() => {
      setConfirming(false)
      setConfirmedCount(matched.length)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-orbit-card">
        <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">{titles[step]}</h3>

        {step === 1 && (
          <>
            <p className="mb-4 text-xs leading-relaxed text-orbit-400">
              貼上銀行匯款通知或對帳明細，AI 會自動辨識帳號後五碼與金額，比對待確認的預約。
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={RECONCILE_PLACEHOLDER}
              rows={8}
              className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:whitespace-pre-line placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
            />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={runParse} disabled={parsing || !text.trim()}>
                {parsing ? '解析中...' : 'AI 解析'}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {rows.length === 0 ? (
              <p className="text-sm text-orbit-500">未辨識到任何匯款資料，請重新輸入。</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-orbit-700">
                  AI 辨識出以下 {rows.length} 筆匯款資料，請確認是否正確：
                </p>
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-orbit-border text-xs text-orbit-400">
                      <th className="py-2">帳號後五碼</th>
                      <th className="py-2">匯款人</th>
                      <th className="py-2">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-orbit-border last:border-0">
                        <td className="py-2 text-orbit-900">{r.code}</td>
                        <td className="py-2 text-orbit-700">{r.name || '—'}</td>
                        <td className="py-2 text-orbit-700">NT$ {r.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                重新輸入
              </Button>
              <Button onClick={runMatch} disabled={matching || rows.length === 0}>
                {matching ? '解析中...' : '確認，開始比對'}
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {confirmedCount === null ? (
              <>
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium text-orbit-700">
                    比對成功（{matched.length} 筆）
                  </h4>
                  {matched.length === 0 ? (
                    <p className="text-xs text-orbit-400">本頁無符合的預約</p>
                  ) : (
                    <div className="space-y-2">
                      {matched.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-xl border border-orbit-border px-3 py-2 text-xs"
                        >
                          <div>
                            <div className="text-orbit-900">
                              {m.order.customer.name} · 末五碼 {m.code}
                              {m.order.batchId && <span className="ml-1 text-orbit-400">整批</span>}
                            </div>
                            <div className="mt-0.5 text-orbit-400">NT$ {m.amount}</div>
                          </div>
                          <button
                            type="button"
                            aria-label="移除此筆，不確認付款"
                            onClick={() => removeMatch(m.id)}
                            className="text-orbit-400 hover:text-orbit-danger"
                          >
                            移除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium text-orbit-700">需人工確認（0 筆）</h4>
                  <p className="text-xs text-orbit-400">先不處理</p>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-orbit-700">
                    未比對到（{unmatched.length} 筆）
                  </h4>
                  {unmatched.length === 0 ? (
                    <p className="text-xs text-orbit-400">—</p>
                  ) : (
                    <div className="space-y-1">
                      {unmatched.map((u) => (
                        <div key={u.id} className="text-xs text-orbit-400">
                          末五碼 {u.code}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    重新輸入
                  </Button>
                  <Button onClick={confirmAll} disabled={confirming || matched.length === 0}>
                    {confirming ? '更新中...' : `確認 ${matched.length} 筆已付款`}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-6 text-sm text-orbit-700">已確認 {confirmedCount} 筆預約</p>
                <div className="flex justify-end">
                  <Button onClick={onClose}>完成</Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
