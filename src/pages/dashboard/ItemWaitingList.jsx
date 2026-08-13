import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, PageHeader, Badge } from '../../components/ui/index.jsx'
import { status } from '../../i18n/strings.js'

const STATUS_TONE = {
  WAITING: 'default',
  NOTIFIED: 'info',
  CONVERTED: 'success',
  EXPIRED: 'danger',
  CANCELLED: 'default',
  CLOSED_BY_ORG: 'danger',
}

/** Mock waiting-list entries for a single item / slot. */
const MOCK_ENTRIES = [
  {
    id: 'w-1',
    rank: 1,
    waitStatus: 'WAITING',
    member: '王小明',
    slot: '2026/08/10 19:00',
    joinedAt: '2026/08/03 09:12',
    notifiedAt: null,
    notifyMethod: null,
    deadline: null,
    note: '',
  },
  {
    id: 'w-2',
    rank: 2,
    waitStatus: 'NOTIFIED',
    member: '陳雅婷',
    slot: '2026/08/10 19:00',
    joinedAt: '2026/08/03 10:30',
    notifiedAt: '2026/08/04 08:00',
    notifyMethod: 'LINE',
    deadline: '2026/08/04 20:00',
    note: '希望能坐前排',
  },
  {
    id: 'w-3',
    rank: 3,
    waitStatus: 'EXPIRED',
    member: '李大華',
    slot: '2026/08/10 19:00',
    joinedAt: '2026/08/03 11:05',
    notifiedAt: '2026/08/03 18:00',
    notifyMethod: 'Email',
    deadline: '2026/08/04 06:00',
    note: '',
  },
]

export default function ItemWaitingList() {
  const { orgSlug, itemId } = useParams()
  const navigate = useNavigate()
  const [entries] = useState(MOCK_ENTRIES)

  const goBack = () => {
    if (orgSlug) navigate(`/${orgSlug}/dashboard/items${itemId ? `/${itemId}` : ''}`)
    else navigate(-1)
  }

  return (
    <div>
      <PageHeader
        title="候補名單"
        actions={
          <button
            type="button"
            onClick={goBack}
            className="text-sm text-orbit-500 hover:text-orbit-900"
          >
            返回候補管理
          </button>
        }
      />

      <Card className="p-0">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <div className="text-sm text-orbit-400">目前沒有候補者</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-orbit-400">
                  <th className="px-4 py-3">排位</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">會員</th>
                  <th className="px-4 py-3">預約時段</th>
                  <th className="px-4 py-3">加入時間</th>
                  <th className="px-4 py-3">通知時間/方式</th>
                  <th className="px-4 py-3">期限</th>
                  <th className="px-4 py-3">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orbit-border">
                {entries.map((e) => (
                  <tr key={e.id} className="text-sm text-orbit-700">
                    <td className="px-4 py-3">第 {e.rank} 位</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[e.waitStatus]}>{status.waitlist[e.waitStatus]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-orbit-900">{e.member}</td>
                    <td className="px-4 py-3">{e.slot}</td>
                    <td className="px-4 py-3 text-orbit-400">{e.joinedAt}</td>
                    <td className="px-4 py-3 text-orbit-400">
                      {e.notifiedAt ? `${e.notifiedAt} · ${e.notifyMethod}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-orbit-400">{e.deadline || '—'}</td>
                    <td className="px-4 py-3 text-orbit-400">{e.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
