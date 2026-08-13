import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Field, Input, Toggle, Badge, PageHeader } from '../../components/ui/index.jsx'
import { enums, common } from '../../i18n/strings.js'

const ITEM_TYPES = [
  {
    value: 'COURSE',
    label: enums.itemMode.COURSE,
    desc: '店家安排固定時間與名額，可建立多堂課程或系列場次，如: 瑜珈課 / 講座',
  },
  {
    value: 'SERVICE',
    label: enums.itemMode.SERVICE,
    desc: '顧客自己挑時間預約，如: 剪髮 / 按摩 / 美甲',
  },
  {
    value: 'PACKAGE',
    label: enums.itemMode.PACKAGE,
    desc: '顧客先購買票券，再自行預約使用，如: 瑜珈課 10 堂 / 洗髮券 10 張',
  },
]

const SLOT_INTERVALS = [
  { value: 15, label: '每 15 分鐘' },
  { value: 30, label: '每 30 分鐘' },
  { value: 45, label: '每 45 分鐘' },
  { value: 60, label: '每 60 分鐘' },
]

/** Mock existing item lookup, used only in edit mode. */
const MOCK_EXISTING = {
  'itm-1': {
    itemType: 'SERVICE',
    name: '全身精油按摩',
    description: '使用天然精油進行全身放鬆按摩',
    startTime: '',
    endTime: '',
    duration: '90',
    slotInterval: 30,
    price: '1800',
    deposit: '300',
    capacity: '1',
    isPublished: true,
    publishAt: '',
    unpublishAt: '',
    sortOrder: '1',
    multiSlotBooking: false,
    groupSize: '1',
    waitlistEnabled: false,
  },
}

const MOCK_PARENT = {
  'itm-3': { id: 'itm-3', name: '進階瑜伽課程', startTime: '2026-03-01 00:00', endTime: '2026-06-30 23:59', capacity: 12 },
}

const EMPTY_FORM = {
  itemType: 'SERVICE',
  name: '',
  description: '',
  startTime: '',
  endTime: '',
  duration: '',
  slotInterval: 30,
  price: '',
  deposit: '',
  capacity: '',
  isPublished: true,
  publishAt: '',
  unpublishAt: '',
  sortOrder: '',
  multiSlotBooking: false,
  groupSize: '1',
  waitlistEnabled: false,
}

/** Mock waitlist member count, used to decide whether closing the waitlist needs confirmation. */
const MOCK_WAITLIST_COUNT = 3

