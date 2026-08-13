import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, PageHeader, Input } from '../../components/ui/index.jsx'
import { pages } from '../../i18n/strings.js'
import { tagService } from '../../lib/services.js'
import { useApi, useMutation } from '../../lib/useApi.js'

/** 標籤管理 — manage customer tags (assignable per-customer on the customers page). */
export default function Tags() {
  const { orgSlug } = useParams()

  const { data: tags, loading, reload } = useApi(
    () => tagService.list({ orgId: orgSlug }),
    [orgSlug],
    { fallback: [] }
  )

  const [toast, setToast] = useState('')
  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3200)
  }

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const { run: runCreate, saving: creating } = useMutation(tagService.create)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const { run: runUpdate, saving: updating } = useMutation(tagService.update)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const { run: runRemove, saving: deleting } = useMutation(tagService.remove)

  const openAdd = () => {
    setNewName('')
    setShowAdd(true)
  }

  const closeAdd = () => {
    setShowAdd(false)
    setNewName('')
  }

  const createTag = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      await runCreate({ name })
      closeAdd()
      showToast('已新增標籤')
      reload()
    } catch (e) {
      showToast('建立失敗（可能已有同名標籤）')
    }
  }

  const startEdit = (tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (id) => {
    const name = editName.trim()
    if (!name) return
    try {
      await runUpdate(id, { name })
      cancelEdit()
      showToast('已更新')
      reload()
    } catch (e) {
      showToast('更新失敗（可能已有同名標籤）')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await runRemove(deleteTarget.id)
      setDeleteTarget(null)
      showToast('已刪除')
      reload()
    } catch (e) {
      showToast('刪除失敗')
    }
  }

  const rows = tags || []

  return (
    <div>
      <PageHeader
        title={pages.tags.title}
        subtitle={pages.tags.subtitle}
        actions={<Button onClick={openAdd}>新增標籤</Button>}
      />

      <Card className="!p-0">
        {loading ? (
          <div className="p-10 text-center text-sm text-orbit-400">載入中…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm font-medium text-orbit-700">尚無標籤</div>
            <p className="mt-1 text-xs text-orbit-400">新增第一個標籤後即可在客戶管理頁逐個指派</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orbit-border text-left text-xs text-orbit-400">
                <th className="px-6 py-3 font-medium">標籤名稱</th>
                <th className="px-6 py-3 font-medium">客人數</th>
                <th className="px-6 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tag) => (
                <tr key={tag.id} className="border-b border-orbit-border last:border-0">
                  <td className="px-6 py-3">
                    {editingId === tag.id ? (
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={20}
                      />
                    ) : (
                      <span className="font-medium text-orbit-900">{tag.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-orbit-500">{tag.customerCount} 位客人</td>
                  <td className="px-6 py-3">
                    {editingId === tag.id ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          title="儲存"
                          onClick={() => saveEdit(tag.id)}
                          disabled={updating}
                        >
                          儲存
                        </Button>
                        <Button variant="ghost" title="取消" onClick={cancelEdit} disabled={updating}>
                          取消
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          title="修改名稱"
                          aria-label={`查看「${tag.name}」的客戶列表`}
                          onClick={() => startEdit(tag)}
                        >
                          修改名稱
                        </Button>
                        <Button variant="danger" title="刪除標籤" onClick={() => setDeleteTarget(tag)}>
                          刪除標籤
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Upsell card */}
      <Card className="mt-6">
        <div className="font-medium text-orbit-900">新/舊客戶標記</div>
        <p className="mt-2 text-xs leading-relaxed text-orbit-400">
          區分新客戶與回頭客，追蹤客戶類型以進行精準行銷
        </p>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-orbit-900">新增標籤</h2>
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="標籤名稱"
              maxLength={20}
            />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={closeAdd}>
                取消
              </Button>
              <Button onClick={createTag} disabled={creating || !newName.trim()}>
                {creating ? '建立中...' : '建立'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-orbit-900">刪除標籤</h2>
            <p className="text-sm text-orbit-500">
              {deleteTarget.customerCount > 0
                ? `「${deleteTarget.name}」目前掛在 ${deleteTarget.customerCount} 位客人身上，刪除後會一併移除。確定要刪除嗎？`
                : `確定要刪除「${deleteTarget.name}」嗎？`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? '刪除中…' : '刪除'}
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
