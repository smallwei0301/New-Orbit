import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Field, Input } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { enums } from '../../i18n/strings.js'

/**
 * 資源編輯器 — create/edit form for a single EQUIPMENT/STAFF resource,
 * plus its 設定休假 (leave scheduling) modal. No backend: all state is
 * local, seeded from a small mock lookup keyed by :resourceId.
 */

const MOCK_RESOURCES = {
  'res-1': { id: 'res-1', name: '洗頭槽 A', type: 'EQUIPMENT', capacity: 1 },
  'res-2': { id: 'res-2', name: '美容床 1 號', type: 'EQUIPMENT', capacity: 2 },
  'res-3': { id: 'res-3', name: '設計師小明', type: 'STAFF', capacity: 1 },
  'res-4': { id: 'res-4', name: '美容師 Amy', type: 'STAFF', capacity: 1 },
  'res-5': { id: 'res-5', name: '治療師阿哲', type: 'STAFF', capacity: 1 },
}

const MOCK_LEAVES = {
  'res-3': [
    { id: 'lv-1', label: '6/20 特休整天' },
    { id: 'lv-2', label: '出國 7/1-7/5' },
  ],
}

const TYPE_OPTIONS = [
  {
    key: 'EQUIPMENT',
    label: enums.resourceType.EQUIPMENT,
    hint: '設備/場地如洗頭槽、美容床、診療間等硬體資源',
    placeholder: '例如：洗頭槽 A、美容床 1 號',
  },
  {
    key: 'STAFF',
    label: enums.resourceType.STAFF,
    hint: '員工如設計師、美容師、治療師等人力資源',
    placeholder: '例如：設計師小明、美容師 Amy',
  },
]

const LEAVE_PLACEHOLDER = `例如：
6/20 特休整天
出國 7/1-7/5
6/25 下午 14:00-17:00 看診
七月只有 7/23 上班`

function parsePendingLeaves(text) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: `pending-${i}-${label}`, label }))
}

export default function ResourceEditor() {
  const { orgSlug, resourceId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(resourceId)
  const existing = isEdit ? MOCK_RESOURCES[resourceId] : null

  const [type, setType] = useState(existing?.type || 'EQUIPMENT')
  const [name, setName] = useState(existing?.name || '')
  const [capacity, setCapacity] = useState(existing?.capacity ?? 1)
  const [nameError, setNameError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [leaveOpen, setLeaveOpen] = useState(false)

  const activeType = useMemo(() => TYPE_OPTIONS.find((t) => t.key === type), [type])

  const backToList = () => navigate(`/${orgSlug}/dashboard/resources`)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('請輸入名稱')
      return
    }
    setNameError('')
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      backToList()
    }, 400)
  }

  return (
    <div>
      <Link
        to={`/${orgSlug}/dashboard/resources`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-orbit-400 hover:text-orbit-700"
      >
        ← 返回資源列表
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-orbit-900">
          {isEdit ? '編輯資源' : '新增資源'}
        </h1>
        {isEdit && (
          <Button variant="outline" onClick={() => setLeaveOpen(true)}>
            設定休假
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="mb-4 font-medium text-orbit-900">基本資訊</h3>
          <div className="space-y-4">
            <div>
              <span className="mb-1 block text-sm font-medium text-orbit-700">類型</span>
              <div aria-label="類型" className="flex gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setType(opt.key)}
                    className={clsx(
                      'rounded-full px-4 py-1.5 text-sm',
                      type === opt.key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="mt-1 block text-xs text-orbit-400">{activeType.hint}</span>
            </div>

            <Field label="名稱" hint={nameError}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError('')
                }}
                placeholder={activeType.placeholder}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-medium text-orbit-900">排程設定</h3>
          <Field
            label={type === 'EQUIPMENT' ? '同時可共用人數' : '同時可服務人數'}
            hint="同一時段可服務的最大人數"
          >
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={backToList} disabled={submitting}>
            取消
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? '處理中...' : isEdit ? '更新' : '建立'}
          </Button>
        </div>
      </form>

      {leaveOpen && (
        <LeaveModal
          resource={existing}
          onClose={() => setLeaveOpen(false)}
        />
      )}
    </div>
  )
}

function LeaveModal({ resource, onClose }) {
  const [scheduled, setScheduled] = useState(MOCK_LEAVES[resource?.id] || [])
  const [text, setText] = useState('')
  const [pending, setPending] = useState([])
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [saving, setSaving] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const handleParse = () => {
    if (!text.trim()) return
    setParsing(true)
    setParseError('')
    setTimeout(() => {
      const parsed = parsePendingLeaves(text)
      setParsing(false)
      if (parsed.length === 0) {
        setParseError('無法解析，請檢查輸入')
        return
      }
      setPending(parsed)
    }, 500)
  }

  const handleSave = () => {
    if (pending.length === 0) return
    setSaving(true)
    setTimeout(() => {
      setScheduled((list) => [...list, ...pending])
      setPending([])
      setText('')
      setSaving(false)
    }, 400)
  }

  const confirmCancel = () => {
    if (!cancelTarget) return
    setCancelling(true)
    setTimeout(() => {
      setScheduled((list) => list.filter((l) => l.id !== cancelTarget.id))
      setCancelling(false)
      setCancelTarget(null)
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-orbit-900">
            設定休假 · {resource?.name}
          </h3>
          <button onClick={onClose} className="text-orbit-400 hover:text-orbit-700">
            ✕
          </button>
        </div>

        <div className="mt-4">
          <Field label="輸入休假時段" hint={parseError}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={LEAVE_PLACEHOLDER}
              rows={5}
              className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
            />
          </Field>
          <div className="mt-2 flex justify-end">
            <Button type="button" variant="outline" onClick={handleParse} disabled={parsing || !text.trim()}>
              {parsing ? 'AI 解析中...' : 'AI 解析'}
            </Button>
          </div>
        </div>

        {pending.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-medium text-orbit-700">{`即將新增（${pending.length}）`}</h4>
            <ul className="space-y-1">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg bg-orbit-info-bg px-3 py-2 text-sm text-orbit-700"
                >
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <h4 className="mb-2 text-sm font-medium text-orbit-700">已排定的休假</h4>
          {scheduled.length === 0 ? (
            <p className="py-4 text-center text-sm text-orbit-400">尚無排定的休假</p>
          ) : (
            <ul className="space-y-1">
              {scheduled.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-orbit-border px-3 py-2 text-sm text-orbit-700"
                >
                  <span>{l.label}</span>
                  <button
                    title="取消此休假"
                    onClick={() => setCancelTarget(l)}
                    className="text-xs text-orbit-danger hover:underline"
                  >
                    取消
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || pending.length === 0}>
            {saving ? '儲存中...' : `儲存（${pending.length}）`}
          </Button>
        </div>

        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6">
              <h3 className="font-serif text-lg font-semibold text-orbit-900">取消休假</h3>
              <p className="mt-2 text-sm text-orbit-500">
                確定要取消「{resource?.name}」的這筆休假嗎？取消後無法復原。
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCancelTarget(null)} disabled={cancelling}>
                  返回
                </Button>
                <Button variant="danger" onClick={confirmCancel} disabled={cancelling}>
                  {cancelling ? '取消中...' : '確定取消'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
