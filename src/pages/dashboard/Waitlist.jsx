import { useParams } from 'react-router-dom'
import { Card, PageHeader, Button } from '../../components/ui/index.jsx'
import { pages } from '../../i18n/strings.js'
import { waitlistService } from '../../lib/services.js'
import { useApi } from '../../lib/useApi.js'

/** 候補管理 — waitlist overview across fixed-session / free-slot items. */
export default function Waitlist() {
  const { orgSlug } = useParams()

  const { data: rows, loading } = useApi(
    () => waitlistService.list({ orgId: orgSlug }),
    [orgSlug],
    { fallback: [] }
  )

  const list = rows || []
  const totalItems = list.length
  const totalWaiting = list.reduce((sum, r) => sum + r.waiting, 0)
  const totalNotified = list.reduce((sum, r) => sum + r.notified, 0)

  return (
    <div>
      <PageHeader title={pages.waitlist.title} subtitle={pages.waitlist.subtitle} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-orbit-400">有候補的項目 / 時段</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-orbit-900">{totalItems}</div>
        </Card>
        <Card>
          <div className="text-sm text-orbit-400">候補中人次</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-orbit-900">{totalWaiting}</div>
        </Card>
        <Card>
          <div className="text-sm text-orbit-400">已通知待確認</div>
          <div className="mt-2 font-serif text-3xl font-semibold text-orbit-900">{totalNotified}</div>
        </Card>
      </div>

      <Card className="!p-0">
        {loading ? (
          <div className="p-10 text-center text-sm text-orbit-400">載入中…</div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-sm text-orbit-400">目前沒有候補中的項目</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orbit-border text-left text-xs text-orbit-400">
                <th className="px-6 py-3 font-medium">項目</th>
                <th className="px-6 py-3 font-medium">開始時間</th>
                <th className="px-6 py-3 font-medium">容量</th>
                <th className="px-6 py-3 font-medium">候補中</th>
                <th className="px-6 py-3 font-medium">待確認</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-orbit-border last:border-0">
                  <td className="px-6 py-3">
                    <div className="font-medium text-orbit-900">{r.itemName || '(未知項目)'}</div>
                  </td>
                  <td className="px-6 py-3 text-orbit-500">{r.startAt}</td>
                  <td className="px-6 py-3 text-orbit-500">{r.capacity}</td>
                  <td className="px-6 py-3 text-orbit-500">{r.waiting}</td>
                  <td className="px-6 py-3 text-orbit-500">{r.notified}</td>
                  <td className="px-6 py-3">
                    <Button variant="outline">查看</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
