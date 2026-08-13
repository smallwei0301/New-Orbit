import { Link, useParams } from 'react-router-dom'
import { Badge, Card } from '../../components/ui/index.jsx'
import { useApi } from '../../lib/useApi.js'
import { dashboardService } from '../../lib/services.js'
import { common } from '../../i18n/strings.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return '早安'
  if (h < 18) return '午安'
  return '晚安'
}

const QUICK_ACTIONS = [
  { path: 'calendar', label: '行事曆', desc: '查看今日預約' },
  { path: 'items', label: '項目管理', desc: '新增或編輯項目' },
  { path: 'orders', label: '預約管理', desc: '處理待確認預約' },
  { path: 'customers', label: '客戶管理', desc: '查看客戶資料' },
  { path: 'resources', label: '資源管理', desc: '管理設備/場地與員工' },
  { path: 'organization', label: '商家設定', desc: '編輯商家資訊' },
]

/** Dashboard overview — reference implementation. */
export default function Overview() {
  const { orgSlug } = useParams()
  const name = '商家'

  const { data, loading } = useApi(() => dashboardService.overview({ orgId: orgSlug }), [])

  const today = data?.today || { confirmed: 0, pending: 0 }
  const pendingCount = data?.pendingCount ?? 0
  const monthRevenue = data?.monthRevenue ?? 0
  const monthConfirmedCount = data?.monthConfirmedCount ?? 0
  const todaySchedule = data?.todaySchedule || []

  const todayTotal = today.confirmed + today.pending

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-orbit-900">
          {greeting()}，{name}
        </h1>
        <p className="mt-1 text-sm text-orbit-400">以下是今天的營運概覽</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-orbit-400">今日預約</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-orbit-900">
            {loading ? common.loading : todayTotal}
          </div>
          <div className="mt-1 text-xs text-orbit-400">
            {!loading && todayTotal === 0
              ? '今日暫無預約'
              : `${today.confirmed} 已確認 · ${today.pending} 待處理`}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-orbit-400">待確認預約</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-orbit-900">
            {loading ? common.loading : pendingCount}
          </div>
          <div className="mt-1 text-xs text-orbit-400">
            {!loading && pendingCount === 0 ? '所有預約已處理完畢' : '點擊前往處理'}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-orbit-400">本月營業額</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-orbit-900">
            {loading ? common.loading : `NT$ ${monthRevenue}`}
          </div>
          <div className="mt-1 text-xs text-orbit-400">{monthConfirmedCount} 筆已確認預約</div>
        </Card>
      </div>

      {/* Today's schedule */}
      <h2 className="mb-3 mt-8 text-sm font-medium text-orbit-500">今日行程</h2>
      <Card>
        {loading ? (
          <div className="text-sm text-orbit-400">{common.loading}</div>
        ) : todaySchedule.length === 0 ? (
          <div className="text-sm text-orbit-400">今日暫無預約</div>
        ) : (
          <div className="divide-y divide-orbit-border">
            {todaySchedule.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-14 shrink-0 text-sm text-orbit-500">{s.time}</div>
                  <div>
                    <div className="text-sm font-medium text-orbit-900">{s.customerName || '未知客戶'}</div>
                    <div className="text-xs text-orbit-400">{s.itemName}</div>
                  </div>
                </div>
                <Badge tone={s.status === 'CONFIRMED' || s.status === '已確認' ? 'success' : 'default'}>
                  {s.status === 'CONFIRMED' || s.status === '已確認' ? '已確認' : '待處理'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <h2 className="mb-3 mt-8 text-sm font-medium text-orbit-500">快速操作</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.path} to={`/${orgSlug}/dashboard/${a.path}`}>
            <Card hover className="h-full">
              <div className="font-medium text-orbit-900">{a.label}</div>
              <div className="mt-1 text-xs text-orbit-400">{a.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
