# WORKPLAN — 從現在到可正常營運

> 本文件是後續開發的**執行手冊**。每個工作項在 GitHub 都有對應 issue（標題相同）。
> 執行者（人或 AI）照「標準工作循環」逐一完成 issue，**不要同時做多個 issue**。

## 0. 現況快照（2026-08-13）

- ✅ 後台 14 頁全部接上 Supabase 真實資料（讀＋寫），部署於 Vercel 正常運作
- ✅ API 認證（sign-in / refresh / 401 / 403）、租戶隔離（strict resolveOrgId + 全查詢 org_id 過濾）
- ✅ smoke 測試 harness（`npm run smoke`）
- ❌ 顧客端 6 頁（`src/pages/store/`）全部仍是 mock 資料
- ❌ 商家註冊 / 忘記密碼只有 UI，後端未實作（`auth/sign-up` 會 404）
- ❌ LINE「測試連線」是假回應；webhook 不存在
- ❌ 金流（ECPay/街口）只有設定介面，沒有付款流程
- ❌ 通知只有設定介面，不會真的寄送

## 1. 鐵律（違反任何一條 = 該次改動不能 merge）

1. **安全模型不可動**：RLS 全開零 policy；只有後端 service_role 碰資料；
   機密唯讀回傳（GET 只回 `hasXxx`/遮罩，空字串=不變更）；
   `SUPABASE_SERVICE_ROLE_KEY`/`AUTH_SECRET` 絕不加 `VITE_` 前綴、絕不 commit、絕不出現在 API 回應或 log。
2. **每一條 org 範圍的查詢都必須帶 `.eq('org_id', orgId)`**，包含 `:id` 的 GET/PUT/DELETE。
   新增路由時照抄 `server/router.js` 現有 items/customers 區塊的寫法。
3. **改了 `server/` 或 `api/` 之後，必跑 `npm run smoke:local`（或部署後 `npm run smoke`）到全綠**。
   smoke 紅著就不准 push。改了前端必跑 `npm run build` 成功。
4. **UI 文案逐字對照 `docs/UI-COPY.md`**，不要自己編字。設計照 `docs/DESIGN-SYSTEM.md` 與 `orbit-*` tokens。
5. **API 契約以 `docs/SPEC.md` §5 為準**；新端點要同時登記在 `src/lib/api.js` 的 `ENDPOINTS` 與 `server/router.js`。
6. **不要動這些檔名/機制**：`api/handler.js` 與 `vercel.json` 的 `__path` rewrite（Vercel catch-all 的坑）、
   `server/seed.sql` 裡的 `smoke-b` 商家（隔離測試 fixture）。
7. 一個 issue 一個分支一個 PR；commit message 用中文、說清楚動了什麼。不確定就先開 issue 留言問，不要猜。

## 2. 標準工作循環（每個 issue 照做）

```
1. 讀 issue 全文 + issue 裡列的「相關檔案」，先讀完再動手
2. 若 issue 涉及後端：先在本地跑起來
     cp .env.example .env（填 SUPABASE_SERVICE_ROLE_KEY、AUTH_SECRET）
     npm run db:check && npm run dev:all
3. 小步修改。每完成一小塊就：
     前端動了 → npm run build 必須成功
     後端動了 → npm run smoke:local 必須全綠
4. 對照 issue 的「驗收標準」逐條打勾，缺一不可
5. push 分支 → 開 PR → merge 進 main → 等 Vercel 部署完成
6. npm run smoke（打線上）全綠 + 手動走一次 issue 指定的畫面流程
7. 在 issue 留言貼上：smoke 輸出結尾、驗收清單勾選結果，然後關閉 issue
```

**卡住的定義**：同一個錯誤試了 3 次還在 → 停下來，把「做了什麼、預期什麼、實際輸出」貼到 issue 留言，等人決定。不要亂試第 4 次。

## 3. 里程碑與 issue 清單

