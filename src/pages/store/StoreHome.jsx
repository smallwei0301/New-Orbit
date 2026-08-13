import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, Badge } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'

/**
 * 顧客端首頁 — public storefront / product listing page.
 * Renders inside StoreLayout (max-w-3xl column). No backend: all data is
 * local mock state so the three category tabs and the 加入候補 modal are
 * fully interactive without any network calls.
 */

// Item "modes" mirror production: SERVICE=任選時段, PACKAGE=套票, COURSE=固定場次.
const MOCK_ITEMS = [
  {
    id: '1',
    mode: 'service',
    name: '皮拉提斯體驗課（單次）',
    deposit: 300,
    duration: 60,
    isGroup: false,
    remaining: null,
    capacity: null,
  },
  {
    id: '2',
    mode: 'service',
    name: '手作陶藝揪團體驗',
    deposit: 500,
    duration: 90,
    isGroup: true,
    groupSize: 4,
    remaining: null,
    capacity: null,
  },
  {
    id: '3',
    mode: 'package',
    name: '10 堂皮拉提斯套票',
    deposit: 0,
    fullPrice: 8000,
    duration: 60,
    sessions: 10,
    remaining: 6,
    capacity: 20,
  },
  {
    id: '4',
    mode: 'package',
    name: '限量體驗套票（3 堂）',
    deposit: 0,
    fullPrice: 2400,
    duration: 45,
    sessions: 3,
    remaining: 0,
    capacity: 20,
  },
  {
    id: '5',
    mode: 'course',
    name: '瑜伽入門 8 週課程',
    deposit: 1200,
    duration: 60,
    weeks: 8,
    remaining: 5,
    capacity: 12,
  },
  {
    id: '6',
    mode: 'course',
    name: '熱門街舞體驗班',
    deposit: 800,
    duration: 75,
    weeks: 4,
    remaining: 0,
    capacity: 10,
  },
]

const TABS = [
  { key: 'service', label: '任選時段' },
  { key: 'package', label: '套票' },
  { key: 'course', label: '固定場次' },
]

const EMPTY_TEXT = {
  service: '目前尚無項目',
  package: '目前尚無套票',
  course: '目前尚無場次',
}

function formatMoney(amount) {
  if (!amount) return '免費'
  return `NT$ ${amount.toLocaleString()}`
}

function AvailabilityBadge({ item }) {
  if (item.mode === 'service') return null
  const unit = item.mode === 'package' ? '份' : '位'
  if (item.remaining === 0) {
    return (
      <Badge tone="danger">
        {item.mode === 'package' ? `已售完 / 共 ${item.capacity} ${unit}` : `已滿 / 共 ${item.capacity} ${unit}`}
      </Badge>
    )
  }
  return (
    <Badge tone="success">
      {`剩 ${item.remaining} ${unit} / 共 ${item.capacity} ${unit}`}
    </Badge>
  )
}

function ctaLabel(item) {
  const soldOut = item.mode !== 'service' && item.remaining === 0
  if (soldOut) return '加入候補 →'
  if (item.mode === 'service') return item.isGroup ? '揪團預約 →' : '預約 →'
  if (item.mode === 'package') return '購買 →'
  return '報名 →'
}

function ItemCard({ item, orgSlug, onWaitlist }) {
  const soldOut = item.mode !== 'service' && item.remaining === 0

  const handleCta = (e) => {
    if (soldOut) {
      e.preventDefault()
      onWaitlist(item)
    }
  }

  return (
    <Card hover className="flex flex-col p-0 overflow-hidden">
      <Link to={`/${orgSlug}/items/${item.id}`} className="block">
        <div className="flex h-32 items-center justify-center bg-orbit-warm text-xs text-orbit-300">
          商品圖片
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.mode === 'service' && item.isGroup && <Badge>揪團</Badge>}
          {item.mode === 'package' && <Badge>套票</Badge>}
          {item.mode === 'course' && <Badge>固定場次</Badge>}
          <AvailabilityBadge item={item} />
        </div>

        <Link to={`/${orgSlug}/items/${item.id}`} className="font-medium text-orbit-900 hover:text-orbit-primary">
          {item.name}
        </Link>

        <div className="text-sm text-orbit-500">
          {item.mode === 'package' ? (
            <span>總價 {formatMoney(item.fullPrice)}</span>
          ) : (
            <span>定金 {formatMoney(item.deposit)}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-orbit-400">
          <span>{`${item.duration} 分鐘`}</span>
          {item.mode === 'package' && <span>{`共 ${item.sessions} 堂`}</span>}
          {item.mode === 'course' && <span>{`${item.weeks} 週`}</span>}
        </div>

        <div className="mt-auto pt-2">
          <Link to={`/${orgSlug}/items/${item.id}`} onClick={handleCta} className="block">
            <Button variant={soldOut ? 'outline' : 'primary'} className="w-full justify-center">
              {ctaLabel(item)}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default function StoreHome() {
  const { orgSlug } = useParams()
  const [tab, setTab] = useState('service')
  const [waitlistItem, setWaitlistItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const counts = {
    service: MOCK_ITEMS.filter((i) => i.mode === 'service').length,
    package: MOCK_ITEMS.filter((i) => i.mode === 'package').length,
    course: MOCK_ITEMS.filter((i) => i.mode === 'course').length,
  }

  const visible = MOCK_ITEMS.filter((i) => i.mode === tab)

  const openWaitlist = (item) => setWaitlistItem(item)
  const closeWaitlist = () => {
    if (submitting) return
    setWaitlistItem(null)
  }

  const confirmWaitlist = () => {
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setWaitlistItem(null)
    }, 600)
  }

  return (
    <div>
      <div className="mb-8 rounded-2xl bg-white p-6 text-center orbit-card">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-orbit-warm font-logo text-xl font-semibold text-orbit-primary">
          示
        </div>
        <h1 className="font-serif text-xl font-semibold text-orbit-900">示範商家</h1>
        <p className="mt-1 text-sm text-orbit-400">歡迎預約，探索以下項目、套票與固定場次</p>
      </div>

      <h2 className="mb-4 font-serif text-lg font-semibold text-orbit-900">探索項目</h2>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm',
              tab === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
            )}
          >
            {`${label} (${counts[key]})`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-orbit-border p-10 text-center text-sm text-orbit-400">
          {EMPTY_TEXT[tab]}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((item) => (
            <ItemCard key={item.id} item={item} orgSlug={orgSlug} onWaitlist={openWaitlist} />
          ))}
        </div>
      )}

      {waitlistItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 font-serif text-lg font-semibold text-orbit-900">
              {`加入候補：${waitlistItem.name}`}
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-orbit-500">
              此項目目前已額滿。加入候補後，若有人取消，我們會依序通知您，您需在 12 小時內確認報名，逾時將自動遞補下一位。
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 justify-center" onClick={closeWaitlist} disabled={submitting}>
                再想想
              </Button>
              <Button variant="primary" className="flex-1 justify-center" onClick={confirmWaitlist} disabled={submitting}>
                {submitting ? '處理中…' : '確定加入候補'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
