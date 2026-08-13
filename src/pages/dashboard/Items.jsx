import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, PageHeader, Badge, Input } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { enums, common } from '../../i18n/strings.js'
import { itemService } from '../../lib/services.js'
import { useApi, useMutation } from '../../lib/useApi.js'

const TYPE_FILTERS = [
  { value: 'all', label: '全部類型' },
  { value: 'SERVICE', label: enums.itemMode.SERVICE },
  { value: 'COURSE', label: enums.itemMode.COURSE },
  { value: 'PACKAGE', label: enums.itemMode.PACKAGE },
]

const STATUS_FILTERS = [
  { value: 'all', label: '全部上架狀態' },
  { value: 'active', label: '上架中' },
  { value: 'not_started', label: '未開始' },
  { value: 'ended', label: '已結束' },
  { value: 'unpublished', label: '已下架' },
]

export default function Items() {
  const { orgSlug } = useParams()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)

  const {
    data: items,
    loading,
    reload,
    setData: setItems,
  } = useApi(
    () => itemService.list({ orgId: orgSlug, mode: typeFilter === 'all' ? 'ALL' : typeFilter, search }),
    [typeFilter, search],
    { fallback: [] }
  )

  const { run: runDelete, saving: deleting } = useMutation((id) => itemService.remove(id))

  const filtered = useMemo(() => {
    const list = items || []
    return list.filter((it) => {
      if (statusFilter === 'active' && !it.isPublished) return false
      if (statusFilter === 'unpublished' && it.isPublished) return false
      if (statusFilter === 'not_started' || statusFilter === 'ended') return false
      return true
    })
  }, [items, statusFilter])

  const hasAnyItems = (items || []).length > 0
  const isFiltering = typeFilter !== 'all' || statusFilter !== 'all' || Boolean(search.trim())

  const toggleSelect = (id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await runDelete(deleteTarget.id)
      setSelected((s) => s.filter((x) => x !== deleteTarget.id))
      setDeleteTarget(null)
      reload()
    } catch {
      /* mutation error is surfaced via useMutation's error state */
    }
  }

  const duplicateItem = (item) => {
    const copy = { ...item, id: `${item.id}-copy-${Date.now()}`, name: `${item.name}` }
    setItems((list) => {
      const source = list || []
      const idx = source.findIndex((it) => it.id === item.id)
      const next = [...source]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  return (
    <div>
      <PageHeader
        title="項目管理"
        subtitle="管理固定場次、任選時段與套票項目"
        actions={
          <>
            <Button variant="outline" disabled={selected.length === 0} title={selected.length === 0 ? '請先勾選要修改的服務項目' : undefined}>
              {selected.length === 0 ? '請先勾選要修改的服務項目' : '批次修改營業時段'}
            </Button>
            <Button variant="outline">上傳價目表</Button>
            <Link to={`/${orgSlug}/dashboard/items/new`}>
              <Button variant="primary">新增項目</Button>
            </Link>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="max-w-xs flex-1">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋項目名稱" />
        </div>
      </div>

      <Card className="p-0">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-orbit-400">{common.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            {hasAnyItems && isFiltering ? (
              <>
                <div className="text-sm font-medium text-orbit-500">找不到符合條件的項目</div>
                <p className="text-xs text-orbit-400">試著調整篩選條件或搜尋關鍵字</p>
              </>
            ) : (
              <>
                <div className="text-sm font-medium text-orbit-500">尚未建立任何項目</div>
                <p className="text-xs text-orbit-400">新增項目，開始接受客戶預約</p>
                <Link to={`/${orgSlug}/dashboard/items/new`} className="mt-2">
                  <Button variant="primary">建立第一個項目</Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-orbit-400">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3">名稱</th>
                  <th className="px-4 py-3">價格</th>
                  <th className="px-4 py-3">同時段允許的預約數</th>
                  <th className="px-4 py-3">資源</th>
                  <th className="px-4 py-3">上架狀態</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orbit-border">
                {filtered.map((it) => (
                  <tr key={it.id} className="text-sm text-orbit-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(it.id)}
                        onChange={() => toggleSelect(it.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge>{enums.itemMode[it.mode]}</Badge>
                        <span className="font-medium text-orbit-900">{it.name}</span>
                      </div>
                      {it.durationMinutes != null && (
                        <div className="mt-0.5 text-xs text-orbit-400">服務時長 {it.durationMinutes} 分鐘</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{it.price != null ? `NT$ ${it.price}` : common.freeLabel}</div>
                      {it.deposit != null && (
                        <div className="mt-0.5 text-xs text-orbit-400">定金 NT$ {it.deposit}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{it.capacity != null ? it.capacity : '無限制'}</td>
                    <td className="px-4 py-3">
                      {(it.resources || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {it.resources.map((r, idx) => (
                            <Badge key={r.id || r.name || r || idx}>{typeof r === 'string' ? r : r.name}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-orbit-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={it.isPublished ? 'success' : 'danger'}>
                        {it.isPublished ? '上架中' : '已下架'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/${orgSlug}/dashboard/items/${it.id}`}>
                          <button
                            type="button"
                            title="編輯"
                            className="rounded-lg px-2 py-1 text-xs text-orbit-500 hover:bg-orbit-warm"
                          >
                            編輯
                          </button>
                        </Link>
                        {it.mode === 'COURSE' && (
                          <Link to={`/${orgSlug}/dashboard/items/new?parentId=${it.id}`}>
                            <button
                              type="button"
                              title="新增子項目"
                              className="rounded-lg px-2 py-1 text-xs text-orbit-500 hover:bg-orbit-warm"
                            >
                              新增子項目
                            </button>
                          </Link>
                        )}
                        <button
                          type="button"
                          title="複製"
                          onClick={() => duplicateItem(it)}
                          className="rounded-lg px-2 py-1 text-xs text-orbit-500 hover:bg-orbit-warm"
                        >
                          複製
                        </button>
                        <button
                          type="button"
                          title="刪除"
                          onClick={() => setDeleteTarget(it)}
                          className="rounded-lg px-2 py-1 text-xs text-orbit-danger hover:bg-orbit-danger/10"
                        >
                          刪除
                        </button>
                        <button
                          type="button"
                          title="拖拉排序"
                          className={clsx('cursor-grab rounded-lg px-2 py-1 text-xs text-orbit-300 hover:bg-orbit-warm')}
                        >
                          ⠿
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-4 font-serif text-lg font-semibold text-orbit-900">
              確定要刪除「{deleteTarget.name}」嗎？
            </h3>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                {common.cancel}
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? common.deleting : common.confirmDelete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
