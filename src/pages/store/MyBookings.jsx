import { useState } from 'react'
import { Button, Card, Badge, Input } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { status } from '../../i18n/strings.js'

/* ----------------------------------------------------------------------- */
/* Mock data                                                                */
/* ----------------------------------------------------------------------- */

const MOCK_BOOKINGS = [
  {
    id: 'ord_2001',
    itemNames: ['臉部保養 60 分鐘'],
    qty: 1,
    amount: 1800,
    orderStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    last5: '',
    bookingTime: '2026-08-09 14:00',
    createdTime: '2026-08-01 10:22',
    isGroup: false,
    isAddon: false,
    batchId: null,
    groupSize: 1,
  },
  {
    id: 'ord_2002',
    itemNames: ['美甲全套', '手部保養（加購）'],
    qty: 1,
    amount: 1500,
    orderStatus: 'PENDING',
    paymentStatus: 'UNPAID',
    last5: '',
    bookingTime: '2026-08-12 11:00',
    createdTime: '2026-08-02 09:05',
    isGroup: false,
    isAddon: true,
    batchId: null,
    groupSize: 1,
  },
  {
    id: 'ord_2003',
    batchId: 'batch_88',
    itemNames: ['陶藝體驗 2 小時'],
    qty: 1,
    amount: 800,
    orderStatus: 'UNPAID',
    paymentStatus: 'UNPAID',
    last5: '',
    bookingTime: '2026-08-15 15:30',
    createdTime: '2026-08-02 16:40',
    isGroup: true,
    isAddon: false,
    groupSize: 3,
    shareLink: 'https://orbit.example.com/demo/claim/tok_9a8b7c',
  },
]

const MOCK_WAITLIST = [
  {
    id: 'wl_501',
    itemName: '深層按摩 90 分鐘',
    position: 2,
    slotLabel: '2026-08-20 10:00',
    joinedAt: '2026-08-03 09:12',
    confirmBy: '2026-08-18 09:12',
  },
]

const ORDER_STATUS_TONE = {
  CONFIRMED: 'success',
  PENDING: 'info',
  UNPAID: 'default',
  CANCELLED: 'danger',
}

function fmtMoney(n) {
  return n > 0 ? `NT$ ${n}` : '免費'
}

