import { useEffect, useState } from 'react'
import { Button, Card, Field, Input, Toggle, PageHeader } from '../../components/ui/index.jsx'
import { defaultOrgSettings } from '../../config/tenant.js'
import { orgService } from '../../lib/services.js'
import { useApi, useMutation, errorMessage } from '../../lib/useApi.js'

const ORG_SLUG = 'midao'

/**
 * 商家設定 — organization identity, contact, address, tracking, login and
 * booking-window preferences, plus branding placeholders. Mirrors the
 * LINE 整合 page's Card/Field/Toggle composition style. Seeded from the
 * real Organization record and saved back via orgService.update.
 */
export default function Organization() {
  const { data: orgRecord, loading: orgLoading } = useApi(() => orgService.getBySlug(ORG_SLUG), [])

  const [org, setOrg] = useState(defaultOrgSettings)
  const [windowMode, setWindowMode] = useState(
    defaultOrgSettings.customerBookingFixedStartDate || defaultOrgSettings.customerBookingFixedEndDate
      ? 'fixed'
      : 'rolling'
  )
  const [logoPreview, setLogoPreview] = useState(null)
  const [faviconPreview, setFaviconPreview] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!orgRecord) return
    setOrg({ ...defaultOrgSettings, ...orgRecord })
    setWindowMode(
      orgRecord.customerBookingFixedStartDate || orgRecord.customerBookingFixedEndDate ? 'fixed' : 'rolling'
    )
  }, [orgRecord])

  const set = (k, v) => setOrg((o) => ({ ...o, [k]: v }))

  const pickImage = (setter) => (e) => {
    const file = e.target.files?.[0]
    if (file) setter(URL.createObjectURL(file))
  }

  const { run: runSave, saving } = useMutation((payload) => orgService.update(orgRecord.id, payload))

  const handleSave = async () => {
    if (!orgRecord) return
    setMessage('')
    try {
      await runSave(org)
      setMessage('儲存成功')
    } catch (e) {
      setMessage(`儲存失敗：${errorMessage(e)}`)
    } finally {
      setTimeout(() => setMessage(''), 3200)
    }
  }

  return (
    <div>
      <PageHeader
        title="商家設定"
        subtitle="管理商家基本資訊與顯示設定"
        actions={
          <div className="flex items-center gap-3">
            {message && <span className="text-xs text-orbit-500">{message}</span>}
            <Button onClick={handleSave} disabled={saving || orgLoading || !orgRecord}>
              {saving ? '儲存中...' : '儲存設定'}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* 基本資訊 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">基本資訊</h3>
          <p className="mb-4 text-xs text-orbit-400">商家名稱與公開頁面的網址</p>
          <div className="space-y-4">
            <Field label="商家名稱">
              <Input
                value={org.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="輸入商家名稱"
              />
            </Field>
            <Field label="網址代稱" hint="此網址可以使用">
              <Input value={org.slug} onChange={(e) => set('slug', e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* 聯絡方式 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">聯絡方式</h3>
          <p className="mb-4 text-xs text-orbit-400">客戶可以透過這些方式聯繫您</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="聯絡 Email">
              <Input
                type="email"
                value={org.contactEmail}
                onChange={(e) => set('contactEmail', e.target.value)}
              />
            </Field>
            <Field label="聯絡電話">
              <Input value={org.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
            </Field>
            <Field label="Instagram">
              <Input
                value={org.instagramUrl}
                onChange={(e) => set('instagramUrl', e.target.value)}
              />
            </Field>
            <Field label="LINE">
              <Input value={org.lineUrl} onChange={(e) => set('lineUrl', e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* 地址資訊 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">地址資訊</h3>
          <p className="mb-4 text-xs text-orbit-400">讓客戶知道您的位置</p>
          <div className="space-y-4">
            <Field label="地址">
              <Input value={org.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="地址提醒">
              <Input
                value={org.addressHint}
                onChange={(e) => set('addressHint', e.target.value)}
                placeholder="例如：府中站 1 號出口，步行約 5 分鐘"
              />
            </Field>
          </div>
        </Card>

        {/* 數據追蹤 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">數據追蹤</h3>
          <p className="mb-4 text-xs text-orbit-400">
            填入後，顧客瀏覽您的店家頁面時會以您自己的 GA / Meta Pixel 記錄流量
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Google Analytics 測量 ID">
              <Input
                value={org.gaMeasurementId}
                onChange={(e) => set('gaMeasurementId', e.target.value)}
                placeholder="例：G-XXXXXXXXXX"
              />
            </Field>
            <Field label="Meta Pixel">
              <Input
                value={org.metaPixelId}
                onChange={(e) => set('metaPixelId', e.target.value)}
                placeholder="純數字，例如 1234567890123456"
              />
            </Field>
          </div>
        </Card>

        {/* 登入設定 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">登入設定</h3>
          <p className="mb-4 text-xs text-orbit-400">控制客戶 / 員工的登入方式</p>
          <Toggle
            checked={org.isSmsLoginEnabled}
            onChange={(v) => set('isSmsLoginEnabled', v)}
            label="啟用簡訊登入"
            hint="關閉後，本商家的登入 / 預約驗證僅能透過 Email；可省下簡訊費用"
          />
        </Card>

        {/* 預約選項 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">預約選項</h3>
          <p className="mb-4 text-xs text-orbit-400">控制顧客在預約時能否指定特定人員 / 設備</p>
          <div className="space-y-4">
            <Toggle
              checked={org.allowCustomerPickStaff}
              onChange={(v) => set('allowCustomerPickStaff', v)}
              label="允許顧客指定服務人員"
              hint="開啟後，預約流程會多一步讓顧客選特定 staff 或「不指定」（系統自動指派可用人員）"
            />
            <Toggle
              checked={org.allowCustomerPickEquipment}
              onChange={(v) => set('allowCustomerPickEquipment', v)}
              label="允許顧客指定設備 / 場地"
              hint="開啟後，預約流程會多一步讓顧客選特定設備或「不指定」"
            />
            <Toggle
              checked={org.allowLineOnlyBooking}
              onChange={(v) => set('allowLineOnlyBooking', v)}
              label="允許只用 LINE 預約（免填電話 / Email）"
              hint="開啟後，從 LINE 進站的顧客不必填電話與 Email 即可預約，系統以 LINE 身分識別。適合只靠 LINE 聯繫的商家。需先完成 LINE 整合設定。"
            />

            <div className="border-t border-orbit-border pt-4">
              <div className="text-sm font-medium text-orbit-700">開放預約範圍</div>
              <div className="mt-0.5 text-xs text-orbit-400">
                決定顧客可以預約哪些日期。超出範圍的日期，前台預約頁與 LINE 預約都會擋下。
              </div>

              <div className="mt-3 flex gap-2">
                {[
                  ['rolling', '滾動天數'],
                  ['fixed', '指定日期區間'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setWindowMode(key)}
                    className={
                      'rounded-full px-4 py-1.5 text-sm ' +
                      (windowMode === key
                        ? 'bg-orbit-primary text-white'
                        : 'bg-orbit-warm text-orbit-500')
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {windowMode === 'rolling' ? (
                <div className="mt-4">
                  <Field label="滾動天數" hint="開放「今天起幾天內」，範圍每天自動往後推移">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-orbit-500">今天起</span>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        className="w-28"
                        value={org.customerBookingWindowDays ?? ''}
                        onChange={(e) => set('customerBookingWindowDays', Number(e.target.value))}
                      />
                      <span className="text-sm text-orbit-500">天內可預約（1–365）</span>
                    </div>
                  </Field>
                </div>
              ) : (
                <div className="mt-4">
                  <Field
                    label="指定日期區間"
                    hint="只開放固定的一段日期，不隨時間往後推移"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={org.customerBookingFixedStartDate ?? ''}
                        onChange={(e) => set('customerBookingFixedStartDate', e.target.value)}
                        placeholder="即日起"
                      />
                      <span className="text-sm text-orbit-400">～</span>
                      <Input
                        type="date"
                        value={org.customerBookingFixedEndDate ?? ''}
                        onChange={(e) => set('customerBookingFixedEndDate', e.target.value)}
                        placeholder="無截止日"
                      />
                    </div>
                  </Field>
                  <p className="mt-1 text-xs text-orbit-400">
                    開始日期留空＝即日起開放；結束日期留空＝無截止日。「最少提前預約天數」仍會生效。
                  </p>
                </div>
              )}
            </div>

            <Field
              label="最少提前預約天數"
              hint="顧客最少須提前幾天才能預約（0–365；0 = 可當天預約）。例如填 2，顧客只能預約後天以後的日期；前台預約頁與 LINE 預約都會擋下太近的日期。"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  className="w-28"
                  value={org.customerBookingLeadDays ?? ''}
                  onChange={(e) => set('customerBookingLeadDays', Number(e.target.value))}
                />
                <span className="text-sm text-orbit-500">天</span>
              </div>
            </Field>
          </div>
        </Card>

        {/* 品牌識別 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">品牌識別</h3>
          <p className="mb-4 text-xs text-orbit-400">Logo 與網站圖示，讓預約頁更有品牌感</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Logo"
              hint="顯示在預約頁上方商家名稱左側；上傳後會自動生成社群分享卡片圖（LINE、Facebook 分享連結時顯示）"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-orbit-warm text-xs text-orbit-400">
                  {logoPreview ? (
                    <img src={logoPreview} alt="商家 Logo" className="h-full w-full object-cover" />
                  ) : (
                    '未設定'
                  )}
                </div>
                <label className="orbit-btn orbit-btn-ghost cursor-pointer">
                  {logoPreview ? '更換' : '上傳'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={pickImage(setLogoPreview)}
                  />
                </label>
                {logoPreview && (
                  <Button variant="outline" onClick={() => setLogoPreview(null)}>
                    移除
                  </Button>
                )}
              </div>
            </Field>
            <Field
              label="網站圖示"
              hint="顯示在瀏覽器分頁標籤上；建議使用正方形圖片，非正方形會自動裁切置中"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-orbit-warm text-xs text-orbit-400">
                  {faviconPreview ? (
                    <img
                      src={faviconPreview}
                      alt="網站圖示"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    '無'
                  )}
                </div>
                <label className="orbit-btn orbit-btn-ghost cursor-pointer">
                  {faviconPreview ? '更換' : '上傳'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={pickImage(setFaviconPreview)}
                  />
                </label>
                {faviconPreview && (
                  <Button variant="outline" onClick={() => setFaviconPreview(null)}>
                    移除
                  </Button>
                )}
              </div>
            </Field>
          </div>
        </Card>

        {/* 形象圖片 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">形象圖片</h3>
          <p className="mb-4 text-xs text-orbit-400">顯示在商品展示頁的首頁橫幅</p>
          <div className="overflow-hidden rounded-xl border border-dashed border-orbit-border">
            {coverPreview ? (
              <img src={coverPreview} alt="形象圖片" className="h-40 w-full object-cover" />
            ) : (
              <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-1 text-xs text-orbit-400">
                <span>點擊選擇圖片</span>
                <span>建議尺寸 1200 x 400 px</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={pickImage(setCoverPreview)}
                />
              </label>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <label className="orbit-btn orbit-btn-ghost cursor-pointer">
              {coverPreview ? '更換圖片' : '點擊選擇圖片'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pickImage(setCoverPreview)}
              />
            </label>
            <Button variant="outline">AI 生成</Button>
            {coverPreview && (
              <Button variant="outline" onClick={() => setCoverPreview(null)}>
                移除
              </Button>
            )}
          </div>
        </Card>

        {/* 商家描述 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">商家描述</h3>
          <p className="mb-4 text-xs text-orbit-400">介紹您的商家，讓客戶更了解您</p>
          <Field label="描述內容">
            <textarea
              value={org.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="簡單介紹您的商家..."
              rows={5}
              className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
            />
          </Field>
        </Card>
      </div>
    </div>
  )
}
