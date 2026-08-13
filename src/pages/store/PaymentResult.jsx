import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'

/**
 * 付款結果 (/:orgSlug/payment-result) — landing page after redirecting back
 * from a payment provider. In production the ?status= query param drives
 * this; here it's local state (default 'success') with preview buttons.
 */

const RESULTS = {
  loading: { key: 'loading' },
  success: { title: '付款成功', message: '已完成預約' },
  failed: { title: '付款失敗', message: '請至「我的預約」重試或改用其他付款方式' },
  processing: {
    title: '付款處理中',
    message: '系統仍在與金流業者確認付款結果，可至「我的預約」確認最新狀態',
  },
}

const PREVIEW_STATES = [
  ['loading', '確認付款中'],
  ['success', '付款成功'],
  ['failed', '付款失敗'],
  ['processing', '付款處理中'],
]

export default function PaymentResult() {
  const { orgSlug } = useParams()
  const [status, setStatus] = useState('success')
  const result = RESULTS[status]

  return (
    <div>
      {/* Demo controls — not part of production copy, only to preview states */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PREVIEW_STATES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs',
              status === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {status === 'loading' ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <div className="text-sm font-medium text-orbit-500">確認付款中...</div>
          <p className="text-xs text-orbit-400">請稍候</p>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <h1 className="font-serif text-xl font-semibold text-orbit-900">{result.title}</h1>
          <p className="max-w-md text-sm text-orbit-500">{result.message}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to={`/${orgSlug}/orders`}>
              <Button>查看我的預約</Button>
            </Link>
            <Link to={`/${orgSlug}`}>
              <Button variant="outline">回首頁</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