export default function MyBookings() {
  const [tab, setTab] = useState('bookings')
  const [bookings, setBookings] = useState(MOCK_BOOKINGS)
  const [waitlist, setWaitlist] = useState(MOCK_WAITLIST)
  const [expanded, setExpanded] = useState({})
  const [last5Draft, setLast5Draft] = useState({})
  const [toast, setToast] = useState('')

  const [remittanceOpen, setRemittanceOpen] = useState(false)
  const [cancelOrder, setCancelOrder] = useState(null) // single booking to cancel
  const [cancelBatch, setCancelBatch] = useState(null) // batchId to cancel
  const [cancelWaitlist, setCancelWaitlist] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(''), 2400)
  }

  const submitLast5 = (order) => {
    const v = (last5Draft[order.id] ?? order.last5 ?? '').trim()
    if (!v) {
      showToast('請輸入帳號後五碼')
      return
    }
    setBookings((list) => list.map((b) => (b.id === order.id ? { ...b, last5: v } : b)))
    showToast('已提交匯款資訊')
  }

  const goToPay = () => {
    // no backend — pretend to navigate to payment
    showToast('前往中...')
  }

  const doCancelOrder = () => {
    setBookings((list) =>
      list.map((b) => (b.id === cancelOrder.id ? { ...b, orderStatus: 'CANCELLED' } : b))
    )
    showToast('已取消預約')
    setCancelOrder(null)
  }

  const doCancelBatch = () => {
    const n = bookings.filter((b) => b.batchId === cancelBatch).length
    setBookings((list) =>
      list.map((b) => (b.batchId === cancelBatch ? { ...b, orderStatus: 'CANCELLED' } : b))
    )
    showToast(`已取消整批 ${n} 筆預約`)
    setCancelBatch(null)
  }

  const doCancelWaitlist = () => {
    setWaitlist((list) => list.filter((w) => w.id !== cancelWaitlist.id))
    showToast('已取消候補')
    setCancelWaitlist(null)
  }

  const doConfirmWaitlist = (w) => {
    setWaitlist((list) => list.filter((x) => x.id !== w.id))
    showToast('已加入候補')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-orbit-900">我的預約</h1>
        <Button variant="outline" onClick={() => setRemittanceOpen(true)}>
          查看匯款資訊
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {[
          ['bookings', '預約'],
          ['waitlist', '候補'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm',
              tab === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <BookingsTab
          bookings={bookings}
          expanded={expanded}
          setExpanded={setExpanded}
          last5Draft={last5Draft}
          setLast5Draft={setLast5Draft}
          submitLast5={submitLast5}
          goToPay={goToPay}
          setCancelOrder={setCancelOrder}
          setCancelBatch={setCancelBatch}
          showToast={showToast}
        />
      )}

      {tab === 'waitlist' && (
        <WaitlistTab
          waitlist={waitlist}
          setCancelWaitlist={setCancelWaitlist}
          doConfirmWaitlist={doConfirmWaitlist}
        />
      )}

      {/* 匯款資訊 modal */}
      {remittanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-4 font-serif text-lg font-semibold text-orbit-900">匯款資訊</h3>
            <div className="rounded-xl bg-orbit-warm p-4 text-sm leading-relaxed text-orbit-700">
              <div>銀行：玉山銀行 (808)</div>
              <div>戶名：示範商家有限公司</div>
              <div>帳號：1234-5678-901234</div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setRemittanceOpen(false)}>
                關閉
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 取消預約 confirm */}
      {cancelOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-2 font-serif text-lg font-semibold text-orbit-900">取消預約</h3>
            <p className="mb-6 text-sm text-orbit-500">確定要取消此預約嗎？此操作無法復原。</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelOrder(null)}>
                返回
              </Button>
              <Button variant="danger" onClick={doCancelOrder}>
                取消預約
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 取消整批預約 confirm */}
      {cancelBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-2 font-serif text-lg font-semibold text-orbit-900">取消整批預約</h3>
            <p className="mb-6 text-sm text-orbit-500">此 BatchId 內所有預約會一起取消，此操作無法復原。</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelBatch(null)}>
                返回
              </Button>
              <Button variant="danger" onClick={doCancelBatch}>
                取消整批
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 取消候補 confirm */}
      {cancelWaitlist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-2 font-serif text-lg font-semibold text-orbit-900">取消候補</h3>
            <p className="mb-6 text-sm text-orbit-500">確定要取消這筆候補嗎？取消後排位會釋出給下一位。</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelWaitlist(null)}>
                返回
              </Button>
              <Button variant="danger" onClick={doCancelWaitlist}>
                確定取消
              </Button>
            </div>
          </div>
        </div>
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
/* Bookings tab                                                            */
/* ----------------------------------------------------------------------- */