export default function ItemEditor() {
  const { orgSlug, itemId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const parentId = searchParams.get('parentId')
  const parent = parentId ? MOCK_PARENT[parentId] : null

  const isEditing = Boolean(itemId)
  const initial = useMemo(() => {
    if (isEditing) return MOCK_EXISTING[itemId] || EMPTY_FORM
    return { ...EMPTY_FORM, itemType: parent ? 'SERVICE' : EMPTY_FORM.itemType }
  }, [isEditing, itemId, parent])

  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [showCloseWaitlistConfirm, setShowCloseWaitlistConfirm] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const headerTitle = isEditing ? '編輯項目' : parent ? '新增子項目（時段）' : '新增項目'

  const isChild = Boolean(parent)
  const isPackage = form.itemType === 'PACKAGE'

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = '名稱為必填'

    if (form.duration !== '') {
      const d = Number(form.duration)
      if (d < 0) e.duration = '時長不可為負數'
      else if (d < 1) e.duration = '時長至少 1 分鐘'
    }

    if (form.price !== '') {
      const p = Number(form.price)
      if (p < 0) e.price = '價格不可為負數'
      else if (!Number.isInteger(p)) e.price = '價格必須為整數'
    }

    if (form.deposit !== '') {
      const d = Number(form.deposit)
      if (d < 0) e.deposit = '定金不可為負數'
      else if (!Number.isInteger(d)) e.deposit = '定金必須為整數'
    }

    if (form.capacity !== '' && parent?.capacity != null) {
      if (Number(form.capacity) > parent.capacity) {
        e.capacity = `不可超過父項目的同時段預約數（${parent.capacity}）`
      }
    }

    if (form.isPublished && !form.publishAt) {
      e.publishAt = '請填寫上架時間'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = () => {
    if (!validate()) return
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setToast(isEditing ? '更新成功' : '建立成功')
      setTimeout(() => setToast(''), 2000)
      if (!isEditing) navigate(`/${orgSlug}/dashboard/items`)
    }, 500)
  }

  const cancel = () => navigate(`/${orgSlug}/dashboard/items`)

  const isFree = form.price === '' && form.deposit === ''

  const groupSizeNum = Number(form.groupSize) || 1

  const requestToggleWaitlist = (next) => {
    if (!next && form.waitlistEnabled && MOCK_WAITLIST_COUNT > 0) {
      setShowCloseWaitlistConfirm(true)
      return
    }
    set('waitlistEnabled', next)
  }

  const confirmCloseWaitlist = () => {
    set('waitlistEnabled', false)
    setShowCloseWaitlistConfirm(false)
  }

  const waitlistChangedOn = form.waitlistEnabled && initial.waitlistEnabled === false
  const waitlistChangedOff = !form.waitlistEnabled && initial.waitlistEnabled === true

  return (
    <div>
      <PageHeader
        title={headerTitle}
        subtitle={parent ? `父項目：${parent.name}` : undefined}
        actions={
          <>
            <Button variant="outline" onClick={cancel} disabled={submitting}>
              {common.cancel}
            </Button>
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? common.processing : isEditing ? common.update : common.create}
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* 基本資訊 */}
        <Card>
          <h3 className="mb-4 font-medium text-orbit-900">基本資訊</h3>
          <div className="space-y-4">
            <Field label="項目類型">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {ITEM_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('itemType', t.value)}
                    className={
                      'rounded-xl border p-3 text-left text-sm transition-colors ' +
                      (form.itemType === t.value
                        ? 'border-orbit-primary bg-orbit-primary/5'
                        : 'border-orbit-border bg-white hover:bg-orbit-warm/50')
                    }
                  >
                    <div className="font-medium text-orbit-900">{t.label}</div>
                    <div className="mt-1 text-xs leading-relaxed text-orbit-400">{t.desc}</div>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="名稱" hint={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={
                  isChild ? '例如：3/15 週二 19:00' : form.itemType === 'SERVICE' ? '例如：全身精油按摩' : '例如：進階瑜伽課程'
                }
              />
            </Field>

            <Field label="描述">
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              />
            </Field>
          </div>
        </Card>

        {/* 時間與排程 */}
        <Card>
          <h3 className="mb-4 font-medium text-orbit-900">時間與排程</h3>
          <div className="space-y-4">
            {parent && (
              <p className="text-xs text-orbit-400">
                父項目課期：{parent.startTime} ~ {parent.endTime}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="開始時間">
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => set('startTime', e.target.value)}
                  placeholder="選擇開始時間"
                />
              </Field>
              <Field label="結束時間">
                <Input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                  placeholder="選擇結束時間"
                />
              </Field>
            </div>

            <Field label="服務時長（分鐘）" hint={errors.duration}>
              <Input
                type="number"
                value={form.duration}
                onChange={(e) => set('duration', e.target.value)}
                placeholder="例如：60"
              />
            </Field>

            <Field
              label="可預約時段間隔"
              hint="顧客預約時，可選的開始時間每隔多久出現一個（例如選 30 分鐘 → 只會出現 09:00、09:30…）"
            >
              <select
                value={form.slotInterval}
                onChange={(e) => set('slotInterval', Number(e.target.value))}
                className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              >
                {SLOT_INTERVALS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        {/* 價格與容量 */}
        <Card>
          <h3 className="mb-4 font-medium text-orbit-900">價格與容量</h3>
          <div className="space-y-4">
            <Field label="價格" hint={errors.price}>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="留空表示免費"
              />
            </Field>

            <Field label="定金" hint={errors.deposit || '需啟用金流才能設定定金'}>
              <Input
                type="number"
                value={form.deposit}
                onChange={(e) => set('deposit', e.target.value)}
                placeholder="留空表示需付全額"
              />
            </Field>

            <Field
              label={isPackage ? '限量套票份數' : '同時段允許的預約數'}
              hint={
                errors.capacity ||
                (isChild && parent?.capacity != null
                  ? `留空預設與父項目相同（${parent.capacity}）`
                  : undefined)
              }
            >
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => set('capacity', e.target.value)}
                placeholder={
                  isChild && parent?.capacity != null ? `留空預設與父項目相同（${parent.capacity}）` : '留空表示無限制'
                }
              />
            </Field>

            {isFree && (
              <p className="rounded-xl bg-orbit-info-bg p-3 text-xs leading-relaxed text-orbit-danger">
                目前未設定價格與定金：顧客下單將「免費」並自動確認，且立即發放全部票券。若非刻意提供免費方案，請填寫價格。
              </p>
            )}
          </div>
        </Card>

        {/* 上架與排序 */}
        <Card>
          <h3 className="mb-4 font-medium text-orbit-900">上架與排序</h3>
          <div className="space-y-4">
            <Toggle checked={form.isPublished} onChange={(v) => set('isPublished', v)} label="上架" />
            <Field label="上架時間" hint={errors.publishAt}>
              <Input
                type="datetime-local"
                value={form.publishAt}
                onChange={(e) => set('publishAt', e.target.value)}
                placeholder="選擇上架時間"
              />
            </Field>
            <Field label="下架時間（留空表示永久）">
              <Input
                type="datetime-local"
                value={form.unpublishAt}
                onChange={(e) => set('unpublishAt', e.target.value)}
                placeholder="留空表示永久"
              />
            </Field>
            <Field label="排序">
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* 多時段預約 */}
        <Card>
          <Toggle
            checked={form.multiSlotBooking}
            onChange={(v) => set('multiSlotBooking', v)}
            label="多時段預約"
            hint="啟用後客人預約頁可勾選多個時段一次下單，N 筆預約共用同一筆付款； 關閉則只能單筆預約（多選 UI 自動退化）。"
          />
          <div className="mt-2">
            <Badge tone={form.multiSlotBooking ? 'success' : 'default'}>
              {form.multiSlotBooking ? '已啟用' : '未啟用'}
            </Badge>
          </div>
        </Card>

        {/* 揪團預約 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">揪團預約</h3>
          <p className="mb-4 text-xs text-orbit-400">設定每筆預約可參與的人數。</p>
          <Field
            label="人數"
            hint={groupSizeNum <= 1 ? '填 1 為：單人預約。' : '填 2 為：2 名預約（以此類推）。'}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={form.groupSize}
                onChange={(e) => set('groupSize', e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-orbit-500">人</span>
            </div>
          </Field>
          <p className="mt-4 text-xs leading-relaxed text-orbit-400">
            主辦人預約後系統會自動產生分享連結，同行者透過連結即可加入預約並付款。 上方「價格」請填總價，系統將依人數自動平均分攤；若有零頭，將由主辦人負擔。
          </p>
        </Card>

        {/* 候補功能 */}
        <Card>
          <Toggle
            checked={form.waitlistEnabled}
            onChange={requestToggleWaitlist}
            label="候補功能"
            hint="啟用後，當此項目（SERVICE 為特定時段）額滿時會員可加入候補； 有人取消時會自動通知候補名單第一位。 通知方式請到「通知設定 → 候補名額釋出」設定模板。"
          />
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={form.waitlistEnabled ? 'success' : 'default'}>
              {form.waitlistEnabled ? '已啟用' : '未啟用'}
            </Badge>
          </div>
          {waitlistChangedOn && (
            <p className="mt-2 text-xs text-orbit-danger">已開啟候補，請記得按上方「更新」才會生效</p>
          )}
          {waitlistChangedOff && (
            <p className="mt-2 text-xs text-orbit-danger">已關閉候補，請記得按上方「更新」才會停用</p>
          )}
          {isEditing && (
            <div className="mt-3">
              <Link
                to={`/${orgSlug}/dashboard/items/${itemId}/waiting-list`}
                className="text-xs text-orbit-primary hover:underline"
              >
                查看目前的候補名單與通知紀錄
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Close-waitlist confirm modal */}
      {showCloseWaitlistConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-orbit-card">
            <h3 className="mb-2 font-serif text-lg font-semibold text-orbit-900">確定要關閉候補功能？</h3>
            <p className="mb-4 text-xs leading-relaxed text-orbit-400">
              目前還有 {MOCK_WAITLIST_COUNT} 位會員在候補名單中。關閉後會自動取消所有候補，無法復原。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCloseWaitlistConfirm(false)}>
                再想想
              </Button>
              <Button variant="danger" onClick={confirmCloseWaitlist}>
                確定關閉
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-orbit-900 px-4 py-2.5 text-sm text-white shadow-orbit-hover">
          {toast}
        </div>
      )}
    </div>
  )
}
