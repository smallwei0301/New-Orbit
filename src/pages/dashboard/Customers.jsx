import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, PageHeader, Badge, Field, Input } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { customerService, tagService } from '../../lib/services.js'
import { useApi, useMutation, errorMessage } from '../../lib/useApi.js'


/* ---------------------------------------------------------------------- */
/* Helpers                                                                */
/* ---------------------------------------------------------------------- */

function formatBirthday(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

function fmtMoney(n) {
  return `NT$ ${Number(n || 0).toLocaleString('zh-TW')}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function exportFilename() {
  const now = new Date()
  const y = now.getFullYear()
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  return `客戶名單-${y}${m}${d}-${hh}${mm}.csv`
}

function parseCustomersFromText(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return lines.map((line, idx) => {
    const phoneMatch = line.match(/09\d{8}|\d{8,10}/)
    const phone = phoneMatch ? phoneMatch[0] : ''
    const rest = (phone ? line.replace(phone, '') : line).trim()
    const parts = rest.split(/[,，\s]+/).filter(Boolean)
    const name = parts[0] || `客戶 ${idx + 1}`
    const note = parts.slice(1).join(' ')
    return { id: `paste-${idx}-${Date.now()}`, name, phone, birthday: '', note }
  })
}

function parseCustomersFromFile() {
  // Mock: pretend the AI extracted these rows from the uploaded file.
  return [
    { id: 'file-1', name: '張婉婷', phone: '0955123456', birthday: '1992-03-08', note: '' },
    { id: 'file-2', name: '周柏宇', phone: '0966987654', birthday: '', note: '常帶朋友一起來' },
    { id: 'file-3', name: '王小明', phone: '0912345678', birthday: '1990-05-12', note: '' },
  ]
}

function withDuplicateFlags(rows, existingCustomers) {
  return rows.map((r) => {
    const match = existingCustomers.find(
      (c) => (r.phone && c.phone && c.phone === r.phone) || (r.email && c.email && c.email === r.email)
    )
    const matchedField = match ? (r.phone && match.phone === r.phone ? '電話' : 'Email') : ''
    return {
      ...r,
      duplicate: !!match,
      matchedName: match ? match.name : '',
      matchedField,
      checked: !match,
    }
  })
}

/* ---------------------------------------------------------------------- */
/* Component                                                              */
/* ---------------------------------------------------------------------- */

export default function Customers() {
  const { orgSlug } = useParams()
  const ORG_ID = orgSlug

  const [searchQuery, setSearchQuery] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [tagFilter, setTagFilter] = useState([])
  // The API only supports filtering by a single tagId; the first selected
  // tag (if any) drives the query while the buttons below stay multi-select.
  const tagId = tagFilter[0] || undefined

  const {
    data: customers,
    loading: customersLoading,
    reload,
    setData: setCustomers,
  } = useApi(
    () => customerService.list({ orgId: ORG_ID, search: searchQuery, tagId }),
    [searchQuery, tagId],
    { fallback: [] }
  )

  const {
    data: availableTags,
    loading: tagsLoading,
    reload: reloadTags,
  } = useApi(() => tagService.list({ orgId: ORG_ID }), [], { fallback: [] })

  const [openMenuId, setOpenMenuId] = useState(null)
  const [exporting, setExporting] = useState(false)

  const [toast, setToast] = useState('')

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importTab, setImportTab] = useState('upload')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [aiParsing, setAiParsing] = useState(false)
  const [parsedRows, setParsedRows] = useState([])
  const [importing, setImporting] = useState(false)

  // Edit birthday modal
  const [birthdayTarget, setBirthdayTarget] = useState(null)
  const [birthdayValue, setBirthdayValue] = useState('')
  const { run: runSaveBirthday, saving: savingBirthday } = useMutation(customerService.update)

  // Edit note modal
  const [noteTarget, setNoteTarget] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const { run: runSaveNote, saving: savingNote } = useMutation(customerService.update)

  // Edit tags modal
  const [tagsTarget, setTagsTarget] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [newTagInput, setNewTagInput] = useState('')
  const { run: runSaveTags, saving: savingTags } = useMutation(customerService.update)
  const { run: runCreateTag, saving: creatingTag } = useMutation(tagService.create)

  // Blacklist confirm modal
  const [blacklistTarget, setBlacklistTarget] = useState(null)
  const { run: runToggleBlacklist, saving: blacklistBusy } = useMutation(customerService.update)

  // Consumption record modal
  const [consumptionTarget, setConsumptionTarget] = useState(null)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3200)
  }

  const filteredCustomers = customers || []

  const tagName = (id) => availableTags.find((t) => t.id === id)?.name || id

  const toggleTagFilter = (tag) => {
    setTagFilter((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]))
  }

  const clearTagFilter = () => setTagFilter([])

  /* ---------------- Export ---------------- */

  const doExport = () => {
    setExporting(true)
    setTimeout(() => {
      try {
        const header = ['姓名', '手機', 'Email', 'LINE', '生日', '備註', '標籤']
        const rows = filteredCustomers.map((c) => [
          c.name,
          c.phone,
          c.email,
          c.line,
          c.birthday,
          c.note,
          (c.tags || []).map(tagName).join('/'),
        ])
        const csv = [header, ...rows]
          .map((r) => r.map((v) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))
          .join('\n')
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = exportFilename()
        a.click()
        URL.revokeObjectURL(url)
        setExporting(false)
      } catch {
        setExporting(false)
        showToast('匯出失敗，請稍後再試')
      }
    }, 500)
  }

  /* ---------------- Import ---------------- */

  const openImportModal = () => {
    setImportTab('upload')
    setUploadedFile(null)
    setPasteText('')
    setParsedRows([])
    setShowImportModal(true)
  }

  const closeImportModal = () => {
    setShowImportModal(false)
    setUploadedFile(null)
    setPasteText('')
    setParsedRows([])
    setAiParsing(false)
    setImporting(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    setUploadedFile(file ? file.name : null)
  }

  const runAiParse = () => {
    const hasInput = importTab === 'upload' ? !!uploadedFile : !!pasteText.trim()
    if (!hasInput) return
    setAiParsing(true)
    setTimeout(() => {
      const rows = importTab === 'upload' ? parseCustomersFromFile() : parseCustomersFromText(pasteText)
      const flagged = withDuplicateFlags(rows, filteredCustomers)
      setAiParsing(false)
      if (flagged.length === 0) {
        showToast('沒有解析出任何客戶資料')
        return
      }
      setParsedRows(flagged)
    }, 900)
  }

  const reUpload = () => {
    setParsedRows([])
  }

  const toggleParsedRow = (id) => {
    setParsedRows((rows) => rows.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r)))
  }

  const confirmImport = () => {
    const checkedRows = parsedRows.filter((r) => r.checked)
    if (checkedRows.length === 0) {
      showToast('請至少勾選一筆')
      return
    }
    setImporting(true)
    setTimeout(() => {
      const newOnes = checkedRows.filter((r) => !r.duplicate)
      const existingOnes = checkedRows.filter((r) => r.duplicate)
      const skipped = parsedRows.length - checkedRows.length
      const created = newOnes.map((r, idx) => ({
        id: `cust-${Date.now()}-${idx}`,
        name: r.name,
        phone: r.phone,
        email: '',
        birthday: r.birthday,
        note: r.note,
        tags: [],
        totalSpent: 0,
        isBlacklisted: false,
      }))
      setCustomers((list) => [...created, ...(list || [])])
      setImporting(false)
      closeImportModal()
      showToast(`匯入完成：新增 ${newOnes.length} 筆 / 既有客戶 ${existingOnes.length} 筆 / 跳過 ${skipped} 筆`)
    }, 900)
  }

  const checkedCount = parsedRows.filter((r) => r.checked).length

  /* ---------------- Edit birthday ---------------- */

  const openBirthdayModal = (c) => {
    setBirthdayTarget(c)
    setBirthdayValue(c.birthday || '')
  }

  const saveBirthday = async () => {
    try {
      await runSaveBirthday(birthdayTarget.id, { birthday: birthdayValue })
      setBirthdayTarget(null)
      showToast('生日已儲存')
      reload()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  /* ---------------- Edit note ---------------- */

  const openNoteModal = (c) => {
    setNoteTarget(c)
    setNoteValue(c.note || '')
  }

  const saveNote = async () => {
    try {
      await runSaveNote(noteTarget.id, { note: noteValue })
      setNoteTarget(null)
      showToast('備註已儲存')
      reload()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  /* ---------------- Edit tags ---------------- */

  const openTagsModal = (c) => {
    setTagsTarget(c)
    setSelectedTags(c.tags || [])
    setNewTagInput('')
  }

  const toggleModalTag = (tag) => {
    setSelectedTags((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]))
  }

  const createNewTag = async () => {
    const name = newTagInput.trim()
    if (!name) return
    if (availableTags.some((t) => t.name === name)) {
      showToast('建立失敗（可能已有同名標籤）')
      return
    }
    try {
      const created = await runCreateTag({ orgId: ORG_ID, name })
      setSelectedTags((list) => [...list, created.id])
      setNewTagInput('')
      reloadTags()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  const saveTags = async () => {
    try {
      await runSaveTags(tagsTarget.id, { tags: selectedTags })
      setTagsTarget(null)
      showToast('標籤已儲存')
      reload()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  /* ---------------- Blacklist ---------------- */

  const openBlacklistConfirm = (c) => {
    setOpenMenuId(null)
    setBlacklistTarget(c)
  }

  const confirmBlacklistToggle = async () => {
    try {
      const nextBlacklisted = !blacklistTarget.isBlacklisted
      await runToggleBlacklist(blacklistTarget.id, { isBlacklisted: nextBlacklisted })
      setBlacklistTarget(null)
      showToast(nextBlacklisted ? '已加入黑名單' : '已解除黑名單')
      reload()
    } catch (e) {
      showToast(errorMessage(e))
    }
  }

  /* ---------------- Consumption ---------------- */

  const openConsumptionModal = (c) => setConsumptionTarget(c)

  return (
    <div>
      <PageHeader
        title="客戶管理"
        subtitle="管理您的客戶資訊與消費紀錄"
        actions={
          <>
            <Button variant="outline" onClick={doExport} disabled={exporting}>
              {exporting ? '匯出中…' : '匯出'}
            </Button>
            <Button variant="primary" onClick={openImportModal}>
              匯入
            </Button>
          </>
        }
      />

      {/* Search + filters */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋姓名、Email、手機、LINE"
            />
          </div>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
          >
            <option value="">篩選消費期間</option>
            <option value="7">近 7 天</option>
            <option value="30">近 30 天</option>
            <option value="90">近 90 天</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-orbit-500">過濾標籤：</span>
          {tagsLoading ? (
            <span className="text-xs text-orbit-400">載入中…</span>
          ) : (
            <>
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTagFilter(tag.id)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs transition-colors',
                    tagFilter.includes(tag.id)
                      ? 'bg-orbit-primary text-white'
                      : 'bg-orbit-warm text-orbit-500 hover:bg-orbit-border'
                  )}
                >
                  {tag.name}
                </button>
              ))}
              {tagFilter.length > 0 && (
                <button
                  type="button"
                  aria-label="清除標籤過濾"
                  onClick={clearTagFilter}
                  className="text-xs text-orbit-400 hover:text-orbit-danger"
                >
                  清除
                </button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Table */}
      {customersLoading ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <div className="text-sm text-orbit-400">載入中...</div>
        </Card>
      ) : filteredCustomers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <div className="text-sm font-medium text-orbit-500">尚無客戶</div>
          <p className="text-xs text-orbit-400">當客戶完成預約後，會自動出現在這裡</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-orbit-border text-xs text-orbit-400">
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">手機/Email/LINE</th>
                <th className="px-4 py-3 font-medium">生日</th>
                <th className="px-4 py-3 font-medium">備註</th>
                <th className="px-4 py-3 font-medium">標籤</th>
                <th className="px-4 py-3 font-medium">消費紀錄</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="border-b border-orbit-border last:border-0 hover:bg-orbit-warm/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/${orgSlug}/dashboard/customers/${c.id}`}
                        className="font-medium text-orbit-900 hover:text-orbit-primary"
                      >
                        {c.name}
                      </Link>
                      {c.isBlacklisted && <Badge tone="danger">黑名單</Badge>}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-0.5 text-xs text-orbit-500">
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div>{c.email}</div>}
                      {c.line && <div>LINE：{c.line}</div>}
                      {!c.phone && !c.email && !c.line && <span className="text-orbit-300">無</span>}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-orbit-700">
                        {c.birthday ? `生日：${formatBirthday(c.birthday)}` : '無'}
                      </span>
                      <button
                        type="button"
                        aria-label={`編輯 ${c.name} 的生日`}
                        onClick={() => openBirthdayModal(c)}
                        className="text-orbit-300 hover:text-orbit-primary"
                      >
                        ✎
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {c.note ? (
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[160px] truncate text-orbit-700" title={c.note}>
                          {c.note}
                        </span>
                        <button
                          type="button"
                          aria-label={`編輯 ${c.name} 的備註`}
                          onClick={() => openNoteModal(c)}
                          className="shrink-0 text-orbit-300 hover:text-orbit-primary"
                        >
                          ✎
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`編輯 ${c.name} 的備註`}
                        onClick={() => openNoteModal(c)}
                        className="text-xs text-orbit-primary hover:underline"
                      >
                        新增備註
                      </button>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {(c.tags || []).length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {c.tags.map((t) => (
                          <Badge key={t}>{tagName(t)}</Badge>
                        ))}
                        <button
                          type="button"
                          aria-label={`編輯 ${c.name} 的標籤`}
                          onClick={() => openTagsModal(c)}
                          className="text-orbit-300 hover:text-orbit-primary"
                        >
                          ✎
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`編輯 ${c.name} 的標籤`}
                        onClick={() => openTagsModal(c)}
                        className="text-xs text-orbit-primary hover:underline"
                      >
                        新增標籤
                      </button>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-label={`查看 ${c.name} 的消費紀錄`}
                      onClick={() => openConsumptionModal(c)}
                      className="text-xs text-orbit-primary hover:underline"
                    >
                      {c.totalSpent > 0 ? fmtMoney(c.totalSpent) : '尚無消費'}
                    </button>
                  </td>

                  <td className="relative px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      className="text-xs"
                      onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                    >
                      客戶操作
                    </Button>
                    {openMenuId === c.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-4 z-20 mt-1 w-36 rounded-xl border border-orbit-border bg-white p-1 text-left shadow-orbit-card">
                          <button
                            type="button"
                            onClick={() => openBlacklistConfirm(c)}
                            className={clsx(
                              'block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-orbit-warm',
                              c.isBlacklisted ? 'text-orbit-700' : 'text-orbit-danger'
                            )}
                          >
                            {c.isBlacklisted ? '解除黑名單' : '加入黑名單'}
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Import modal                                                    */}
      {/* -------------------------------------------------------------- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">匯入客戶名單</h3>
            <p className="mb-4 text-xs leading-relaxed text-orbit-400">
              上傳 CSV / Excel / PDF / 圖片，或貼上文字。AI 解析後讓您確認再匯入。
            </p>

            {parsedRows.length === 0 && (
              <>
                {/* Tabs */}
                <div className="mb-4 flex gap-2">
                  {[
                    ['upload', '上傳檔案'],
                    ['paste', '貼上文字'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setImportTab(key)}
                      className={clsx(
                        'rounded-full px-4 py-1.5 text-sm',
                        importTab === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {importTab === 'upload' && (
                  <Field
                    label="上傳檔案"
                    hint="支援 CSV / Excel (.xlsx) / PDF / 圖片（手寫名單拍照也可）"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.pdf,image/*"
                        onChange={handleFileChange}
                        className="flex-1 text-sm text-orbit-500"
                      />
                      {uploadedFile && (
                        <button
                          type="button"
                          onClick={() => setUploadedFile(null)}
                          className="text-xs text-orbit-400 hover:text-orbit-danger"
                        >
                          清除
                        </button>
                      )}
                    </div>
                    {uploadedFile && <p className="mt-2 text-xs text-orbit-500">已選擇：{uploadedFile}</p>}
                  </Field>
                )}

                {importTab === 'paste' && (
                  <Field label="貼上文字" hint="LINE 對話複製、自製名單純文字等">
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="貼上任意格式的客戶名單，AI 會自動辨識欄位..."
                      rows={6}
                      className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
                    />
                  </Field>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={closeImportModal}>
                    取消
                  </Button>
                  <Button variant="primary" onClick={runAiParse} disabled={aiParsing}>
                    {aiParsing ? 'AI 解析中，通常 5-15 秒...' : 'AI 解析'}
                  </Button>
                </div>
              </>
            )}

            {parsedRows.length > 0 && (
              <>
                <p className="mb-3 text-xs text-orbit-500">
                  共解析 {parsedRows.length} 筆，已勾選 {checkedCount} 筆。重複客戶（紅色）預設不勾選。
                </p>
                <div className="mb-3 overflow-x-auto rounded-xl border border-orbit-border">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-orbit-border bg-orbit-warm/60 text-xs text-orbit-400">
                        <th className="px-3 py-2 font-medium" />
                        <th className="px-3 py-2 font-medium">姓名</th>
                        <th className="px-3 py-2 font-medium">電話</th>
                        <th className="px-3 py-2 font-medium">生日</th>
                        <th className="px-3 py-2 font-medium">備註</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r) => (
                        <tr
                          key={r.id}
                          className={clsx(
                            'border-b border-orbit-border last:border-0',
                            r.duplicate && 'bg-orbit-danger/5'
                          )}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={r.checked}
                              onChange={() => toggleParsedRow(r.id)}
                            />
                          </td>
                          <td className={clsx('px-3 py-2', r.duplicate ? 'text-orbit-danger' : 'text-orbit-900')}>
                            {r.name}
                            {r.duplicate && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <Badge tone="danger">重複</Badge>
                                <span className="text-[11px] text-orbit-danger">
                                  此 {r.matchedField} 已存在於既有客戶（{r.matchedName}）
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-orbit-700">{r.phone || '—'}</td>
                          <td className="px-3 py-2 text-orbit-700">{r.birthday || '—'}</td>
                          <td className="px-3 py-2 text-orbit-700">{r.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={reUpload}>
                    重新上傳
                  </Button>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={closeImportModal}>
                    取消
                  </Button>
                  <Button variant="primary" onClick={confirmImport} disabled={importing}>
                    {importing ? `正在匯入 ${checkedCount} 筆客戶...` : `確認匯入 ${checkedCount} 筆`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Edit birthday modal                                            */}
      {/* -------------------------------------------------------------- */}
      {birthdayTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-1 font-serif text-lg font-semibold text-orbit-900">編輯生日</h3>
            <p className="mb-4 text-xs text-orbit-400">清空後送出可移除生日設定</p>
            <Field label="生日">
              <Input
                type="date"
                value={birthdayValue}
                onChange={(e) => setBirthdayValue(e.target.value)}
              />
            </Field>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBirthdayTarget(null)} disabled={savingBirthday}>
                取消
              </Button>
              <Button variant="primary" onClick={saveBirthday} disabled={savingBirthday}>
                {savingBirthday ? '儲存中...' : '儲存'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Edit note modal                                                */}
      {/* -------------------------------------------------------------- */}
      {noteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-4 font-serif text-lg font-semibold text-orbit-900">編輯備註</h3>
            <Field>
              <textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="輸入客戶備註（僅管理者可見）"
                rows={4}
                className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              />
            </Field>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoteTarget(null)} disabled={savingNote}>
                取消
              </Button>
              <Button variant="primary" onClick={saveNote} disabled={savingNote}>
                {savingNote ? '儲存中...' : '儲存'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Edit tags modal                                                */}
      {/* -------------------------------------------------------------- */}
      {tagsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-4 font-serif text-lg font-semibold text-orbit-900">編輯標籤</h3>

            {tagsLoading ? (
              <p className="py-6 text-center text-xs text-orbit-400">載入中…</p>
            ) : (
              <>
                {availableTags.length === 0 ? (
                  <p className="mb-4 text-xs text-orbit-400">尚無標籤，輸入下方欄位建立第一個標籤</p>
                ) : (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleModalTag(tag.id)}
                        className={clsx(
                          'rounded-full px-3 py-1 text-xs transition-colors',
                          selectedTags.includes(tag.id)
                            ? 'bg-orbit-primary text-white'
                            : 'bg-orbit-warm text-orbit-500 hover:bg-orbit-border'
                        )}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="新增標籤名稱"
                  />
                  <Button variant="outline" onClick={createNewTag} disabled={creatingTag}>
                    新增
                  </Button>
                </div>

                <Link
                  to={`/${orgSlug}/dashboard/tags`}
                  className="mt-3 inline-block text-xs text-orbit-primary hover:underline"
                >
                  管理所有標籤
                </Link>
              </>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTagsTarget(null)} disabled={savingTags}>
                取消
              </Button>
              <Button variant="primary" onClick={saveTags} disabled={savingTags || tagsLoading}>
                {savingTags ? '儲存中...' : '儲存'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Blacklist confirm modal                                        */}
      {/* -------------------------------------------------------------- */}
      {blacklistTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-4 font-serif text-lg font-semibold text-orbit-900">
              {blacklistTarget.isBlacklisted ? '解除黑名單' : '加入黑名單'}
            </h3>
            <p className="whitespace-pre-line text-sm text-orbit-700">
              {blacklistTarget.isBlacklisted
                ? `確定要將 ${blacklistTarget.name} 從黑名單移除？`
                : `確定要將 ${blacklistTarget.name} 加入黑名單？\n加入後該客戶將無法預約。`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBlacklistTarget(null)} disabled={blacklistBusy}>
                取消
              </Button>
              <Button
                variant={blacklistTarget.isBlacklisted ? 'primary' : 'danger'}
                onClick={confirmBlacklistToggle}
                disabled={blacklistBusy}
              >
                {blacklistBusy ? '處理中…' : '確定'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Consumption record modal                                       */}
      {/* -------------------------------------------------------------- */}
      {consumptionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-orbit-card">
            <div className="mb-1 flex items-start justify-between">
              <h3 className="font-serif text-lg font-semibold text-orbit-900">
                {consumptionTarget.name} 的消費紀錄
              </h3>
              <button
                type="button"
                aria-label="關閉"
                onClick={() => setConsumptionTarget(null)}
                className="text-orbit-300 hover:text-orbit-danger"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-xs text-orbit-400">
              累計消費金額 {fmtMoney(consumptionTarget.totalSpent)}
            </p>

            {!(consumptionTarget.totalSpent > 0) ? (
              <p className="py-8 text-center text-sm text-orbit-400">尚無消費紀錄</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-orbit-border">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-orbit-border bg-orbit-warm/60 text-xs text-orbit-400">
                      <th className="px-3 py-2 font-medium">金額</th>
                      <th className="px-3 py-2 font-medium">預約</th>
                      <th className="px-3 py-2 font-medium">建立</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-orbit-border last:border-0">
                      <td className="px-3 py-2 text-orbit-900">{fmtMoney(consumptionTarget.totalSpent)}</td>
                      <td className="px-3 py-2 text-orbit-700">累計消費總額</td>
                      <td className="px-3 py-2 text-orbit-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setConsumptionTarget(null)}>
                關閉
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-orbit-900 px-4 py-2 text-sm text-white shadow-orbit-card">
          {toast}
        </div>
      )}
    </div>
  )
}
