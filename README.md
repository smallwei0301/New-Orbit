# Orbit 後台 — 重建骨架 (Reconstruction Skeleton)

一份乾淨、可維護的 **Orbit 預約系統後台**原始碼骨架，附完整設計系統與規格文件。目標：依此專案即可打造出與線上後台 100% 一致的多租戶預約後台，並可先於本地部署。

> 前端逆向自 `orbit.homo.tw` 的 bundle（設計 token、頁面結構、全部文案皆 1:1 擷取）；後端依 `docs/SPEC.md` 的契約自行實作，資料存於 Supabase。

## 技術棧

- **Vite + React 18**、React Router v6、Redux Toolkit、Tailwind CSS（自訂 `orbit-*` 色系）、Axios。

## 快速開始

```bash
cp .env.example .env
# 到 Supabase Dashboard → Project Settings → API，複製 service_role 金鑰，
# 貼進 .env 的 SUPABASE_SERVICE_ROLE_KEY=
npm install
npm run db:check          # 確認資料庫連得上、示範資料在
npm run dev:all           # 同時啟動 API (8080) 與前端 (5173)
```

開 `http://localhost:5173` → 用 **demo@orbit.test / demo1234** 登入（登入頁已預填）。

也可以分開跑：`npm run api` / `npm run dev`。前端的 `/api` 由 Vite dev proxy 轉到 8080。

`midao` 是 **vendor slug**；網址 `/midao/dashboard` 是後台、`/midao` 是顧客店面。

## 測試（smoke harness）

沒有單元測試，但有一套端對端契約測試 `scripts/smoke.mjs`：驗認證（401/403/404）、
**租戶隔離**、機密遮罩、寫入往返。任何失敗都會 exit 1。

```bash
npm run smoke         # 打線上 (new-orbit.vercel.app)
npm run smoke:local   # 打本地（需先 npm run api）
```

> **改過 `server/` 或 `api/` 就要跑到全綠才算完成**；推上 `main` 後等 Vercel 部署完，
> 再對線上跑一次。跨租戶那幾條測試需要 `server/seed.sql` 建立的第二商家 `smoke-b`
> （不存在時會標記 SKIP 而非失敗）。

開發流程、每張工作票的驗收標準見 **`docs/WORKPLAN.md`**；給 AI 助手的專案導覽見 `CLAUDE.md`。

## 後端與資料庫

`server/` 是一個輕量 Node API（零框架），資料存在 **Supabase (Postgres)**。

- `server/index.js` — HTTP 包裝，自己讀 `.env`（無需 dotenv）
- `server/router.js` — 路由，實作 `docs/SPEC.md §5` 契約
- `server/supabase.js` — service_role 連線 + `resolveOrgId()`（吃 uuid 或 slug）
- `server/mappers.js` — DB snake_case ↔ API camelCase
- `server/seed.sql` — 示範資料，可隨時重灌
- `server/DATABASE.md` — **資料表、安全模型、migration 說明（重要）**

資料庫已建好並灌入示範資料，專案 `orbit-booking`（東京區、免費方案）。

### 安全模型（重點）

全部資料表都 **啟用 RLS 且不建任何 policy** → 公開的 anon 金鑰讀不到任何一列；只有後端持 `service_role` 金鑰能存取。密碼以 bcrypt 存放、由資料庫內的 `verify_login()` 驗證。租戶機密（LINE token、金流金鑰）**只寫不讀**：API 只回 `hasChannelSecret` 與 `••••••••` 遮罩。

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 是完全權限金鑰。只放後端 `.env`、**不要**加 `VITE_` 前綴、不要 commit。

## 接自己的後端

若要換掉這個 Supabase 專案：改 `.env` 的 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`，在新專案跑一次 migration（見 `server/DATABASE.md`）與 `server/seed.sql` 即可。
若要換成完全不同的後端：依 `docs/SPEC.md §5` 實作端點，把 `.env` 的 `VITE_API_BASE_URL` 指過去——頁面只透過 `src/lib/services.js` 取資料，不需要改。

### 資料層寫法（補其餘頁面時照抄）

```jsx
import { itemService } from '../../lib/services.js'
import { useApi, useMutation, errorMessage } from '../../lib/useApi.js'

