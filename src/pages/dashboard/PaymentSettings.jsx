import { useState } from 'react'
import { Button, Card, Field, Input, Toggle, Badge, PageHeader } from '../../components/ui/index.jsx'
import { defaultOrgSettings, defaultEcpaySettings, defaultJkopaySettings } from '../../config/tenant.js'

/**
 * 金流設定 — booking/payment flow rules, manual remittance info, legal
 * disclaimer, and the two mutually-exclusive online payment providers
 * (綠界 ECPay / 街口支付). Mirrors the LINE 整合 page's tabbed Card style.
 * No backend: all state is local, seeded from tenant.js defaults.
 */
export default function PaymentSettings() {
  const [org, setOrg] = useState(defaultOrgSettings)
  const [ecpay, setEcpay] = useState(defaultEcpaySettings)
  const [jkopay, setJkopay] = useState(defaultJkopaySettings)
  const [tab, setTab] = useState('ecpay')
  const [saveError, setSaveError] = useState('')

  const setOrgField = (k, v) => setOrg((o) => ({ ...o, [k]: v }))
  const setEcpayField = (k, v) => setEcpay((s) => ({ ...s, [k]: v }))
  const setJkopayField = (k, v) => setJkopay((s) => ({ ...s, [k]: v }))

  const hasOnlineProvider = ecpay.isEnabled || jkopay.isEnabled

  const ecpayConfiguredCount = [
    ecpay.merchantId,
    ecpay.hashKey || ecpay.hasHashKey,
    ecpay.hashIv || ecpay.hasHashIv,
  ].filter(Boolean).length
  const jkopayConfiguredCount = [
    jkopay.storeId,
    jkopay.apiKey || jkopay.hasApiKey,
    jkopay.secretKey || jkopay.hasSecretKey,
  ].filter(Boolean).length

  const handleSave = () => {
    if (ecpay.isEnabled && jkopay.isEnabled) {
      setSaveError('同時只能啟用一種線上金流，請先停用另一個金流供應商')
      return
    }
    setSaveError('')
  }

  return (
    <div>
      <PageHeader
        title="金流設定"
        subtitle="設定您的收款方式與相關資訊（平台不代收代付，款項由商家自行收取）"
        actions={<Button onClick={handleSave}>儲存設定</Button>}
      />

      {saveError && (
        <div className="mb-6 rounded-xl bg-orbit-danger/10 p-3 text-sm text-orbit-danger">
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {/* 預約與付款流程 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">預約與付款流程</h3>
          <p className="mb-4 text-xs text-orbit-400">設定預約建立後的付款與確認流程</p>
          <div className="space-y-4">
            <Toggle
              checked={org.isPaymentEnabled}
              onChange={(v) => setOrgField('isPaymentEnabled', v)}
              label="啟用金流"
              hint={
                org.isPaymentEnabled
                  ? '客戶預約時會顯示付款資訊，預約需手動確認'
                  : '客戶預約後預約自動確認，不經過付款流程'
              }
            />
            {!org.isPaymentEnabled && (
              <p className="rounded-xl bg-orbit-info-bg p-3 text-xs text-orbit-500">
                注意：關閉金流後，所有新預約將為免費預約，無需付款且會自動確認；若為套票商品，系統將立即發放兌換券。若希望由商家人工審核預約，請啟用「預約需經過商家確認」。
              </p>
            )}
            <Toggle
              checked={org.requireOrderApproval}
              onChange={(v) => setOrgField('requireOrderApproval', v)}
              label="預約需經過商家確認"
              hint={
                org.requireOrderApproval
                  ? '所有新預約會先進入待確認狀態'
                  : '符合條件的預約會自動確認（免付款或已完成付款）'
              }
            />
            <Field label="預約過期時間（小時）" hint="未付款預約超過此時間將自動取消">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  className="w-32"
                  value={org.orderExpiryMinutes ?? ''}
                  onChange={(e) =>
                    setOrgField('orderExpiryMinutes', e.target.value === '' ? null : Number(e.target.value))
                  }
                  placeholder="留空表示不自動取消"
                />
                <span className="text-sm text-orbit-500">小時</span>
              </div>
            </Field>
            <Field
              label="顧客自行取消時限（小時）"
              hint="當未啟用金流且不需商家確認時，顧客可在預約開始前此時間內自行取消"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  className="w-32"
                  value={org.selfCancelMinutes ?? ''}
                  onChange={(e) => setOrgField('selfCancelMinutes', Number(e.target.value))}
                />
                <span className="text-sm text-orbit-500">小時</span>
              </div>
            </Field>
          </div>
        </Card>

        {/* 手動匯款資訊 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">手動匯款資訊</h3>
          <p className="mb-4 text-xs text-orbit-400">客戶付款時可參考的銀行帳戶資訊</p>
          {hasOnlineProvider && (
            <p className="mb-4 rounded-xl bg-orbit-info-bg p-3 text-xs text-orbit-500">
              您已啟用線上金流，客戶可直接線上付款，<strong>通常不需要再額外提供手動匯款資訊</strong>。如不需要請將下方欄位留空。
            </p>
          )}
          <Field label="匯款帳戶">
            <textarea
              value={org.remittanceInfo}
              onChange={(e) => setOrgField('remittanceInfo', e.target.value)}
              placeholder="銀行名稱、帳號等匯款資訊..."
              rows={4}
              className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
            />
          </Field>
        </Card>

        {/* 法律聲明 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">法律聲明</h3>
          <p className="mb-4 text-xs text-orbit-400">平台與商家之間的金流責任說明</p>
          <p className="text-xs leading-relaxed text-orbit-500">
            平台不代收代付，所有款項由商家直接向客戶收取。商家須自行負擔金流交易手續費、稅務申報與相關法律責任。
            若使用綠界 ECPay，請先至 綠界官網 申請商店帳號後，於綠界後台取得 MerchantID、HashKey、HashIV
            並填入本頁表單。 若使用街口支付，請先向 街口支付
            申請商戶合作後，取得商店代號、API Key、Secret Key 並填入本頁表單。兩種線上金流同時只能啟用一種。
          </p>
        </Card>

        {/* 線上金流 */}
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">線上金流</h3>
          <p className="mb-4 text-xs text-orbit-400">連接綠界或街口收款；兩種線上金流同時只能啟用一種</p>

          <div className="mb-4 flex gap-2">
            {[
              ['ecpay', '綠界 ECPay', ecpay.isEnabled, ecpayConfiguredCount],
              ['jkopay', '街口支付', jkopay.isEnabled, jkopayConfiguredCount],
            ].map(([key, label, enabled, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={
                  'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ' +
                  (tab === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500')
                }
              >
                {label}
                {enabled && (
                  <Badge tone={tab === key ? 'default' : 'success'}>已設定 {count}</Badge>
                )}
              </button>
            ))}
          </div>

          {tab === 'ecpay' && (
            <div className="space-y-4">
              <Toggle
                checked={ecpay.isEnabled}
                onChange={(v) => setEcpayField('isEnabled', v)}
                label="啟用綠界金流"
                hint={
                  jkopay.isEnabled
                    ? '已啟用街口支付，線上金流同時只能啟用一種；如要改用綠界請先停用街口支付'
                    : '關閉後客戶將看不到綠界付款選項'
                }
              />
              <Field label="商店代號 (MerchantID)" hint="啟用綠界金流時必填">
                <Input
                  value={ecpay.merchantId}
                  onChange={(e) => setEcpayField('merchantId', e.target.value)}
                  placeholder="例如 2000132"
                />
              </Field>
              <Field label="HashKey" hint="第一次設定時必填">
                <Input
                  type="password"
                  value={ecpay.hashKey}
                  onChange={(e) => setEcpayField('hashKey', e.target.value)}
                  placeholder={ecpay.hasHashKey ? '留空表示不變更' : '輸入綠界 HashKey'}
                />
              </Field>
              <Field label="HashIV" hint="第一次設定時必填">
                <Input
                  type="password"
                  value={ecpay.hashIv}
                  onChange={(e) => setEcpayField('hashIv', e.target.value)}
                  placeholder={ecpay.hasHashIv ? '留空表示不變更' : '輸入綠界 HashIV'}
                />
              </Field>
            </div>
          )}

          {tab === 'jkopay' && (
            <div className="space-y-4">
              <Toggle
                checked={jkopay.isEnabled}
                onChange={(v) => setJkopayField('isEnabled', v)}
                label="啟用街口支付"
                hint={
                  ecpay.isEnabled
                    ? '已啟用綠界金流，線上金流同時只能啟用一種；如要改用街口請先停用綠界金流'
                    : '關閉後客戶將看不到街口付款選項'
                }
              />
              <Field label="商店代號 (Store ID)" hint="啟用街口支付時必填">
                <Input
                  value={jkopay.storeId}
                  onChange={(e) => setJkopayField('storeId', e.target.value)}
                  placeholder="街口提供的商店代號"
                />
              </Field>
              <Field label="API Key">
                <Input
                  type="password"
                  value={jkopay.apiKey}
                  onChange={(e) => setJkopayField('apiKey', e.target.value)}
                  placeholder="輸入街口 API Key"
                />
              </Field>
              <Field label="Secret Key" hint="第一次設定時必填">
                <Input
                  type="password"
                  value={jkopay.secretKey}
                  onChange={(e) => setJkopayField('secretKey', e.target.value)}
                  placeholder="輸入街口 Secret Key"
                />
              </Field>
            </div>
          )}

          <p className="mt-4 text-xs text-orbit-400">兩種線上金流同時只能啟用一種</p>
        </Card>
      </div>
    </div>
  )
}
