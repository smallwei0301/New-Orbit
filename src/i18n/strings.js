/**
 * UI copy (zh-Hant) — structured strings.
 * ---------------------------------------
 * This holds the COMMON vocabulary + every dashboard page's title/subtitle so
 * the skeleton renders real product copy. The exhaustive per-component copy
 * (every label, placeholder, toast, validation message, notification template)
 * is catalogued in docs/UI-COPY.md — pull from there as each page is built out.
 */

export const common = {
  confirm: '確定',
  cancel: '取消',
  save: '儲存',
  saving: '儲存中...',
  saveSettings: '儲存設定',
  delete: '刪除',
  deleting: '刪除中...',
  confirmDelete: '確定刪除',
  add: '新增',
  edit: '編輯',
  create: '建立',
  update: '更新',
  copy: '複製',
  copied: '已複製',
  copyLink: '複製連結',
  remove: '移除',
  close: '關閉',
  back: '返回',
  backToPrev: '返回上一頁',
  next: '下一步',
  prev: '上一步',
  done: '完成',
  processing: '處理中...',
  loading: '載入中...',
  submit: '送出',
  moreActions: '更多操作',
  noData: '沒有資料',
  searchPlaceholder: '搜尋...',
  freeLabel: '免費',
}

export const errors = {
  boundaryTitle: '發生了一個錯誤',
  boundaryBody: '抱歉，頁面發生了問題。我們已經記錄此錯誤，並會盡快修復。',
  reload: '重新載入',
  network: '無法連線到伺服器，請檢查網路連線',
  unknown: '發生未知錯誤，請稍後再試',
  noPermission: '沒有此商家的權限',
}

/** Order + payment + waitlist status vocab (canonical). */
export const status = {
  order: { UNPAID: '待付款', PENDING: '待確認', CONFIRMED: '已確認', CANCELLED: '已取消' },
  payment: { UNPAID: '待付款', PAID: '已付款', FAILED: '失敗', REFUNDED: '已退款', CANCELLED: '已取消' },
  waitlist: {
    WAITING: '候補中',
    NOTIFIED: '已通知',
    CONVERTED: '已轉為預約',
    EXPIRED: '已逾期',
    CANCELLED: '已取消',
    CLOSED_BY_ORG: '候補功能已關閉',
  },
}

/** item modes / resource types */
export const enums = {
  itemMode: { SERVICE: '任選時段', PACKAGE: '套票', COURSE: '固定場次' },
  resourceType: { EQUIPMENT: '設備/場地', STAFF: '員工' },
}

/** Dashboard page headers: title + subtitle, keyed by route path. */
export const pages = {
  overview: { title: '', subtitle: '以下是今天的營運概覽' },
  calendar: { title: '行事曆', subtitle: '查看各項目的預約狀況' },
  items: { title: '項目管理', subtitle: '管理固定場次、任選時段與套票項目' },
  resources: { title: '資源管理', subtitle: '管理設備/場地、人員等預約所需資源' },
  orders: { title: '預約管理', subtitle: '共 {n} 筆預約' },
  waitlist: {
    title: '候補管理',
    subtitle: '滿額的固定場次 / 任選時段會自動建立候補名單；有預約取消時，會自動通知名單上的第一位。',
  },
  customers: { title: '客戶管理', subtitle: '管理您的客戶資訊與消費紀錄' },
  'lead-generation': { title: '客戶開發', subtitle: '主動找到還沒上門的客人' },
  tags: { title: '標籤管理', subtitle: '管理本商家的客戶標籤，可在客戶管理頁逐個指派' },
  notifications: { title: '通知設定', subtitle: '設定自動通知規則，自訂發送時機與訊息內容' },
  organization: { title: '商家設定', subtitle: '管理商家基本資訊與顯示設定' },
  'custom-booking-page': {
    title: '客製預約頁',
    subtitle: '用 AI 或 HTML 原始碼修改顧客看到的店家頁面；留空則沿用預設排版',
  },
  'payment-settings': {
    title: '金流設定',
    subtitle: '設定您的收款方式與相關資訊（平台不代收代付，款項由商家自行收取）',
  },
  'line-integration': { title: 'LINE 整合', subtitle: '兩種 LINE 整合，對應不同 Channel，可分開啟用' },
  upgrade: { title: '訂閱方案', subtitle: '選擇最適合您團隊規模的方案' },
}

export const auth = {
  signIn: {
    heading: '歡迎回來',
    lead: '登入您的帳號，管理預約、掌握營運，讓每一天的服務更加順暢。',
    title: '登入您的 Orbit 帳號',
    email: 'Email',
    phone: '手機號碼',
    password: '密碼',
    passwordPlaceholder: '請輸入密碼',
    forgot: '忘記密碼？',
    submit: '登入',
    magicLink: '使用安全連結登入',
    noAccount: '還沒有帳號？',
    createAccount: '建立帳號',
    success: '登入成功',
    fail: '登入失敗，請稍後再試',
  },
  signUp: {
    heading: '開始您的旅程',
    lead: '建立帳號，輕鬆管理預約與客戶，打造更好的服務體驗。',
    title: '開始使用 Orbit 預約系統',
    submit: '建立商家',
    haveAccount: '已有帳號？',
  },
  forgot: {
    heading: '忘記密碼',
    lead: '輸入您的 Email，我們將寄送重設密碼連結',
    submit: '發送重設連結',
    backToSignIn: '返回登入',
  },
}