function BookingsTab({
  bookings,
  expanded,
  setExpanded,
  last5Draft,
  setLast5Draft,
  submitLast5,
  goToPay,
  setCancelOrder,
  setCancelBatch,
  showToast,
}) {
  if (bookings.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
        <div className="text-sm text-orbit-400">尚無訂單</div>
      </Card>
    )
  }

  return (
    <div className="orbit-card overflow-x-auto p-0">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-orbit-border text-xs text-orbit-400">
            {['項目', '狀態', '預約時間', '應付金額', '匯款確認', '建立時間', '操作'].map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const isExpanded = !!expanded[b.id]
            const extraItems = b.itemNames.length - 1
            const canPay = b.orderStatus !== 'CANCELLED' && b.paymentStatus !== 'PAID'
            const canCancel = b.orderStatus !== 'CANCELLED'
            return (
              <tr key={b.id} className="border-b border-orbit-border align-top last:border-0">
                {/* 項目 */}
                <td className="px-4 py-3">
                  <div className="text-orbit-900">
                    {b.itemNames[0]}
                    {b.qty > 1 && <span className="text-orbit-400"> × {b.qty}</span>}
                  </div>
                  {extraItems > 0 && !isExpanded && (
                    <button
                      type="button"
                      className="mt-0.5 text-xs text-orbit-primary hover:underline"
                      onClick={() => setExpanded((s) => ({ ...s, [b.id]: true }))}
                    >
                      展開 +{extraItems}
                    </button>
                  )}
                  {extraItems > 0 && isExpanded && (
                    <div className="mt-1">
                      {b.itemNames.slice(1).map((n) => (
                        <div key={n} className="text-xs text-orbit-400">
                          {n}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="mt-0.5 text-xs text-orbit-primary hover:underline"
                        onClick={() => setExpanded((s) => ({ ...s, [b.id]: false }))}
                      >
                        收合
                      </button>
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {b.isAddon && <Badge>加購</Badge>}
                    {b.batchId && <Badge>整批合計</Badge>}
                  </div>
                  {b.isGroup && b.shareLink && (
                    <div className="mt-2 max-w-xs text-xs text-orbit-400">
                      揪團預約共 {b.groupSize} 位。把以下連結分享給同行者，他們登入後可各自付款加入：
                      <div className="mt-1">
                        <button
                          type="button"
                          className="text-orbit-primary hover:underline"
                          onClick={() => showToast('分享連結給同行者')}
                        >
                          分享連結給同行者
                        </button>
                      </div>
                    </div>
                  )}
                </td>

                {/* 狀態 */}
                <td className="px-4 py-3">
                  <Badge tone={ORDER_STATUS_TONE[b.orderStatus]}>{status.order[b.orderStatus]}</Badge>
                </td>

                {/* 預約時間 */}
                <td className="px-4 py-3 text-xs text-orbit-500">{b.bookingTime}</td>

                {/* 應付金額 */}
                <td className="px-4 py-3">
                  <div className="text-orbit-900">{fmtMoney(b.amount)}</div>
                  {b.isGroup && (
                    <div className="mt-0.5 text-xs text-orbit-400">
                      全額 NT$ {b.amount * b.groupSize} / 人
                    </div>
                  )}
                </td>

                {/* 匯款確認 */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-24"
                      placeholder="後五碼"
                      maxLength={5}
                      defaultValue={b.last5}
                      onChange={(e) =>
                        setLast5Draft((s) => ({ ...s, [b.id]: e.target.value }))
                      }
                    />
                    <Button variant="outline" onClick={() => submitLast5(b)}>
                      填寫末五碼
                    </Button>
                  </div>
                </td>

                {/* 建立時間 */}
                <td className="px-4 py-3 text-xs text-orbit-400">{b.createdTime}</td>

                {/* 操作 */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {canPay && (
                      <Button onClick={goToPay}>
                        {b.batchId ? '前往付款（整批 1 筆）' : '前往付款'}
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          b.batchId ? setCancelBatch(b.batchId) : setCancelOrder(b)
                        }
                      >
                        {b.batchId ? '取消整批（1 筆）' : '取消預約'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Waitlist tab                                                            */
/* ----------------------------------------------------------------------- */

function WaitlistTab({ waitlist, setCancelWaitlist, doConfirmWaitlist }) {
  if (waitlist.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
        <div className="text-sm text-orbit-400">目前沒有候補中的項目</div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {waitlist.map((w) => (
        <Card key={w.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-medium text-orbit-900">{w.itemName || '(未知項目)'}</div>
              <div className="mt-1 text-xs text-orbit-500">預約時段：{w.slotLabel}</div>
              <div className="mt-0.5 text-xs text-orbit-400">加入時間：{w.joinedAt}</div>
              <div className="mt-2">
                <Badge tone="info">目前第 {w.position} 位</Badge>
              </div>
            </div>
            <div className="text-right text-xs text-orbit-400">
              請於 {w.confirmBy} 前確認，逾時自動失效
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelWaitlist(w)}>
              取消候補
            </Button>
            <Button onClick={() => doConfirmWaitlist(w)}>確認報名</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
