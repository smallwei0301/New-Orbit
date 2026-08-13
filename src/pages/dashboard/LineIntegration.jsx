import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, Field, Input, Toggle, Badge, PageHeader } from '../../components/ui/index.jsx'
import { defaultLineBotSettings, lineBotValidation } from '../../config/tenant.js'
import { pages } from '../../i18n/strings.js'
import { lineBotService } from '../../lib/services.js'
import { useApi, useMutation, errorMessage } from '../../lib/useApi.js'


/**
 * LINE 整合 — the central per-tenant integration page.
 * Two independent LINE channels are configured here:
 *   1) Messaging API (客服機器人): oaBasicId / channelSecret / channelAccessToken
 *   2) LINE Login + LIFF (自動綁定): lineLiffId / lineLoginChannelId (saved on org)
 * Secrets are write-only: blank input = "留空表示不變更".
 */
export default function LineIntegration() {
  const { orgSlug } = useParams()
  const ORG_ID = orgSlug
  const [tab, setTab] = useState('messaging')
  const { data: lineBot, loading: lineBotLoading, reload } = useApi(
    () => lineBotService.get(ORG_ID),
    []
  )
  const [bot, setBot] = useState(defaultLineBotSettings)
  const [liff, setLiff] = useState({ lineLiffId: '', lineLoginChannelId: '' })
  const [errors, setErrors] = useState({})
  const [saveMessage, setSaveMessage] = useState('')
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    if (!lineBot) return
    setBot((b) => ({
      ...b,
      isEnabled: lineBot.isEnabled,
      isFlexMenuEnabled: lineBot.isFlexMenuEnabled,
      oaBasicId: lineBot.oaBasicId || '',
      channelSecret: '',
      channelAccessToken: '',
      hasChannelSecret: lineBot.hasChannelSecret,
      hasChannelAccessToken: lineBot.hasChannelAccessToken,
      webhookUrl: lineBot.webhookUrl || '',
    }))
  }, [lineBot])

  const set = (k, v) => setBot((b) => ({ ...b, [k]: v }))

  const validate = () => {
    const e = {}
    const { oaBasicId, channelSecret, channelAccessToken } = bot
    if (oaBasicId && !lineBotValidation.oaBasicId.pattern.test(oaBasicId))
      e.oaBasicId = lineBotValidation.oaBasicId.error
    if (channelSecret && !lineBotValidation.channelSecret.pattern.test(channelSecret))
      e.channelSecret = lineBotValidation.channelSecret.error
    if (channelAccessToken && channelAccessToken.length < lineBotValidation.channelAccessToken.minLength)
      e.channelAccessToken = lineBotValidation.channelAccessToken.error
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const { run: runSave, saving } = useMutation((payload) => lineBotService.upsert(ORG_ID, payload))

  const handleSave = async () => {
    if (!validate()) return
    setSaveMessage('')
    try {
      await runSave({
        isEnabled: bot.isEnabled,
        isFlexMenuEnabled: bot.isFlexMenuEnabled,
        oaBasicId: bot.oaBasicId,
        channelSecret: bot.channelSecret,
        channelAccessToken: bot.channelAccessToken,
      })
      setSaveMessage('儲存成功')
      reload()
    } catch (e) {
      setSaveMessage(`儲存失敗：${errorMessage(e)}`)
    } finally {
      setTimeout(() => setSaveMessage(''), 3200)
    }
  }

  const { run: runTest, saving: testing } = useMutation(() => lineBotService.test(ORG_ID))

  const handleTest = async () => {
    setTestResult('')
    try {
      const res = await runTest()
      setTestResult(`連線成功：${res.displayName} (${res.basicId})`)
    } catch {
      setTestResult('連線失敗')
    }
  }

  const messagingConfigured = !!(bot.hasChannelSecret && bot.hasChannelAccessToken)

  return (
    <div>
      <PageHeader
        title={pages['line-integration'].title}
        subtitle={pages['line-integration'].subtitle}
        actions={
          <div className="flex items-center gap-3">
            {saveMessage && <span className="text-xs text-orbit-500">{saveMessage}</span>}
            <Button onClick={handleSave} disabled={saving || lineBotLoading}>
              {saving ? '儲存中...' : '儲存設定'}
            </Button>
          </div>
        }
      />

      {/* Overview cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          [
            '客服機器人',
            '客人可以透過客服機器人自助預約、修改時間、取消預約，並可透過 LINE 推送預約提醒、繳費提醒等',
            messagingConfigured,
          ],
          ['LINE 自動綁定', '客人從 LINE 圖文選單點選時，將自動辨識身份', false],
          ['對話管理', '把單一對話轉為人工接手，暫停 AI 自動回應，由您親自在 LINE 官方帳號回覆', false],
        ].map(([title, desc, configured]) => (
          <Card key={title}>
            <div className="flex items-center justify-between">
              <div className="font-medium text-orbit-900">{title}</div>
              <Badge tone={configured ? 'success' : 'default'}>{configured ? '已設定' : '未設定'}</Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-orbit-400">{desc}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {[
          ['messaging', '客服機器人'],
          ['liff', 'LINE 自動綁定'],
          ['sessions', '對話管理'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              'rounded-full px-4 py-1.5 text-sm ' +
              (tab === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'messaging' && (
        <div className="space-y-6">
          <Card>
            <Toggle
              checked={bot.isEnabled}
              onChange={(v) => set('isEnabled', v)}
              label="啟用 LINE 聊天機器人"
              hint="客戶傳訊息會收到 AI 自動回覆，預約通知會透過 LINE 推送"
            />
            <div className="mt-4">
              <Toggle
                checked={bot.isFlexMenuEnabled}
                onChange={(v) => set('isFlexMenuEnabled', v)}
                label="LINE 卡片選單 (beta 試用版)"
                hint="服務、可預約時段、預約查詢改以卡片選單呈現，顧客可直接點卡片按鈕操作"
              />
            </div>
          </Card>

          <Card>
            <h3 className="mb-1 font-medium text-orbit-900">LINE Channel 憑證</h3>
            <p className="mb-4 text-xs text-orbit-400">
              請至 LINE Official Account Manager、LINE Developers Console 取得以下資訊
            </p>
            <div className="space-y-4">
              <Field
                label="LINE 官方帳號 ID"
                hint={errors.oaBasicId || '用於產生客戶的 LINE 綁定 deep link，可填 @abc123 或 abc123'}
              >
                <Input
                  value={bot.oaBasicId}
                  onChange={(e) => set('oaBasicId', e.target.value)}
                  placeholder="例如 @abc123"
                  maxLength={64}
                />
              </Field>
              <Field label="Channel Secret" hint={errors.channelSecret}>
                <Input
                  type="password"
                  value={bot.channelSecret}
                  onChange={(e) => set('channelSecret', e.target.value)}
                  placeholder="留空表示不變更"
                  maxLength={128}
                />
              </Field>
              <Field label="Channel Access Token" hint={errors.channelAccessToken}>
                <Input
                  type="password"
                  value={bot.channelAccessToken}
                  onChange={(e) => set('channelAccessToken', e.target.value)}
                  placeholder="留空表示不變更"
                />
              </Field>
              <Field
                label="Webhook 網址"
                hint="貼到 LINE Developers Console > Messaging API > Webhook settings"
              >
                <div className="flex gap-2">
                  <Input readOnly value={bot.webhookUrl} placeholder="（儲存後由系統產生）" />
                  <Button variant="outline">複製</Button>
                </div>
              </Field>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  {testing ? '測試中...' : '測試連線'}
                </Button>
                <span className="self-center text-xs text-orbit-400">
                  用目前已儲存的 token 呼叫 LINE /v2/bot/info 驗證
                </span>
              </div>
              {testResult && <p className="text-xs text-orbit-500">{testResult}</p>}
            </div>
            <p className="mt-4 rounded-xl bg-orbit-info-bg p-3 text-xs text-orbit-500">
              提示：三個欄位需一起填寫或一起清空；啟用 LINE 聊天機器人前必須完成 LINE 整合設定。
            </p>
          </Card>
        </div>
      )}

      {tab === 'liff' && (
        <Card>
          <h3 className="mb-1 font-medium text-orbit-900">LIFF 設定欄位</h3>
          <p className="mb-4 text-xs text-orbit-400">兩個都填才會生效；任一空白都視為不啟用</p>
          <div className="space-y-4">
            <Field
              label="LIFF App ID"
              hint="步驟二建立 LIFF App 後取得，格式如「1234567890-AbCdEfGh」。留空代表不啟用。"
            >
              <Input
                value={liff.lineLiffId}
                onChange={(e) => setLiff((s) => ({ ...s, lineLiffId: e.target.value }))}
                placeholder="1234567890-aBcDeFg"
                maxLength={64}
              />
            </Field>
            <Field
              label="Channel ID"
              hint="步驟一 LINE Login Channel 的 Channel ID（純數字），用來驗證客人的 LINE 身分。"
            >
              <Input
                value={liff.lineLoginChannelId}
                onChange={(e) => setLiff((s) => ({ ...s, lineLoginChannelId: e.target.value }))}
                placeholder="1234567890"
                maxLength={64}
              />
            </Field>
          </div>
        </Card>
      )}

      {tab === 'sessions' && (
        <Card>
          <p className="text-sm text-orbit-500">
            轉人工接手後，該客人的訊息 AI 將不自動回應，請至 LINE 官方帳號 App
            親自回覆；設定的時間到期後自動恢復 AI 回應。
          </p>
          <div className="mt-4 rounded-xl border border-dashed border-orbit-border p-8 text-center text-sm text-orbit-400">
            目前還沒有任何 LINE 對話紀錄
          </div>
        </Card>
      )}
    </div>
  )
}
