import { useState } from 'react'
import { Button, Card, PageHeader, Badge, Input } from '../../components/ui/index.jsx'
import { pages } from '../../i18n/strings.js'

const INITIAL_KEYWORDS = [
  { id: 'k1', keyword: '台北英文口說教學', paused: false, foundCount: 4, lastScanAt: '10 分鐘前' },
  { id: 'k2', keyword: '高雄美甲', paused: false, foundCount: 0, lastScanAt: null },
]

const INITIAL_POSTS = []

/** 客戶開發 — Threads keyword tracking + Meta 廣告代操 upsell. */
export default function LeadGeneration() {
  const [keywords, setKeywords] = useState(INITIAL_KEYWORDS)
  const [newKeyword, setNewKeyword] = useState('')
  const [posts] = useState(INITIAL_POSTS)

  const addKeyword = () => {
    const kw = newKeyword.trim()
    if (!kw || keywords.length >= 10) return
    setKeywords((prev) => [
      ...prev,
      { id: `k${Date.now()}`, keyword: kw, paused: false, foundCount: 0, lastScanAt: null },
    ])
    setNewKeyword('')
  }

  const togglePause = (id) => {
    setKeywords((prev) => prev.map((k) => (k.id === id ? { ...k, paused: !k.paused } : k)))
  }

  const removeKeyword = (id) => {
    const target = keywords.find((k) => k.id === id)
    if (!target) return
    if (!window.confirm(`確定要刪除關鍵字「${target.keyword}」嗎？已經找到的貼文紀錄會保留。`)) return
    setKeywords((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <div>
      <PageHeader title={pages['lead-generation'].title} subtitle={pages['lead-generation'].subtitle} />

      {/* Overview cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div className="font-medium text-orbit-900">Threads 潛在客戶開發</div>
            <Badge tone={keywords.length > 0 ? 'success' : 'default'}>
              {keywords.length > 0 ? '運作中' : '未設定'}
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-orbit-400">
            AI 自動找出具有潛在商機的 Threads 貼文，第一時間通知你
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div className="font-medium text-orbit-900">Meta 廣告代操</div>
            <Badge>洽詢中</Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-orbit-400">
            我們幫你投放 Facebook / Instagram 廣告，開發還沒聽過你的陌生客戶
          </p>
        </Card>
      </div>

      {/* Keyword tracking */}
      <Card className="mb-6">
        <h3 className="mb-1 font-medium text-orbit-900">關鍵字追蹤</h3>
        <p className="mb-4 text-xs leading-relaxed text-orbit-400">
          設定想追蹤的關鍵字後，當有人在 Threads 公開貼文提及這些關鍵字時，AI
          會分析貼文內容，判斷可能為潛在客戶後發送通知。通知將依「通知設定 →
          潛在客戶通知」的設定發送。
        </p>

        <div className="mb-1 text-sm font-medium text-orbit-700">新增關鍵字</div>
        <p className="mb-2 text-xs text-orbit-400">想想客人會怎麼在社群上問你的服務，把那句話的關鍵字加進來。</p>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="例如：台北英文口說教學、高雄美甲"
            maxLength={64}
            disabled={keywords.length >= 10}
          />
          <Button onClick={addKeyword} disabled={!newKeyword.trim() || keywords.length >= 10}>
            新增
          </Button>
        </div>
        <p className="mt-1 text-xs text-orbit-400">最多 10 個關鍵字。每 10 分鐘掃一次，多個關鍵字請以空白分隔</p>

        {keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {keywords.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-2 rounded-full bg-orbit-warm px-3 py-1.5 text-xs text-orbit-700"
              >
                <span className="font-medium">{k.keyword}</span>
                <span className="text-orbit-400">
                  {k.paused
                    ? '已暫停'
                    : k.foundCount > 0
                      ? `已找到 ${k.foundCount} 則・最後掃描 ${k.lastScanAt}`
                      : `已找到 ${k.foundCount} 則・尚未開始掃描`}
                </span>
                <button
                  className="text-orbit-primary hover:underline"
                  onClick={() => togglePause(k.id)}
                >
                  {k.paused ? '恢復掃描' : '暫停掃描'}
                </button>
                <button className="text-orbit-danger hover:underline" onClick={() => removeKeyword(k.id)}>
                  刪除
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Found posts */}
      <Card>
        <div className="mb-1 font-medium text-orbit-900">
          {posts.length > 0 ? `找到的貼文（${posts.length}）` : '找到的貼文'}
        </div>
        <p className="mb-4 text-xs text-orbit-400">關鍵字命中的公開貼文，點連結直接去留言或私訊</p>
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-orbit-border p-8 text-center text-sm text-orbit-400">
            還沒有命中的貼文。設好關鍵字後，掃到符合的公開貼文就會出現在這裡。
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-orbit-border p-3">
                <div className="text-sm text-orbit-700">{p.snippet}</div>
                <Button variant="outline">看貼文</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
