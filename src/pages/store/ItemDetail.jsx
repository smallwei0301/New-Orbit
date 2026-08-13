import { Link, useParams } from 'react-router-dom'
import { Button, Card, Badge } from '../../components/ui/index.jsx'

/**
 * 商品/服務詳情 — item / package / course detail page.
 * Renders inside StoreLayout. No backend: looks the mock item up by
 * :itemId (falls back to the first mock item so the page never errors).
 */

const MOCK_ITEMS = [
  {
    id: '1',
    mode: 'service',
    name: '皮拉提斯體驗課（單次）',
    description: '適合初學者的一對一體驗課程，教練會依您的身體狀況調整動作強度，穿著寬鬆衣物即可，無需自備器材。',
    deposit: 300,
    duration: 60,
  },
  {
    id: '2',
    mode: 'service',
    name: '手作陶藝揪團體驗',
    description: '3 人成行的手作陶藝體驗，可自行拉坯或捏塑，作品將於燒製完成後通知取件。',
    deposit: 500,
    duration: 90,
    isGroup: true,
    groupSize: 4,
  },
  {
    id: '3',
    mode: 'package',
    name: '10 堂皮拉提斯套票',
    description: '購買後可於半年內自由挑選時段兌換，適合想穩定安排運動習慣的學員。',
    deposit: 0,
    fullPrice: 8000,
    duration: 60,
    sessions: 10,
    remaining: 6,
    capacity: 20,
    period: '購買後 180 天內有效',
    includes: ['皮拉提斯團體課 × 10 堂', '毛巾租借 × 10 次'],
  },
  {
    id: '4',
    mode: 'package',
    name: '限量體驗套票（3 堂）',
    description: '新學員限定的入門套票，包含 3 堂團體課，可挑選任一時段兌換。',
    deposit: 0,
    fullPrice: 2400,
    duration: 45,
    sessions: 3,
    remaining: 0,
    capacity: 20,
    period: '購買後 60 天內有效',
    includes: ['入門團體課 × 3 堂'],
  },
  {
    id: '5',
    mode: 'course',
    name: '瑜伽入門 8 週課程',
    description: '每週固定一堂課，循序漸進帶您熟悉基礎瑜伽體位，適合完全沒有經驗的初學者。',
    deposit: 1200,
    fullPrice: 4800,
    duration: 60,
    weeks: 8,
    remaining: 5,
    capacity: 12,
    period: '2026/09/07 – 2026/10/26，每週一 19:00',
  },
  {
    id: '6',
    mode: 'course',
    name: '熱門街舞體驗班',
    description: '4 週密集班，從基本步伐到完整組合動作，結業前有成果小發表。',
    deposit: 800,
    fullPrice: 3200,
    duration: 75,
    weeks: 4,
    remaining: 0,
    capacity: 10,
    period: '2026/09/02 – 2026/09/23，每週三 20:00',
  },
]

function formatMoney(amount) {
  if (!amount) return '免費'
  return `NT$ ${amount.toLocaleString()}`
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-orbit-400">{label}</span>
      <span className="text-right text-sm font-medium text-orbit-900">{children}</span>
    </div>
  )
}

export default function ItemDetail() {
  const { orgSlug, itemId } = useParams()
  const item = MOCK_ITEMS.find((i) => i.id === itemId) ?? MOCK_ITEMS[0]

  const soldOut = item.mode !== 'service' && item.remaining === 0
  const unit = item.mode === 'package' ? '份' : '位'

  return (
    <div>
      <Link
        to={`/${orgSlug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-orbit-400 hover:text-orbit-primary"
      >
        ← 返回
      </Link>

      <Card className="mb-5 overflow-hidden p-0">
        <div className="flex h-48 items-center justify-center bg-orbit-warm text-sm text-orbit-300">
          商品圖片
        </div>
        <div className="p-6">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {item.mode === 'service' && item.isGroup && <Badge>揪團</Badge>}
            {item.mode === 'package' && <Badge>套票</Badge>}
            {item.mode === 'course' && <Badge>固定場次</Badge>}
            {item.mode !== 'service' &&
              (soldOut ? (
                <Badge tone="danger">
                  {item.mode === 'package' ? `已售完 / 共 ${item.capacity} ${unit}` : `已滿 / 共 ${item.capacity} ${unit}`}
                </Badge>
              ) : (
                <Badge tone="success">{`剩 ${item.remaining} ${unit} / 共 ${item.capacity} ${unit}`}</Badge>
              ))}
          </div>

          <h1 className="mb-2 font-serif text-xl font-semibold text-orbit-900">{item.name}</h1>
          <p className="text-sm leading-relaxed text-orbit-500">{item.description}</p>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-1 font-medium text-orbit-900">費用</h2>
        <div className="divide-y divide-orbit-border">
          <DetailRow label="定金">{formatMoney(item.deposit)}</DetailRow>
          {'fullPrice' in item && <DetailRow label="全額">{formatMoney(item.fullPrice)}</DetailRow>}
          <DetailRow label="服務時長">{`${item.duration} 分鐘`}</DetailRow>
          {'period' in item && <DetailRow label="期間">{item.period}</DetailRow>}
          {'sessions' in item && <DetailRow label="堂數">{`${item.sessions} 堂`}</DetailRow>}
          {'weeks' in item && <DetailRow label="堂數">{`${item.weeks} 堂`}</DetailRow>}
          {item.mode !== 'service' && (
            <DetailRow label="名額">
              {soldOut
                ? (item.mode === 'package' ? `已售完 / 共 ${item.capacity} ${unit}` : `已滿 / 共 ${item.capacity} ${unit}`)
                : `剩 ${item.remaining} ${unit} / 共 ${item.capacity} ${unit}`}
            </DetailRow>
          )}
        </div>

        {item.includes && (
          <div className="mt-4 border-t border-orbit-border pt-4">
            <h3 className="mb-2 text-sm font-medium text-orbit-900">包含項目</h3>
            <ul className="space-y-1">
              {item.includes.map((inc) => (
                <li key={inc} className="text-sm text-orbit-500">
                  {inc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Link to={`/${orgSlug}/calendar?item=${item.id}`} className="block">
        <Button variant="primary" className="w-full justify-center text-base">
          下一步
        </Button>
      </Link>
    </div>
  )
}