### M0 — 基礎建設（先做，讓後面每一步都有保險）
| # | Issue | 摘要 |
|---|---|---|
| M0-1 | [#1 CI：GitHub Actions 跑 build + smoke](https://github.com/smallwei0301/New-Orbit/issues/1) | PR 自動驗證，紅的擋 merge |

### M1 — 顧客端接真實 API（產品能被「客人」用起來）
| # | Issue | 摘要 |
|---|---|---|
| M1-1 | [#2 顧客端店面首頁與商品詳情接真實 API](https://github.com/smallwei0301/New-Orbit/issues/2) | StoreHome / ItemDetail 換掉 mock |
| M1-2 | [#3 預約流程 BookingFlow 接 API](https://github.com/smallwei0301/New-Orbit/issues/3) | 時段可用性 + 公開建立預約，核心轉換路徑 |
| M1-3 | [#4 我的預約 / 揪團 / 付款結果接 API](https://github.com/smallwei0301/New-Orbit/issues/4) | MyBookings / ClaimBooking / PaymentResult |
| M1-4 | [#5 商家註冊與密碼重設後端實作](https://github.com/smallwei0301/New-Orbit/issues/5) | auth/sign-up、forgot/reset-password |

### M2 — 第三方整合（自動化賣點成真）
| # | Issue | 摘要 |
|---|---|---|
| M2-1 | [#6 LINE 整合：真實測試連線與 webhook](https://github.com/smallwei0301/New-Orbit/issues/6) | /v2/bot/info、webhook 簽章驗證 |
| M2-2 | [#7 金流串接：ECPay 優先](https://github.com/smallwei0301/New-Orbit/issues/7) | 付款建立、回調、payment_status 流轉 |
| M2-3 | [#8 通知系統：排程提醒與 quota](https://github.com/smallwei0301/New-Orbit/issues/8) | Email 先行、模板變數、扣抵 |

### M3 — 營運強化（上線前最後一哩）
| # | Issue | 摘要 |
|---|---|---|
| M3-1 | [#9 安全與營運強化清單](https://github.com/smallwei0301/New-Orbit/issues/9) | rate limit、輸入驗證、錯誤處理、監控 |

**需要人工（帳號擁有者）配合的前置**，AI 無法代做，可提前準備：
- GitHub repo Settings → Actions secrets：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`AUTH_SECRET`（M0-1）
- Vercel env：`PUBLIC_API_URL`（M2-1）、`RESEND_API_KEY`、`MAIL_FROM`、`CRON_SECRET`（M2-3）
- 測試用 LINE Official Account 的 channel secret/token（M2-1）；ECPay 用官方公開測試商店即可（M2-2）

**順序**：M0-1 → M1（1→2→3→4）→ M2（可並行，但一次仍只做一個）→ M3。
M1-2 是全專案最難的一張，做之前必須先完成 M1-1 熟悉資料層。

## 4. 「可正常營運」驗收定義（全部打勾才算完成）

- [ ] 客人可以從 `/:orgSlug` 瀏覽項目 → 選時段 → 填資料 → 送出預約，資料真的進 `orders` 表
- [ ] 商家在後台看到新預約、確認後客人收到通知（至少 Email）
- [ ] 新商家可以自助註冊 → 建立商家 → 登入後台設定項目
- [ ] LINE 測試連線打的是真的 LINE API；webhook 能收訊息
- [ ] 啟用金流的商家：客人可完成線上付款，`payment_status` 正確流轉
- [ ] `npm run smoke` 對線上全綠；CI 在每個 PR 上跑
- [ ] 兩個以上真實商家並存，互相完全看不到對方資料（smoke 跨租戶段落全綠）

## 5. 已知技術債（做相關 issue 時順手處理，不另開票）

- `resource-leaves` POST 未驗證 `resourceId` 屬於本商家（寫入自家範圍、影響小）→ M3-1
- `dashboard/overview` 的「今日/本月」其實是全部資料的統計，沒有按日期切 → M1 之後任一張順手修
- `orders` 的 `search`/篩選在 API 端做記憶體過濾，資料量大會慢 → M3-1
- `auth/forgot-password` 現在回假 `{sent:true}` → M1-4 一併真做
- 前端 `me` slice 尚未在 app 啟動時打 `GET me` 同步（依賴 JWT 解碼）→ M1-4 順手檢查
