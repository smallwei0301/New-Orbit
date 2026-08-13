import { useParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui/index.jsx'

/**
 * 客戶詳情 — stub per docs/UI-COPY.md §12.
 * Full profile (consumption history, tags, notes timeline, etc.) is managed
 * inline from the 客戶管理 list; this route is a placeholder for the future
 * dedicated detail view.
 */
export default function CustomerDetail() {
  const { customerId } = useParams()

  return (
    <div>
      <PageHeader title="客戶詳情" />
      <div className="orbit-card flex flex-col items-center justify-center gap-2 p-12 text-center">
        <p className="text-sm text-orbit-500">客戶 ID: {customerId}</p>
        <p className="text-xs text-orbit-400">預約紀錄功能開發中</p>
      </div>
    </div>
  )
}
