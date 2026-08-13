import { PageHeader } from '../../components/ui/index.jsx'
import { pages } from '../../i18n/strings.js'

/**
 * Structured placeholder for a dashboard page not yet fleshed out.
 * It still renders the REAL production title/subtitle so the skeleton is
 * navigable and 1:1 in chrome. Replace the body per docs/UI-COPY.md + SPEC.md.
 */
export default function StubPage({ routeKey, note }) {
  const p = pages[routeKey] || { title: routeKey, subtitle: '' }
  return (
    <div>
      <PageHeader title={p.title} subtitle={p.subtitle?.replace('{n}', '0')} />
      <div className="orbit-card flex flex-col items-center justify-center gap-2 p-12 text-center">
        <div className="text-sm font-medium text-orbit-500">此頁面為骨架佔位</div>
        <p className="max-w-md text-xs leading-relaxed text-orbit-400">
          {note ||
            '依 docs/UI-COPY.md 對應章節與 docs/SPEC.md 的欄位／狀態定義，即可補完此頁的表格、表單與彈窗。'}
        </p>
      </div>
    </div>
  )
}
