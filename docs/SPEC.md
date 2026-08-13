# Orbit 後台 — 系統規格 (Architecture & Spec)

> 依此文件 + `DESIGN-SYSTEM.md` + `UI-COPY.md`，可重建與 Orbit 線上後台 100% 一致的多租戶預約系統，並可先在本地部署。

## 0. 產品概觀

Orbit（`orbit.homo.tw`，公司「智人股份有限公司」）是為實體服務業（瑜伽、醫療、健身、美髮美甲、身心靈等）打造的 **AI 預約 SaaS**。核心賣點：客人用 LINE 自助預約，系統自動提醒、自動候補遞補、自動對帳；商家在後台管理項目、資源、預約、客戶、金流與通知。

- 前端：**React + Vite SPA**，React Router v6，Redux Toolkit，Tailwind（自訂 orbit 色系）。
- 多租戶：網址第一段是 **vendor slug**（`/:orgSlug/...`，例：`/midao/dashboard`）。同一個帳號透過 `auth/exchange-to-org-token` 換取該商家的 token。
- 後端契約：REST，base 原為 `https://orbit.homo.tw/api/v1`（本重建抽成 `VITE_API_BASE_URL`）。

## 1. 路由樹 (Routes)

### 公開 / 行銷
| Path | 說明 |
|---|---|
| `/`（index） | 行銷首頁（hero、痛點、功能、產業、方案、FAQ、「Orbit 小幫手」聊天 widget） |
| `/privacy-policy` | 隱私權政策（靜態長文） |
| `/vendor-terms` | 商家服務條款（靜態長文，1–20 條） |
| `/progress` | 開發日誌（規劃中 / 已發布 / 許願池） |
| `/r/:code` | 短網址 / QR 轉址 |

### 認證（同時註冊於 root 與 `/:orgSlug` 下）
| Path | 頁面 |
|---|---|
| `sign-in` | 登入（手機/Email + 密碼，或安全連結 magic-link） |
| `sign-up` | 商家註冊 |
| `forgot-password` | 忘記密碼 |
| `reset-password` | 重設密碼 |
| `activate` | Email 驗證結果 |
| `verify-sign-in-link` | 6 碼驗證 / magic-link 自動登入 |
| `accept-invitation`（僅 `/:orgSlug`） | 員工邀請接受 |

### 顧客端店面 `/:orgSlug/*`
`index`（店面首頁/探索項目）、`items/:itemId`（商品詳情）、`calendar`（時段選擇）、`orders`（我的預約/我的候補）、`claim/:token`（揪團加入）、`payment-result`（付款結果）。

### 後台（受保護）`/:orgSlug/dashboard/*`
Auth guard：讀 `token` cookie → 解碼 JWT → 無效導向 `/sign-in?redirect-url=...`；檢查 `staff` 名單，非本商家成員顯示「沒有此商家的權限」。

| Path | 頁面 | 側欄 |
|---|---|---|
| `（index）` | 營運概覽 Overview | — |
| `calendar` | 行事曆 | ✓ 1 |
| `items` `/new` `/:id` `/:id/waiting-list` | 項目管理 / 編輯 / 候補名單 | ✓ 2 |
| `resources` `/new` `/:id` | 資源管理 / 編輯 | ✓ 3 |
| `orders` `/:orderId` | 預約管理 / 詳情 | ✓ 4 |
| `waitlist` | 候補管理 | ✓ 5 |
| `customers` `/:customerId` | 客戶管理 / 詳情 | ✓ 6 |
| `lead-generation` | 客戶開發 | ✓ 7 |
| `tags` | 標籤管理 | ✓ 8 |
| `notifications` | 通知設定 | ✓ 9 |
| `organization` | 商家設定 | ✓ 10 |
| `custom-booking-page` | 客製預約頁 | ✓ 11 |
| `payment-settings` | 金流設定 | ✓ 12 |
| `line-integration` | LINE 整合 | ✓ 13 |
| `upgrade` | 訂閱方案 | ✓ 14 |
| `customer-tags` | 新/舊客戶標記（無側欄入口） | — |

側欄順序、標籤、圖示見 `src/layout/nav.js`。頁尾三項：`查看商店頁`、`聯絡 Orbit 客服`、`登出`。

## 2. 版面結構 (Layout)

- **手機**：頂部 bar（☰ 開啟選單 / 置中 Logo）；抽屜側欄 `w-72`、`rounded-r-[40px]`、backdrop blur。
- **桌機**：可收合側欄（`w-56` ↔ `w-14`，狀態存 `localStorage`），右緣 `shadow-orbit-nav`。
- **內容區**：`<main>` 可捲動、切換路由回捲至頂、`max-w-6xl` 置中。
- **全域彈窗宿主**：由 `modals` slice 驅動（客戶消費紀錄、資源使用日曆等）。

## 3. 狀態管理 (Redux Toolkit)

`configureStore`，六個 slice（見 `src/store/index.js`）：

