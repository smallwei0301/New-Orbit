import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, PageHeader, Badge, Field, Input } from '../../components/ui/index.jsx'
import { status } from '../../i18n/strings.js'

const STAFF_NAMES = ['小美', '阿宏', '雅雯']

/** Deterministic mock order detail, keyed loosely off :orderId. */
function buildMockOrder(orderId) {
  return {
    id: orderId || 'ord_1003',
    itemNames: ['陶藝體驗 2 小時'],
    customer: { name: '李大華', phone: '0933-444-555', email: 'lee.dahua@example.com', isMember: false, isBlacklist: true },
    amount: 800,
    orderStatus: 'UNPAID',
    paymentStatus: 'UNPAID',
    providerLabel: '',
    last5: '32456',
    bookingTime: '2026-08-07 15:30',
    createdTime: '2026-08-02 16:40',
    note: '揪團 3 人，已通知同行者付款。',
    isGroup: true,
    groupSize: 3,
    inviteLink: 'https://orbit.example.com/g/inv_9a8b7c',
    paymentRecords: [{ id: 'p1', amount: 800, method: '銀行轉帳', createdAt: '2026-08-02 16:41' }],
    commissions: [{ id: 'c1', name: '阿宏', amount: 800 }],
  }
}

function useToast() {
  const [toast, setToast] = useState('')
  const show = (msg) => {
    setToast(msg)
    window.clearTimeout(show._t)
    show._t = window.setTimeout(() => setToast(''), 2400)
  }
  return [toast, show]
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const initial = useMemo(() => buildMockOrder(orderId), [orderId])
  const [order, setOrder] = useState(initial)
  const [toast, showToast] = useToast()

  const [showPayments, setShowPayments] = useState(false)
  const [showCommission, setShowCommission] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [editingAmount, setEditingAmount] = useState(false)
  const [editingNote, setEditingNote] = useState(false)

  return (
    <div>
      <PageHeader
        title="預約詳情"
        subtitle={order.id}
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            返回
          </Button>
        }
      />

      {/* Summary card */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-serif text-lg font-semibold text-orbit-900">
              {order.itemNames.join('、')}
            </div>
            <div className="mt-1 text-sm text-orbit-500">
              {order.customer.name} · {order.customer.phone}
            </div>
            <div className="mt-0.5 text-xs text-orbit-400">{order.customer.email}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {order.customer.isMember && <Badge>客戶</Badge>}
              {order.customer.isBlacklist && <Badge tone="danger">黑名單</Badge>}
              {order.isGroup && <Badge tone="info">揪團</Badge>}
            </div>
          </div>
          <div className="text-right">
            <Badge
              tone={
                { CONFIRMED: 'success', PENDING: 'info', UNPAID: 'default', CANCELLED: 'danger' }[
                  order.orderStatus
                ]
              }
            >
              {status.order[order.orderStatus]}
            </Badge>
            <div className="mt-2 font-serif text-2xl font-semibold text-orbit-900">
              NT$ {order.amount}
            </div>
            <div className="mt-1 text-xs text-orbit-400">{status.payment[order.paymentStatus]}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-orbit-border pt-4 text-xs text-orbit-500 sm:grid-cols-2">
          <div>預約 {order.bookingTime}</div>
          <div>建立 {order.createdTime}</div>
          <div>匯款末五碼 {order.last5 || '—'}</div>
          <div>
            {order.providerLabel || '—'} · 付款紀錄（{order.paymentRecords.length} 筆）
          </div>
        </div>
      </Card>

      {/* Note */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-orbit-900">編輯備註</h3>
          {!editingNote && (
            <button
              type="button"
              title={order.note ? '點擊修改備註' : '點擊新增備註'}
              onClick={() => setEditingNote(true)}
              className="text-xs text-orbit-primary hover:underline"
            >
              {order.note ? '點擊修改備註' : '新增備註'}
            </button>
          )}
        </div>
        {editingNote ? (
          <NoteEditor
            initial={order.note}
            onCancel={() => setEditingNote(false)}
            onSave={(note) => {
              setOrder((o) => ({ ...o, note }))
              setEditingNote(false)
              showToast(note ? '備註已更新' : '備註已清空')
            }}
          />
        ) : (
          <p className="text-sm text-orbit-500">{order.note || '（尚未填寫備註）'}</p>
        )}
      </Card>

      {/* Amount */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-orbit-900">修改金額</h3>
          {!editingAmount && (
            <button
              type="button"
              title="點擊修改金額"
              onClick={() => setEditingAmount(true)}
              className="text-xs text-orbit-primary hover:underline"
            >
              點擊修改金額
            </button>
          )}
        </div>
        {editingAmount ? (
          <AmountEditor
            order={order}
            onCancel={() => setEditingAmount(false)}
            onSave={(amount) => {
              setOrder((o) => ({ ...o, amount }))
              setEditingAmount(false)
              showToast('金額已更新')
            }}
            toast={showToast}
          />
        ) : (
          <p className="text-sm text-orbit-500">應收金額 NT$ {order.amount}</p>
        )}
      </Card>

      {/* Action panels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div role="button" tabIndex={0} onClick={() => setShowPayments(true)} className="text-left">
          <Card hover className="h-full cursor-pointer">
            <div className="font-medium text-orbit-900">金流紀錄</div>
            <p className="mt-1 text-xs text-orbit-400">預約金額 NT$ {order.amount}</p>
          </Card>
        </div>
        <div role="button" tabIndex={0} onClick={() => setShowCommission(true)} className="text-left">
          <Card hover className="h-full cursor-pointer">
            <div className="font-medium text-orbit-900">分潤管理</div>
            <p className="mt-1 text-xs text-orbit-400">
              {order.commissions
                ? `合計 NT$ ${order.commissions.reduce((s, c) => s + c.amount, 0)}`
                : '此預約沒有分潤資料（可能尚未產票或為套票兌換券）'}
            </p>
          </Card>
        </div>
        {order.isGroup && (
          <div role="button" tabIndex={0} onClick={() => setShowInvite(true)} className="text-left">
            <Card hover className="h-full cursor-pointer">
              <div className="font-medium text-orbit-900">分享揪團連結</div>
              <p className="mt-1 text-xs text-orbit-400">同行者開啟連結即可加入這個座位並完成付款</p>
            </Card>
          </div>
        )}
      </div>

      {showPayments && (
        <PaymentRecordsModal order={order} onClose={() => setShowPayments(false)} toast={showToast} />
      )}
      {showCommission && (
        <CommissionModal
          order={order}
          onClose={() => setShowCommission(false)}
          onChange={(commissions) => setOrder((o) => ({ ...o, commissions }))}
          toast={showToast}
        />
      )}
      {showInvite && <InviteModal order={order} onClose={() => setShowInvite(false)} toast={showToast} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-orbit-900 px-4 py-2 text-xs text-white shadow-orbit-card">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------------- */

function NoteEditor({ initial, onCancel, onSave }) {
  const [draft, setDraft] = useState(initial || '')
  const [saving, setSaving] = useState(false)
  return (
    <div>
      <textarea
        autoFocus
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="輸入這筆預約的備註"
        className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
      />
      <p className="mt-1 text-xs text-orbit-400">清空後儲存即可移除備註。</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" aria-label="取消" onClick={onCancel}>
          取消
        </Button>
        <Button
          aria-label="儲存金額"
          disabled={saving}
          onClick={() => {
            setSaving(true)
            window.setTimeout(() => {
              onSave(draft)
              setSaving(false)
            }, 300)
          }}
        >
          {saving ? '儲存中…' : '儲存'}
        </Button>
      </div>
    </div>
  )
}

function AmountEditor({ order, onCancel, onSave, toast }) {
  const [amount, setAmount] = useState(String(order.amount))
  const [saving, setSaving] = useState(false)

  const submit = () => {
    if (amount === '') {
      toast('請輸入金額，改成 0 代表這筆不收費')
      return
    }
    const n = Number(amount)
    if (!Number.isInteger(n) || n < 0) {
      toast('請輸入 0 或以上的整數')
      return
    }
    if (n > 9999999) {
      toast('金額不能超過 9,999,999')
      return
    }
    setSaving(true)
    window.setTimeout(() => {
      onSave(n)
      setSaving(false)
    }, 300)
  }

  return (
    <div>
      <Field label="應收金額" hint={`目前為 $${order.amount}。改成 0 代表這筆不收費。`}>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" aria-label="取消" onClick={onCancel}>
          取消
        </Button>
        <Button aria-label="儲存金額" disabled={saving} onClick={submit}>
          {saving ? '儲存中…' : '儲存'}
        </Button>
      </div>
    </div>
  )
}

function PaymentRecordsModal({ order, onClose, toast }) {
  const [records, setRecords] = useState(order.paymentRecords)
  const [deletingId, setDeletingId] = useState(null)

  const remove = (id) => {
    if (!window.confirm('確定要刪除這筆付款紀錄？')) return
    setDeletingId(id)
    window.setTimeout(() => {
      setRecords((r) => r.filter((x) => x.id !== id))
      setDeletingId(null)
      toast('已刪除')
    }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-orbit-card">
        <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">金流紀錄</h3>
        <p className="mb-4 text-xs text-orbit-400">預約金額 NT$ {order.amount}</p>

        {records.length === 0 ? (
          <p className="text-sm text-orbit-400">尚無付款紀錄</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-orbit-border px-3 py-2 text-sm"
              >
                <div>
                  <div className="text-orbit-900">
                    {r.method} · NT$ {r.amount}
                  </div>
                  <div className="mt-0.5 text-xs text-orbit-400">建立 {r.createdAt}</div>
                </div>
                <button
                  type="button"
                  title="刪除這筆紀錄"
                  disabled={deletingId === r.id}
                  onClick={() => remove(r.id)}
                  className="text-xs text-orbit-400 hover:text-orbit-danger"
                >
                  {deletingId === r.id ? '刪除中...' : '刪除這筆紀錄'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline">付款</Button>
          <Button onClick={onClose}>關閉</Button>
        </div>
      </div>
    </div>
  )
}

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
    const rebalanced =
      remaining.length === 0
        ? []
        : remaining.map((c) => ({ ...c, amount: Math.round((order.amount / remaining.length) * 100) / 100 }))
    setCommissions(rebalanced)
    onChange(rebalanced)
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

function InviteModal({ order, onClose, toast }) {
  const [method, setMethod] = useState('sms')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(order.inviteLink)
    } catch {
      /* clipboard may be unavailable in sandbox */
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const send = () => {
    if (method === 'sms' && !phone.trim()) {
      toast('請輸入手機號碼')
      return
    }
    if (method === 'email') {
      if (!email.trim()) {
        toast('請輸入 Email')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast('Email 格式不正確')
        return
      }
    }
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      toast('發送')
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-orbit-card">
        <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">分享揪團連結</h3>
        <p className="mb-4 text-xs text-orbit-400">同行者開啟連結即可加入這個座位並完成付款</p>

        <div className="flex gap-2">
          <Input readOnly value={order.inviteLink} />
          <Button variant="outline" onClick={copyLink}>
            {copied ? '複製連結' : '複製'}
          </Button>
        </div>

        <h4 className="mb-2 mt-6 text-sm font-medium text-orbit-700">通知同行者</h4>
        <div className="mb-3 flex gap-2">
          {[
            ['sms', '簡訊'],
            ['email', 'Email'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMethod(key)}
              className={
                'rounded-full px-4 py-1.5 text-sm ' +
                (method === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500')
              }
            >
              {label}
            </button>
          ))}
        </div>

        {method === 'sms' ? (
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="手機號碼（例：0912345678）"
          />
        ) : (
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email 地址" />
        )}

        <p className="mt-3 text-xs leading-relaxed text-orbit-400">
          收件者不必是會員。訊息內容可至「通知設定 → 揪團邀請」自訂。
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            關閉
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? '發送中…' : '發送'}
          </Button>
        </div>
      </div>
    </div>
  )
}
