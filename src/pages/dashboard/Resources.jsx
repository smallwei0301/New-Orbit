import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, PageHeader, Badge, Field, Input } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { enums } from '../../i18n/strings.js'
import { resourceService } from '../../lib/services.js'
import { useApi, useMutation, errorMessage } from '../../lib/useApi.js'

/**
 * 資源管理 — list of EQUIPMENT / STAFF resources used to gate booking
 * availability. Staff resources can be bound to a user account via email
 * invitation; equipment/venue resources cannot.
 */


const FILTERS = [
  { key: 'ALL', label: '全部' },
  { key: 'EQUIPMENT', label: enums.resourceType.EQUIPMENT },
  { key: 'STAFF', label: enums.resourceType.STAFF },
]

const STAFF_STATUS_LABEL = {
  PENDING: '待啟用',
  ACTIVE: '已啟用',
}

const MOCK_ORDERS = [
  { date: '2026-08-01', customer: '林小姐', item: '剪髮', orderAmount: 800, paidAmount: 800, staffCount: 1 },
  { date: '2026-08-02', customer: '陳先生', item: '染髮', orderAmount: 2400, paidAmount: 2400, staffCount: 2 },
  { date: '2026-08-03', customer: '王小姐', item: '燙髮', orderAmount: 3200, paidAmount: 1600, staffCount: 1 },
]

const COMMISSION_RATE = 0.3

function fmtMoney(n) {
  return `NT$ ${Number(n || 0).toLocaleString('zh-TW')}`
}

