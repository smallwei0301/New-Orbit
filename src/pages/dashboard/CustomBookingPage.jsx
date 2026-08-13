import { useState } from 'react'
import { Button, Card, PageHeader } from '../../components/ui/index.jsx'
import { clsx } from '../../components/ui/clsx.js'
import { pages } from '../../i18n/strings.js'

const COLOR_SLOTS = [
  { key: 'primary', label: '主色 / 按鈕', value: '#B45309' },
  { key: 'primaryHover', label: '主色（滑過）', value: '#92400E' },
  { key: 'pageBg', label: '頁面底色', value: '#FDF8F1' },
  { key: 'secondaryBg', label: '次要底色', value: '#F5EBDD' },
  { key: 'cardBg', label: '卡片底色', value: '#FFFFFF' },
  { key: 'border', label: '邊框', value: '#E7DCC9' },
  { key: 'heading', label: '標題文字', value: '#3F2E1E' },
  { key: 'darkText', label: '深文字', value: '#4B3A28' },
  { key: 'text', label: '一般文字', value: '#6B5A47' },
  { key: 'secondaryText', label: '次要文字', value: '#9C8A73' },
  { key: 'lightestText', label: '最淺文字', value: '#C9BBA3' },
  { key: 'success', label: '成功綠', value: '#2E7D32' },
  { key: 'danger', label: '警示紅', value: '#C0392B' },
]

const THEMES = [
  { id: 'default', name: '溫暖大地（預設）', desc: '系統預設版面', price: 0, active: true },
  { id: 'minimal', name: '簡約白', desc: '大量留白，強調商品照片', price: 0, active: false },
  { id: 'nightsky', name: '夜幕藍', desc: '深色系，適合晚間營業的店家', price: 300, active: false },
]

const DEFAULT_HTML = `<section class="orbit-page">
  <header class="orbit-header">{{orgName}}</header>
  <div class="orbit-items">{{itemList}}</div>
</section>`