| Slice | 內容 |
|---|---|
| `constants` | 一次性載入的 App 常數 `{ data }` |
| `me` | 目前使用者 `{ user, staff[], blockedOrgIds[], isSuperUser }` |
| `org` | 目前商家 `{ current }`（依 `:orgSlug` 載入） |
| `modals` | 全域彈窗 `{ lineBinding, customerOrders, resourceUsage }` |
| `planBanner` | 升級提示 `{ visible, requiredPlan, requiredPlanDisplayName, currentPlan }` |
| `ui` | 各商家 UI 偏好 `{ itemsExpandedIds, itemsListSearch }`（依 orgSlug 分鍵） |

## 4. 認證機制 (Auth)

- Token 存 **cookie**：`token`（JWT access, 7 天）、`refreshToken`（60 天），`Secure; SameSite=Strict; path=/`。
- 請求攔截器加 `Authorization: Bearer <token>`。
- 401（非 refresh 端點）→ POST `auth/refresh` 換新 token，重試一次；失敗則清 cookie 導向 `/:orgSlug/sign-in?redirect-url=`。
- 多租戶：`auth/exchange-to-org-token`。顧客端另有簡訊/Email OTP（`store/auth/*`）。LIFF 自動登入：`liff/start { orgId, idToken }`。
- 錯誤碼：`TOKEN_EXPIRED, INVALID_TOKEN, INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED, INSUFFICIENT_PERMISSION, PLAN_FEATURE_REQUIRED(402)`。

## 5. API 端點契約 (Endpoints)

Base：`VITE_API_BASE_URL`。完整清單見 `src/lib/api.js` 的 `ENDPOINTS`。重點：

- **Auth**：`auth/sign-up|sign-in|check-email|logout|refresh|forgot-password|verify-reset-token|reset-password|resend-verification|activate|send-sign-in-link|verify-login-code|exchange-to-org-token|accept-staff-invitation`
- **Org**：`organizations`（POST）、`organizations/:slug`（GET）、`organizations/check-slug`、`organizations/:id`（PUT）、`.../branding-images`（multipart logo/icon）、`.../merchant-line-binding-code`
- **成員**：`members`、`members/invite`、`members/revoke`、`members/permissions`
- **預約核心**：`orders`、`store/orders`、`store/items`、`items/:id`、`payments`、`payments/:id/status`、`customers/lookup-by-phone`、`holidays(/parse)`、`resource-leaves`、`tags`、`me`、`me/waiting-lists(/:id/confirm|cancel)`、`my-orders`、`my-tickets`、`claims`
- **通知**：`notification-settings(/quota|/history|/history/:id/retry)`、`notification-broadcasts`
- **LINE bot**：`line-bot?orgId=`（GET/PUT）、`line-bot/test?orgId=`、`line-bot/sessions...(/:id/pause|resume)`
- **金流商**：`payment-providers/ecpay`、`payment-providers/jkopay`（皆 GET/PUT/DELETE）
- **Google 行事曆**：`integrations/google-calendar/status|connect`、`integrations/google-calendar`（DELETE）
- **訂閱**：`subscriptions/me|upgrade|cancel|payments`
- **檔案**：`files`、`files/copy`、`files/raw`
- **AI**：`chat(/stream)`、`admin/chat(/stream)`、`ai/orders-reconcile`、`ai/parse-pricing-table`

## 6. 環境變數 vs 租戶設定（自架關鍵）

### 平台層級環境變數（每個部署一份，見 `.env.example` / `src/config/env.js`）
`VITE_API_BASE_URL`、`VITE_BASE_PATH`、`VITE_APP_MODE`、`VITE_GTM_ID`、`VITE_HOTJAR_ID`、`VITE_FB_PIXEL_ID`、`VITE_MARKETING_HOST`、`VITE_SUPPORT_LINE_URL`、`VITE_SUPPORT_EMAIL`。

> 原站硬編：GTM `GTM-N6M4M6QZ`、Hotjar `6612136`、FB Pixel `1552782888729948`、API `orbit.homo.tw/api/v1`——皆已抽成環境變數。追蹤碼在 `?skip-tracking=true`（寫 `skip_tracking=1` cookie）時停用。

### 後端機密（不進前端；由伺服器保管）
SMS 供應商、Email/SMTP、Google OAuth client、AI/LLM 金鑰、檔案儲存後端、JWT 簽章金鑰。

### 每商家（租戶）設定 — 由各用戶在後台自行輸入（見 `src/config/tenant.js`）

**所有第三方機密採「唯讀回傳」模式**：GET 只回 `hasX` 布林 + 遮罩值；前端送空字串代表「不變更」。

