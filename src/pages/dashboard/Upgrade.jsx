import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, PageHeader, Badge } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { pages } from '../../i18n/strings.js'
import { PLANS } from '../../config/tenant.js'
import { subscriptionService } from '../../lib/services.js'
import { useApi, useMutation } from '../../lib/useApi.js'

const PLAN_DEFS = [
  {
    key: 'SOLO',
    name: PLANS.SOLO.name,
    monthly: PLANS.SOLO.monthly,
    annualMonthly: 0,
    badge: null,
    features: [
      '客戶資料管理',
      'LINE/Email 通知 (50則／月)',
      '簡訊通知 (5則／月)',
      'AI 對話量 3M credits／月',
      '自動對帳',
      'LINE 客服機器人',
      'LINE 官方帳號整合',
      '預約統計',
      '定金收款',
      '品牌預約頁',
      '批次匯入資料 (無痛轉移)',
    ],
  },
  {
    key: 'MULTI',
    name: PLANS.MULTI.name,
    monthly: PLANS.MULTI.monthly,
    annualMonthly: 490,
    badge: '最多人選擇',
    features: [
      'LINE/Email 通知 (500則／月)',
      '簡訊通知 (150則／月)',
      'AI 對話量 15M credits／月',
      '多人帳號管理',
      '行事曆同步',
      '員工業績報表',
      '員工排程管理',
      '客製預約頁',
      '客戶黑名單',
      '顧客備註',
    ],
  },
  {
    key: 'SYSTEM',
    name: PLANS.SYSTEM.name,
    monthly: PLANS.SYSTEM.monthly,
    annualMonthly: 1990,
    badge: '限時優惠',
    features: [
      'LINE/Email 通知 (2000則／月)',
      '簡訊通知 (600則／月)',
      'AI 對話量 60M credits／月',
      '線上金流收款',
      '客戶廣播訊息',
      '自動再行銷',
      '會員分級',
      '點數制度',
      '客製預約頁（無浮水印）',
      '電子發票整合',
    ],
  },
  {
    key: 'UNIVERSE',
    name: PLANS.UNIVERSE.name,
    monthly: PLANS.UNIVERSE.monthly,
    annualMonthly: 4990,
    badge: null,
    features: [
      'LINE/Email 通知 (10000則／月)',
      '簡訊通知 (1500則／月)',
      'AI 對話量 150M credits／月',
      '會員訂閱制',
      '自訂網域',
      '優先客服',
      'API 串接',
      '客戶分群',
      '技術支援',
    ],
  },
]

const FILTERS = ['全部', '已付款', '失敗', '處理中', '已退款']

