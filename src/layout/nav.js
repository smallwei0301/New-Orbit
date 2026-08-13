/**
 * Dashboard sidebar navigation — order, labels and paths verbatim from production.
 * `icon` names map to Tabler icons (the original used @tabler/icons-react).
 * Active state = pathname.startsWith(`/${orgSlug}/dashboard/${path}`).
 */
export const NAV_ITEMS = [
  { label: '行事曆', path: 'calendar', icon: 'calendar' },
  { label: '項目管理', path: 'items', icon: 'list' },
  { label: '資源管理', path: 'resources', icon: 'stack-2' },
  { label: '預約管理', path: 'orders', icon: 'file-text' },
  { label: '候補管理', path: 'waitlist', icon: 'clock' },
  { label: '客戶管理', path: 'customers', icon: 'users' },
  { label: '客戶開發', path: 'lead-generation', icon: 'target-arrow' },
  { label: '標籤管理', path: 'tags', icon: 'tag' },
  { label: '通知設定', path: 'notifications', icon: 'bell' },
  { label: '商家設定', path: 'organization', icon: 'settings' },
  { label: '客製預約頁', path: 'custom-booking-page', icon: 'template' },
  { label: '金流設定', path: 'payment-settings', icon: 'credit-card' },
  { label: 'LINE 整合', path: 'line-integration', icon: 'brand-line' },
  { label: '訂閱方案', path: 'upgrade', icon: 'sparkles' },
]

/** Sidebar footer actions. */
export const NAV_FOOTER = [
  { label: '查看商店頁', icon: 'home', action: 'view-store' },
  { label: '聯絡 Orbit 客服', icon: 'brand-line', action: 'contact-support' },
  { label: '登出', icon: 'logout', action: 'logout' },
]