/** 客製預約頁 — AI/HTML editor for the customer-facing booking page. */
export default function CustomBookingPage() {
  const [aiTab, setAiTab] = useState('page')
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [thinking, setThinking] = useState(false)

  const [colors, setColors] = useState(() =>
    Object.fromEntries(COLOR_SLOTS.map((c) => [c.key, c.value]))
  )
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [device, setDevice] = useState('desktop')
  const [saving, setSaving] = useState(false)
  const [themes] = useState(THEMES)

  const sendMessage = () => {
    const text = chatInput.trim()
    if (!text) return
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text }])
    setChatInput('')
    setThinking(true)
    setTimeout(() => {
      setThinking(false)
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', text: '已了解，示範環境不會實際套用版面調整。' },
      ])
    }, 600)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const resetColors = () => {
    setColors(Object.fromEntries(COLOR_SLOTS.map((c) => [c.key, c.value])))
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 500)
  }

  const devices = [
    ['desktop', '桌面'],
    ['tablet', '平板'],
    ['phone', '手機'],
  ]

  return (
    <div>
      <PageHeader
        title={pages['custom-booking-page'].title}
        subtitle={pages['custom-booking-page'].subtitle}
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '儲存中…' : '儲存'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* AI assistant */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-orbit-900">AI 助手</h3>
              <button
                className="text-xs text-orbit-400 hover:text-orbit-700"
                onClick={() => setMessages([])}
              >
                清除對話
              </button>
            </div>
            <div className="mb-3 flex gap-2">
              {[
                ['page', '整頁排版'],
                ['card', '商品卡片'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAiTab(key)}
                  className={clsx(
                    'rounded-full px-4 py-1.5 text-sm',
                    aiTab === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-orbit-warm p-3">
              {messages.length === 0 ? (
                <p className="text-xs text-orbit-400">
                  Enter 送出、Shift+Enter 換行；對「整頁排版」說明版面、對「商品卡片」說明每張卡片要怎麼呈現，AI
                  會記得這串對話。
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={clsx(
                      'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                      m.role === 'user' ? 'ml-auto bg-orbit-primary text-white' : 'bg-white text-orbit-700'
                    )}
                  >
                    {m.text}
                  </div>
                ))
              )}
              {thinking && <div className="text-xs text-orbit-400">思考中…</div>}
            </div>

            <div className="flex gap-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={
                  aiTab === 'page'
                    ? '例如：把封面變大、標題置中、加一段歡迎詞'
                    : '例如：卡片改成圓角、價格放左下、圖片變大'
                }
                className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 text-sm text-orbit-700 placeholder:text-orbit-300 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
              />
              <Button onClick={sendMessage} disabled={thinking || !chatInput.trim()}>
                {thinking ? '生成中…' : '送出'}
              </Button>
            </div>
          </Card>

          {/* Theme library */}
          <Card>
            <h3 className="font-medium text-orbit-900">主題樣式庫</h3>
            <p className="mt-1 mb-4 text-xs text-orbit-400">
              主題包含整套版面與配色；套用後可再用 AI、主題配色或原始碼微調，記得按儲存
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {themes.map((t) => (
                <div key={t.id} className="rounded-xl border border-orbit-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-orbit-900">{t.name}</div>
                    {t.active && (
                      <span className="rounded-full bg-orbit-success-bg px-2 py-0.5 text-xs text-orbit-success">
                        使用中
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-orbit-400">{t.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline">看示意圖</Button>
                    {!t.active && (
                      <Button variant="outline">
                        {t.price > 0 ? `購買 NT$ ${t.price}` : '套用這個主題'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline">新增我的主題</Button>
              <p className="mt-1 text-xs text-orbit-400">以目前編輯中的版面建立</p>
            </div>
          </Card>

          {/* Color palette */}
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-orbit-900">主題配色</h3>
              <button className="text-xs text-orbit-400 hover:text-orbit-700" onClick={resetColors}>
                恢復預設
              </button>
            </div>
            <p className="mt-1 mb-4 text-xs text-orbit-400">
              點色塊換顏色，整頁（含商品卡）會套用；也可以用 AI 說「主色換成藍色」
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COLOR_SLOTS.map((slot) => (
                <label key={slot.key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[slot.key]}
                    onChange={(e) => setColors((c) => ({ ...c, [slot.key]: e.target.value }))}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-full border border-orbit-border"
                  />
                  <span className="text-xs text-orbit-500">{slot.label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Raw HTML editor */}
          <Card>
            <h3 className="font-medium text-orbit-900">編輯 HTML 原始碼</h3>
            <p className="mt-1 mb-3 text-xs text-orbit-400">
              進階：直接編輯版面 HTML（商品卡片模板在下方另外編輯）
            </p>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full rounded-xl border border-orbit-border bg-white px-3.5 py-2.5 font-mono text-xs text-orbit-700 focus:outline-none focus:ring-2 focus:ring-orbit-primary/30"
            />
          </Card>
        </div>

        {/* Right column: preview */}
        <div>
          <Card className="sticky top-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-orbit-900">裝置預覽</h3>
              <div className="flex gap-2">
                {devices.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setDevice(key)}
                    className={clsx(
                      'rounded-full px-3 py-1 text-xs',
                      device === key ? 'bg-orbit-primary text-white' : 'bg-orbit-warm text-orbit-500'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div
              className={clsx(
                'mx-auto rounded-xl border border-orbit-border bg-orbit-bg p-4',
                device === 'desktop' && 'w-full',
                device === 'tablet' && 'max-w-md',
                device === 'phone' && 'max-w-xs'
              )}
              style={{ backgroundColor: colors.pageBg }}
            >
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-orbit-border p-6 text-center text-xs text-orbit-400">
                唯讀預覽，請用上方 AI 或下方 HTML 原始碼修改
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
