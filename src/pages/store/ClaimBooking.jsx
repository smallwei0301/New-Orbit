import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'

/**
 * 揪團加入 — customer opens a share link (/:orgSlug/claim/:token) to join a
 * split (揪團) booking created by someone else. No backend: local state
 * drives the four possible screens for demo purposes.
 */

const MOCK_INVITE = {
  bookingTime: '2026-08-15 15:30',
  amount: 800,
  staffLabel: '阿宏',
}

const STATES = [
  ['loading', '載入中'],
  ['invited', '您被邀請加入'],
  ['joined', '已加入揪團預約'],
  ['invalid', '連結無法使用'],
]

function fmtMoney(n) {
  return n > 0 ? `NT$ ${n}` : '免費'
}

export default function ClaimBooking() {
  const { orgSlug } = useParams()
  const [view, setView] = useState('invited')
  const [joining, setJoining] = useState(false)
  const [payingNow, setPayingNow] = useState(false)

  const handleJoin = () => {
    setJoining(true)
    window.setTimeout(() => {
      setJoining(false)
      setView('joined')
    }, 600)
  }

  const handlePay = () => {
    setPayingNow(true)
    window.setTimeout(() => {
      setPayingNow(false)
    }, 600)
  }

  return (
    <div>
      {/* Demo controls — not part of production copy, only to preview states */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs',
              view === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'loading' && (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <div className="text-sm text-orbit-400">載入中...</div>
        </Card>
      )}

      {view === 'invited' && (
        <Card>
          <h1 className="mb-4 font-serif text-xl font-semibold text-orbit-900">您被邀請加入</h1>
          <div className="space-y-2 text-sm text-orbit-700">
            <div>時間：{MOCK_INVITE.bookingTime}</div>
            <div>應付：{fmtMoney(MOCK_INVITE.amount)}</div>
            <div>服務人員 / 設備：{MOCK_INVITE.staffLabel}</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button disabled={joining} onClick={handleJoin}>
              {joining ? '加入中...' : '加入此預約'}
            </Button>
            <Button variant="outline">登入後加入</Button>
          </div>
        </Card>
      )}

      {view === 'joined' && (
        <Card>
          <h1 className="mb-2 font-serif text-xl font-semibold text-orbit-900">已加入揪團預約</h1>
          <p className="mb-6 text-sm text-orbit-500">
            此預約需付款 {fmtMoney(MOCK_INVITE.amount)}，完成後即確認。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={payingNow} onClick={handlePay}>
              {payingNow ? '前往付款中...' : '前往付款'}
            </Button>
            <Link
              to={`/${orgSlug}/orders`}
              className="text-sm text-orbit-primary hover:underline"
            >
              查看我的預約
            </Link>
          </div>
          <p className="mt-4 text-xs text-orbit-400">您可以在「我的預約」查看這筆預約。</p>
        </Card>
      )}

      {view === 'invalid' && (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <h1 className="font-serif text-xl font-semibold text-orbit-900">連結無法使用</h1>
          <p className="text-sm text-orbit-500">此連結已失效或已被其他人加入。</p>
          <Link to={`/${orgSlug}`}>
            <Button variant="outline">回到商家首頁</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