export default function Resources() {
  const { orgSlug } = useParams()
  const ORG_ID = orgSlug
  const navigate = useNavigate()

  const [filter, setFilter] = useState('ALL')

  const {
    data: resources,
    loading: resourcesLoading,
    reload,
    setData: setResources,
  } = useApi(() => resourceService.list({ orgId: ORG_ID, type: filter }), [filter], { fallback: [] })

  const [inviteTarget, setInviteTarget] = useState(null) // resource
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null) // resource
  const [revenueTarget, setRevenueTarget] = useState(null) // resource

  const { run: runRemove, saving: deleting } = useMutation(resourceService.remove)

  const filtered = resources || []

  const goTo = (path) => navigate(`/${orgSlug}/dashboard/${path}`)

  const openInvite = (resource) => {
    setInviteTarget(resource)
    setInviteEmail('')
  }

  const submitInvite = () => {
    if (!inviteTarget || !inviteEmail.trim()) return
    setInviteSending(true)
    setTimeout(() => {
      setResources((list) =>
        (list || []).map((r) =>
          r.id === inviteTarget.id
            ? { ...r, staffEmail: inviteEmail.trim(), staffStatus: 'PENDING' }
            : r
        )
      )
      setInviteSending(false)
      setInviteTarget(null)
      setInviteEmail('')
    }, 400)
  }

  const resendInvite = (resource) => {
    // 重送邀請信 — status stays PENDING
    setResources((list) => (list || []).map((r) => (r.id === resource.id ? { ...r } : r)))
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await runRemove(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (e) {
      setDeleteTarget(null)
      alert(errorMessage(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="資源管理"
        subtitle="管理設備/場地、人員等預約所需資源"
        actions={<Button onClick={() => goTo('resources/new')}>新增資源</Button>}
      />

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm',
              filter === f.key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {resourcesLoading ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <div className="text-sm text-orbit-400">載入中...</div>
        </Card>
      ) : filter === 'ALL' && filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <div className="text-sm font-medium text-orbit-500">尚未建立任何資源</div>
          <p className="max-w-md text-xs leading-relaxed text-orbit-400">
            資源可以是設備/場地（如洗頭槽、美容床、診療間）或員工（如設計師、美容師），用來管理預約時段的可用性
          </p>
          <Button className="mt-2" onClick={() => goTo('resources/new')}>
            建立第一個資源
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <div className="text-sm font-medium text-orbit-500">此分類下沒有資源</div>
          <p className="max-w-md text-xs leading-relaxed text-orbit-400">
            切換到其他分類查看，或新增此分類的資源
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-orbit-border text-xs text-orbit-400">
                <th className="px-4 py-3 font-medium">名稱</th>
                <th className="px-4 py-3 font-medium">類型</th>
                <th className="px-4 py-3 font-medium">共用人數</th>
                <th className="px-4 py-3 font-medium">本月分潤</th>
                <th className="px-4 py-3 font-medium">綁定帳號</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-orbit-border last:border-0">
                  <td className="px-4 py-3 font-medium text-orbit-900">{r.name}</td>
                  <td className="px-4 py-3 text-orbit-500">
                    <Badge>{r.type === 'EQUIPMENT' ? '設備' : '員工'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-orbit-500">{`共用 ${r.capacity} 人`}</td>
                  <td className="px-4 py-3 text-orbit-500">
                    {r.type === 'STAFF' ? (
                      <button
                        onClick={() => setRevenueTarget(r)}
                        title="本月分潤"
                        className="text-orbit-primary hover:underline"
                      >
                        {fmtMoney(r.monthlyCommission)}
                      </button>
                    ) : (
                      <span className="text-orbit-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.type !== 'STAFF' ? (
                      <span className="text-orbit-300">—</span>
                    ) : r.staffEmail ? (
                      <div className="flex items-center gap-2">
                        <span className="text-orbit-700">{r.staffEmail}</span>
                        <Badge tone={r.staffStatus === 'ACTIVE' ? 'success' : 'default'}>
                          {STAFF_STATUS_LABEL[r.staffStatus]}
                        </Badge>
                        {r.staffStatus === 'PENDING' && (
                          <button
                            onClick={() => resendInvite(r)}
                            className="text-xs text-orbit-primary hover:underline"
                          >
                            重送
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => openInvite(r)}
                        className="text-xs text-orbit-primary hover:underline"
                      >
                        邀請員工
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-orbit-400">
                      <Link
                        to={`/${orgSlug}/dashboard/calendar`}
                        title="使用日曆"
                        className="hover:text-orbit-primary"
                      >
                        日曆
                      </Link>
                      <button
                        title="編輯"
                        onClick={() => goTo(`resources/${r.id}`)}
                        className="hover:text-orbit-primary"
                      >
                        編輯
                      </button>
                      <button
                        title="設定休假"
                        onClick={() => goTo(`resources/${r.id}?leave=1`)}
                        className="hover:text-orbit-primary"
                      >
                        休假
                      </button>
                      <button
                        title="刪除"
                        onClick={() => setDeleteTarget(r)}
                        className="hover:text-orbit-danger"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* 邀請員工 modal */}
      {inviteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-orbit-900">邀請員工</h3>
            <p className="mt-1 text-xs text-orbit-400">
              為「{inviteTarget.name}」綁定一位員工。系統會建立使用者帳號（若不存在）並寄出啟用連結。
            </p>
            <div className="mt-4">
              <Field label="員工 Email">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="staff@example.com"
                  autoFocus
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setInviteTarget(null)} disabled={inviteSending}>
                取消
              </Button>
              <Button onClick={submitInvite} disabled={inviteSending || !inviteEmail.trim()}>
                {inviteSending ? '寄送中...' : '送出邀請'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除資源 modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-serif text-lg font-semibold text-orbit-900">刪除資源</h3>
            <p className="mt-2 text-sm text-orbit-500">
              確定要刪除「{deleteTarget.name}」嗎？刪除後無法復原，且與此資源相關的預約設定將會受到影響。
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                取消
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? '刪除中...' : '確定刪除'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 營業額與分潤 modal */}
      {revenueTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-orbit-900">
                {revenueTarget.name} 營業額與分潤
              </h3>
              <button
                onClick={() => setRevenueTarget(null)}
                className="text-orbit-400 hover:text-orbit-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-orbit-warm p-4">
                <div className="text-xs text-orbit-400">營業額</div>
                <div className="mt-1 font-serif text-xl font-semibold text-orbit-900">
                  {fmtMoney(MOCK_ORDERS.reduce((s, o) => s + o.orderAmount, 0))}
                </div>
              </div>
              <div className="rounded-xl bg-orbit-warm p-4">
                <div className="text-xs text-orbit-400">分潤</div>
                <div className="mt-1 font-serif text-xl font-semibold text-orbit-900">
                  {fmtMoney(
                    Math.round(
                      MOCK_ORDERS.reduce((s, o) => s + (o.paidAmount * COMMISSION_RATE) / o.staffCount, 0)
                    )
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-orbit-warm p-4">
                <div className="text-xs text-orbit-400">預約數</div>
                <div className="mt-1 font-serif text-xl font-semibold text-orbit-900">
                  {MOCK_ORDERS.length}
                </div>
              </div>
            </div>

            <h4 className="mb-2 mt-6 text-sm font-medium text-orbit-700">已確認預約明細</h4>
            {MOCK_ORDERS.length === 0 ? (
              <p className="py-8 text-center text-sm text-orbit-400">此期間無已確認預約</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-orbit-border text-xs text-orbit-400">
                      <th className="px-3 py-2 font-medium">預約日期</th>
                      <th className="px-3 py-2 font-medium">客戶</th>
                      <th className="px-3 py-2 font-medium">項目</th>
                      <th className="px-3 py-2 font-medium">預約金額</th>
                      <th className="px-3 py-2 font-medium">付款金額</th>
                      <th className="px-3 py-2 font-medium">分潤</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_ORDERS.map((o, i) => (
                      <tr key={i} className="border-b border-orbit-border last:border-0">
                        <td className="px-3 py-2 text-orbit-700">{o.date}</td>
                        <td className="px-3 py-2 text-orbit-700">{o.customer}</td>
                        <td className="px-3 py-2 text-orbit-700">{o.item}</td>
                        <td className="px-3 py-2 text-orbit-700">{fmtMoney(o.orderAmount)}</td>
                        <td className="px-3 py-2 text-orbit-700">{fmtMoney(o.paidAmount)}</td>
                        <td className="px-3 py-2 text-orbit-700">
                          {fmtMoney(Math.round((o.paidAmount * COMMISSION_RATE) / o.staffCount))}
                          {o.staffCount > 1 && (
                            <span className="ml-1 text-xs text-orbit-400">({o.staffCount} 人平分)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => setRevenueTarget(null)}>
                關閉
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