const STATUS_LABELS = {
  PAID: '已付款',
  FAILED: '失敗',
  PROCESSING: '處理中',
  REFUNDED: '已退款',
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

function statusTone(status) {
  if (status === 'PAID') return 'success'
  if (status === 'FAILED') return 'danger'
  return 'default'
}

/** Format raw credit counts as e.g. `6.2M` / `15M`, trimming a trailing `.0`. */
function fmtCredits(n) {
  const millions = Number(n || 0) / 1_000_000
  const rounded = Math.round(millions * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}M`
}

/** 訂閱方案 — plan comparison, billing cycle toggle, AI quota, subscription history. */
export default function Upgrade() {
  const { orgSlug } = useParams()

  const {
    data: subscription,
    loading: subLoading,
    reload: reloadSubscription,
  } = useApi(() => subscriptionService.me({ orgId: orgSlug }), [orgSlug], { fallback: null })

  const {
    data: payments,
    loading: paymentsLoading,
    reload: reloadPayments,
  } = useApi(() => subscriptionService.payments({ orgId: orgSlug }), [orgSlug], { fallback: [] })

  const [annual, setAnnual] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)
  const [filter, setFilter] = useState('全部')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [toast, setToast] = useState('')
  const [upgradingKey, setUpgradingKey] = useState(null)

  const { run: runCancel, saving: cancelling } = useMutation(subscriptionService.cancel)
  const { run: runUpgrade } = useMutation(subscriptionService.upgrade)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3200)
  }

  const history = payments || []
  const currentPlanKey = subscription?.plan

  const filteredHistory =
    filter === '全部' ? history : history.filter((h) => statusLabel(h.status) === filter)

  const handleCancel = async () => {
    try {
      await runCancel({ orgId: orgSlug })
      setShowCancelConfirm(false)
      showToast('已取消，目前週期結束後將降為個人版')
      reloadSubscription()
    } catch (e) {
      showToast('取消失敗')
    }
  }

  const handleUpgrade = async (key) => {
    setUpgradingKey(key)
    try {
      await runUpgrade(key, { orgId: orgSlug })
      reloadSubscription()
    } catch (e) {
      showToast('升級失敗，請稍後再試')
    } finally {
      setUpgradingKey(null)
    }
  }

  return (
    <div>
      <PageHeader title={pages.upgrade.title} subtitle={pages.upgrade.subtitle} />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm text-orbit-400">當前方案</div>
          </div>
          {subLoading ? (
            <div className="mt-2 text-sm text-orbit-400">載入中…</div>
          ) : (
            <>
              <div className="mt-2 font-serif text-2xl font-semibold text-orbit-900">
                {subscription?.planDisplayName}
              </div>
              <p className="mt-1 text-xs text-orbit-400">
                目前週期至 {subscription?.periodEnd}
                {subscription?.isCancelled && '（已取消，到期後停用）'}
              </p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={currentPlanKey === 'SOLO' || subscription?.isCancelled}
                >
                  {cancelling ? '取消中...' : '取消訂閱'}
                </Button>
              </div>
            </>
          )}
        </Card>
        <Card>
          <div className="text-sm text-orbit-400">本月 AI 額度</div>
          {subLoading ? (
            <div className="mt-2 text-sm text-orbit-400">載入中…</div>
          ) : (
            <>
              <div className="mt-2 font-serif text-2xl font-semibold text-orbit-900">
                {fmtCredits(subscription?.aiCreditsUsed)} / {fmtCredits(subscription?.aiCreditsTotal)} credits
              </div>
              <p className="mt-1 text-xs text-orbit-400">下次重置：下個月 1 號</p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => setShowTopUp(true)}>
                  加購額度
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Billing toggle */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <button
          onClick={() => setAnnual(false)}
          className={clsx(
            'rounded-full px-4 py-1.5 text-sm',
            !annual ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
          )}
        >
          月繳
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={clsx(
            'rounded-full px-4 py-1.5 text-sm',
            annual ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
          )}
        >
          年繳（享優惠）
        </button>
      </div>

      {/* Plan cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_DEFS.map((plan) => {
          const isCurrent = plan.key === currentPlanKey
          const isDowngrade =
            currentPlanKey &&
            PLAN_DEFS.findIndex((p) => p.key === plan.key) <
              PLAN_DEFS.findIndex((p) => p.key === currentPlanKey)
          const price = annual ? plan.annualMonthly : plan.monthly
          return (
            <Card key={plan.key} className={clsx(isCurrent && 'ring-2 ring-orbit-primary')}>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium text-orbit-900">{plan.name}</div>
                {plan.badge && <Badge tone="info">{plan.badge}</Badge>}
              </div>
              <div className="font-serif text-2xl font-semibold text-orbit-900">
                {price === 0 ? '免費方案' : `NT$${price}`}
                {price > 0 && <span className="text-sm font-normal text-orbit-400">/月</span>}
              </div>
              {annual && price > 0 && (
                <div className="mt-1 text-xs text-orbit-400">年繳一次 NT${price * 12}</div>
              )}
              <ul className="mt-4 space-y-1.5 text-xs text-orbit-500">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="text-orbit-success">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    目前方案
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={upgradingKey === plan.key}
                  >
                    {upgradingKey === plan.key
                      ? '處理中...'
                      : isDowngrade
                        ? '降級至此方案'
                        : '升級至此方案'}
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Subscription history */}
      <Card className="!p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
          <h3 className="font-medium text-orbit-900">訂閱紀錄</h3>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs',
                  filter === f ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {paymentsLoading ? (
          <div className="p-10 text-center text-sm text-orbit-400">載入中…</div>
        ) : history.length === 0 ? (
          <div className="p-10 text-center text-sm text-orbit-400">尚無付款紀錄</div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-10 text-center text-sm text-orbit-400">沒有符合篩選條件的紀錄</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-orbit-border text-left text-xs text-orbit-400">
                <th className="px-6 py-3 font-medium">日期</th>
                <th className="px-6 py-3 font-medium">方案</th>
                <th className="px-6 py-3 font-medium">週期</th>
                <th className="px-6 py-3 font-medium">金額</th>
                <th className="px-6 py-3 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((h) => (
                <tr key={h.id} className="border-b border-orbit-border last:border-0">
                  <td className="px-6 py-3 text-orbit-500">{h.date}</td>
                  <td className="px-6 py-3 text-orbit-900">{h.plan}</td>
                  <td className="px-6 py-3 text-orbit-500">{h.cycle}</td>
                  <td className="px-6 py-3 text-orbit-500">NT${h.amount}</td>
                  <td className="px-6 py-3">
                    <Badge tone={statusTone(h.status)}>{statusLabel(h.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-orbit-900">加購 AI 額度</h2>
            <p className="text-sm text-orbit-500">
              AI 額度每 100 萬 credits NT$100。本月額度用完後，可透過官方 LINE 聯繫我們，由專人為您加值。
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowTopUp(false)}>
                取消
              </Button>
              <Button onClick={() => setShowTopUp(false)}>前往 LINE 聯繫</Button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-orbit-900">取消訂閱</h2>
            <p className="text-sm text-orbit-500">確定要取消訂閱嗎？目前週期結束前仍可正常使用</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>
                取消
              </Button>
              <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? '取消中...' : '取消訂閱'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-orbit-900 px-4 py-2 text-sm text-white shadow-orbit-card">
          {toast}
        </div>
      )}
    </div>
  )
}
