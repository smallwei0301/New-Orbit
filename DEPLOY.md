# 部署到 Vercel

專案已經是「可直接部署」狀態：`vercel.json`、`api/[...path].js`（serverless 函式）、
以及 API 的登入驗證都已就緒並測試過。剩下的只有把檔案送上 Vercel 並設定 3 個環境變數。

## 需要設定的環境變數（3 個）

| 變數 | 值 |
|---|---|
| `SUPABASE_URL` | `https://ourhzenuvampgmdkysrn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role |
| `AUTH_SECRET` | `ai00tXzudDYqOWBsbUjgtUAbkFMihv71hOBWxlnJFd8tP03edaBtndXQVq6s-jWM` |

> 三個都**不要**加 `VITE_` 前綴——加了就會被打包進前端變成公開資訊。
> `AUTH_SECRET` 是用來簽登入 token 的；上面這組是我幫你產好的，你也可以自己重產：
> `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
> 換掉的話所有人需要重新登入，僅此而已。

## 方式 A：Vercel CLI（最快）

```bash
npm i -g vercel
cd orbit-admin
vercel login
vercel link          # 建立 / 連結專案（team：smallwei0301's projects）

# 設定環境變數（每個都選 Production 與 Preview）
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add AUTH_SECRET

vercel --prod        # 正式部署
```

## 方式 B：GitHub → Vercel（適合長期維護）

1. 在 GitHub 開一個 repo（建議 private）。
2. 本機推上去：
   ```bash
   cd orbit-admin
   git init && git add -A
   git commit -m "Orbit 預約系統：後台 + 顧客端 + Supabase"
   git remote add origin git@github.com:<你的帳號>/orbit-booking.git
   git push -u origin main
   ```
   （`.gitignore` 已排除 `.env`、`node_modules`、`dist`，金鑰不會被推上去。）
3. Vercel → Add New → Project → Import 這個 repo。
4. Framework 會自動偵測為 Vite；Build 指令與輸出目錄已由 `vercel.json` 指定。
5. 在 Settings → Environment Variables 加上表格中的 3 個變數。
6. Deploy。之後每次 push 會自動部署。

## 部署後檢查

```bash
# 1. 沒帶 token 應該被擋（預期 401）
curl -s -o /dev/null -w "%{http_code}\n" https://<你的網域>/api/v1/customers?orgId=midao

# 2. 登入應該拿到 token
curl -s -X POST https://<你的網域>/api/v1/auth/sign-in \
  -H 'content-type: application/json' \
  -d '{"email":"demo@orbit.test","password":"demo1234"}'
```

第 1 條若回 200 而不是 401，代表環境變數沒設好（函式起不來），請檢查 Vercel 的變數並重新部署。

## 架構

- 前端：Vite 靜態輸出，`vercel.json` 的 rewrite 讓所有非 `/api` 路徑回 `index.html`（SPA 路由）。
- API：`api/[...path].js` 捕捉全部 `/api/*`，轉給 `server/router.js`——與本機 `npm run api` 同一套實作。
- 前端呼叫的是相對路徑 `/api/v1`，所以本機與線上都不需要改設定。

## 上線前建議

- **示範帳號**：目前是 `demo@orbit.test` / `demo1234`，公開網址等於任何人都能登入看示範資料。要正式用請改密碼：
  ```sql
  update users set password_hash = crypt('你的新密碼', gen_salt('bf'))
  where email = 'demo@orbit.test';
  ```
- **輪替 service_role 金鑰**：這把金鑰曾出現在對話紀錄中，建議到 Supabase Dashboard 轉一次，再更新 Vercel 的環境變數。
