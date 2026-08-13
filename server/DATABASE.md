# 資料庫（Supabase / Postgres）

## 目前的專案

| 項目 | 值 |
|---|---|
| 專案名稱 | `orbit-booking` |
| Project ref | `ourhzenuvampgmdkysrn` |
| 區域 | `ap-northeast-1`（東京） |
| API URL | `https://ourhzenuvampgmdkysrn.supabase.co` |
| 方案 | Free（$0/月） |

已套用的 migration（版本化保存在 Supabase）：

| 版本 | 名稱 | 內容 |
|---|---|---|
| `20260812114926` | `orbit_core_schema` | 17 張表、索引、全表啟用 RLS |
| `20260812115156` | `verify_login_function` | `verify_login()` 登入驗證函式 |
| `20260812130xxx` | `calendar_holidays_and_leaves` | `holidays`、`resource_leaves` 兩張表 |

要把 schema 拉到本機版控：

```bash
npx supabase link --project-ref ourhzenuvampgmdkysrn
npx supabase db pull          # 產生 supabase/migrations/*.sql
```

## 資料表

**租戶與身分**：`orgs`（商家/租戶，`slug` 唯一）、`users`、`staff`（使用者 ↔ 商家，含角色）

**目錄**：`items`（項目，mode = SERVICE/PACKAGE/COURSE）、`resources`（設備或員工）、`item_resources`

**客戶**：`customers`、`tags`、`customer_tags`

**行事曆**：`holidays`（店家公休）、`resource_leaves`（人員休假）——`start_time` 為 null 代表整天

**預約**：`orders`（status = UNPAID/PENDING/CONFIRMED/CANCELLED；payment_status = UNPAID/PAID/FAILED/REFUNDED/CANCELLED）、`waitlist`

**整合（機密）**：`line_bot_configs`（channel_secret / channel_access_token）、`payment_providers`（ecpay 的 hash_key/hash_iv、jkopay 的 api_key/secret_key）

**通知與帳務**：`notification_settings`、`notification_quota`、`subscriptions`、`subscription_payments`

所有業務資料表都以 `org_id` 分租戶，並有 `on delete cascade`。

## 安全模型

1. **全表啟用 RLS，且不建立任何 policy** → anon／publishable 金鑰讀不到任何一列。
2. **只有後端用 service_role 金鑰**（繞過 RLS）存取。這把金鑰只放在 `.env`，不能加 `VITE_` 前綴，也不要 commit。
3. **密碼**用 `pgcrypto` 的 bcrypt 雜湊儲存；驗證透過 `verify_login()`（SECURITY DEFINER、鎖定 search_path、只授權給 service_role），雜湊值不會離開資料庫。
4. **租戶機密唯讀回傳**：API 讀取時只回 `hasChannelSecret` / `••••••••` 遮罩，永不回傳原始值；寫入時送空字串代表「不變更」。

> Supabase 安全檢查會列出 `rls_enabled_no_policy`（INFO 等級）——這正是上述第 1 點刻意的設計，不是漏洞。

## 重設 / 重新灌入示範資料

`server/seed.sql` 內含示範商家（midao）與全部示範資料。在 Supabase SQL Editor 執行即可。
示範帳號：`demo@orbit.test` / `demo1234`。

### ⚠️ `smoke-b` 商家不可刪除

`seed.sql` 尾端另外建立第二個商家 **`smoke-b`**（帳號 `smoke-b@orbit.test` / `smoketest`），
它不是示範資料，而是 `scripts/smoke.mjs` 的**租戶隔離測試 fixture**：測試會用 B 商家的 token
去讀寫 A 商家（midao）的資料，驗證一律被擋（403/404）。

因為後端一律用 service_role 繞過 RLS，**租戶隔離完全靠 `server/router.js` 自己把關**
（每一條 org 範圍查詢都要 `.eq('org_id', orgId)`，包含 `:id` 的 GET/PUT/DELETE）。
沒有這個第二商家，就沒有任何東西能證明隔離仍然有效——所以請保留它。