const { data, loading, reload } = useApi(
  () => itemService.list({ orgId: orgSlug, search }), [search], { fallback: [] }
)
const { run: save, saving } = useMutation(payload => itemService.update(id, payload))
```

`useApi` 的 `fallback` 會在後端沒開時讓畫面仍可呈現，方便純做版面調整。

## 專案結構

```
src/
  config/
    env.js        平台環境變數（API base、追蹤碼、base path）
    tenant.js     ★ 每商家可自訂設定的 schema（LINE / 金流 / 預約規則 / 通知）
  lib/
    api.js        Axios 實例 + 401 refresh + ENDPOINTS 端點契約
    auth.js       cookie token 存取 + JWT 解碼
  store/          Redux 六 slice（constants/me/org/modals/planBanner/ui）
  layout/
    nav.js            側欄 14 項導覽 + 頁尾（標籤/路徑/圖示 1:1）
    DashboardLayout   側欄 + 手機抽屜 + 收合 + Outlet
    AuthLayout        認證頁置中卡片
  components/ui/  Button / Card / Field / Input / Toggle / Badge / PageHeader
  i18n/strings.js 常用文案 + 各頁標題副標
  lib/services.js 各領域 API 服務
  lib/useApi.js   useApi / useMutation / errorMessage
  pages/
    auth/         SignIn（完整）/ SignUp / ForgotPassword
    dashboard/    14 個後台頁 + 編輯/詳情子頁
    store/        顧客端 6 頁（店面、商品、預約流程、我的預約、揪團、付款結果）
  styles/index.css  設計系統 CSS 變數 + 元件類別（.orbit-card / .orbit-grid-table ...）
server/           Node API + Supabase（見 server/DATABASE.md）
docs/
  DESIGN-SYSTEM.md  色彩/字體/圓角/陰影/動畫/元件 tokens（可直接照做）
  SPEC.md           架構、路由樹、狀態、認證、API 契約、環境變數 vs 租戶設定、整合
  UI-COPY.md        全站逐字文案目錄（每頁每彈窗每 Toast）
```

## 多租戶 / 客製化設計（重點）

平台層級用環境變數（`.env`）；**每個商家自行輸入**的機密（LINE Channel Access Token、Channel Secret、綠界/街口金鑰、GA/Pixel 等）走後台表單並存於後端，採「唯讀回傳」模式（GET 只回 `hasX` 與遮罩，前端送空字串＝不變更）。schema 見 `src/config/tenant.js`，實際頁面參考 `src/pages/dashboard/LineIntegration.jsx`。

## 完成度

- ✅ 設計系統、路由樹、版面、狀態、認證、API 契約、租戶設定 schema、全部文案目錄。
- ✅ **全部 14 個後台頁面 + 子頁（項目/資源編輯、預約/客戶詳情、候補名單）皆已完整實作**：含真實欄位、篩選、資料表、狀態徽章、操作按鈕、彈窗（含代客建立預約 wizard、快速對帳、匯入客戶、通知模板等），以 mock 資料驅動、可互動。文案 100% 逐字對齊。
- ✅ 已通過 `npm run build`、全頁 SSR 煙霧測試（27/27 無錯）、逐頁截圖驗證視覺，並對真實 Supabase 做過讀寫端對端測試（含在瀏覽器建立資料後回查 Postgres 確認）。
- ✅ **真實資料庫 + API + 資料層**：Supabase(Postgres) + `server/`、`src/lib/services.js`、`src/lib/useApi.js`。**全部後台頁面都已接上真實資料庫**（讀 + 寫）：登入、營運概覽、行事曆、項目、資源、預約、候補、客戶、標籤、通知設定、商家設定、金流設定、LINE 整合、訂閱方案。
- ✅ **顧客端店面頁全部完成**（`src/pages/store/` + `StoreLayout`）：店面首頁/探索項目、商品詳情、預約流程 wizard（指定人員→選時段→填資料→確認→已提交）、我的預約/候補、揪團加入、付款結果。

> 各頁皆為單一自足 `.jsx`，mock 資料在檔案頂部的 `useState`，接後端時只需替換資料來源，UI 無需重寫。

## 顧客端路由（`StoreLayout`）

`/:orgSlug`（店面首頁）· `/:orgSlug/items/:itemId`（商品詳情）· `/:orgSlug/calendar`（預約流程）· `/:orgSlug/orders`（我的預約/候補）· `/:orgSlug/claim/:token`（揪團加入）· `/:orgSlug/payment-result`（付款結果）。