| 類別 | 欄位 |
|---|---|
| **LINE Messaging（客服機器人，端點 `line-bot`）** | `isEnabled`、`isFlexMenuEnabled`、`oaBasicId`、`channelSecret`、`channelAccessToken`（+ 伺服器回傳 `webhookUrl`、`hasChannelSecret/Token`、遮罩） |
| **LINE Login / LIFF（存於 org）** | `lineLiffId`、`lineLoginChannelId`（兩者皆填才生效） |
| **綠界 ECPay** | `merchantId`、`hashKey`、`hashIv`、`isEnabled` |
| **街口 JKOPay** | `storeId`、`apiKey`、`secretKey`、`isEnabled` |
| **Google 行事曆** | OAuth 連結（伺服器端流程） |
| **每商家分析** | `gaMeasurementId`、`metaPixelId`（注入該商家的顧客端頁面） |
| **商家資料** | `name, slug, contactEmail, contactPhone, description, address, addressHint, imageFileId, instagramUrl, lineUrl` |
| **預約規則** | `requireOrderApproval, isPaymentEnabled, remittanceInfo, orderExpiryMinutes, selfCancelMinutes(720), customerBookingWindowDays(60), customerBookingLeadDays(0), customerBookingFixedStartDate/EndDate, allowCustomerPickStaff, allowCustomerPickEquipment, allowLineOnlyBooking` |
| **登入** | `isSmsLoginEnabled(true)` |

> 注意：時間類（過期、取消時限）後端存**分鐘**，UI 以**小時**編輯（/60 換算）。金流同時只能啟用一種。

### LINE 欄位驗證（原站規則）
- `oaBasicId`：`/^@?[a-zA-Z0-9._-]{4,20}$/`，maxLength 64
- `channelSecret`：`/^[a-fA-F0-9]{32}$/`（32 字元 hex），password 欄位
- `channelAccessToken`：長度 ≥ 100
- 三欄需一起填或一起清空；啟用機器人前三欄必填。
- 測試連線：以已存 token 呼叫 LINE `/v2/bot/info`。

## 7. 第三方整合

- **金流**：綠界 ECPay、街口支付（二選一）；升級訂閱走自動送出的付款表單（ECPay 式）；另有手動匯款 `remittanceInfo`。平台不代收代付。
- **Google 行事曆**：把「已確認」預約同步到獨立的「Orbit 預約」行事曆（伺服器端 OAuth，每分鐘檢查）。
- **LINE**：Messaging API（bot、webhook、推播）+ LINE Login/LIFF（自動綁定身分、圖文選單 deep link `https://liff.line.me/<liffId>`）。圖文選單背景圖提供 `richmenu-warm.jpg` / `richmenu-mint.jpg` 範本。
- **SMS / Email**：OTP 登入、通知；供應商由伺服器管理。
- **AI**：AI 對帳、價目表解析、休假/公休自然語言解析、客服機器人、客製頁生成、客戶名單匯入——皆走伺服器 `chat`/`ai/*` 端點（金鑰在後端）。
- **地圖**：無金鑰的 Google Maps 搜尋深連結。

## 8. 訂閱方案 (Plans)

| 代碼 | 名稱 | 月費 (TWD) |
|---|---|---|
| `SOLO` | 個人版 | 0（免費） |
| `MULTI` | 團隊版 | 790 |
| `SYSTEM` | 專業版 | 2990 |
| `UNIVERSE` | 企業版 | 7990 |

方案功能差異、AI/簡訊/通知額度與功能鎖（402 `PLAN_FEATURE_REQUIRED` → 升級提示）詳見 `UI-COPY.md` §21。

## 9. 核心領域模型 (Domain enums)

- 預約狀態：`UNPAID 待付款 / PENDING 待確認 / CONFIRMED 已確認 / CANCELLED 已取消`
- 付款狀態：`待付款 / 已付款 / 失敗 / 已退款 / 已取消`
- 項目類型：`SERVICE 任選時段 / PACKAGE 套票 / COURSE 固定場次`
- 資源類型：`EQUIPMENT 設備/場地 / STAFF 員工`
- 候補狀態：`WAITING 候補中 / NOTIFIED 已通知 / CONVERTED 已轉為預約 / EXPIRED 已逾期 / CANCELLED 已取消 / CLOSED_BY_ORG 候補功能已關閉`
- 通知事件：`BOOKING_REMINDER, ORDER_EXPIRED, MANUAL_BROADCAST, WAITING_SLOT_AVAILABLE, BIRTHDAY, ORDER_CONFIRMED_TO_CUSTOMER, ORDER_CONFIRMED_TO_MERCHANT, ORDER_AWAITING_CONFIRM_TO_MERCHANT, LEAD_MATCHED, SPLIT_INVITE, LOGIN_CODE`
- 通知管道：`EMAIL, SMS, LINE`

## 10. 待補完清單（骨架 → 完整）

`src/pages/dashboard/` 目前 `Overview` 與 `LineIntegration` 為完整參考實作；其餘頁面以 `StubPage`（保留真標題/副標）呈現。補完時：

1. 依 `UI-COPY.md` 對應章節填入該頁所有文案（表格欄、篩選、狀態、按鈕、彈窗、驗證、Toast、通知模板）。
2. 依 §5 API 契約接上資料。
3. 沿用 §9 enums 與 `DESIGN-SYSTEM.md` 的元件類別，確保視覺一致。
