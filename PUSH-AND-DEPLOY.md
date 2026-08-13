# 推上 GitHub 並部署到 Vercel

專案已經是一個 **git repo 且含一筆乾淨的初始 commit**（`.env` 已被 `.gitignore` 排除，
歷史中不含任何金鑰）。你只要接上 remote 推上去即可。

## 1. 推到你的 repo

在專案資料夾（`orbit-admin/`）執行：

```bash
git remote add origin https://github.com/smallwei0301/<你的repo名稱>.git
git push -u origin main
```

repo 名稱請用 GitHub 上實際顯示的（名稱不能有空格，「new Orbit」在 GitHub 上
可能是 `new-Orbit`）。在 repo 頁面點綠色 **Code** 按鈕就能複製正確網址。

若 repo 建立時有勾 README，第一次推會被擋，改用：

```bash
git pull --rebase origin main
git push -u origin main
```

## 2. 匯入 Vercel

1. Vercel → **Add New → Project** → Import 剛剛那個 repo。
2. Framework 會自動偵測 Vite；build 指令與輸出目錄已由 `vercel.json` 指定，不用改。
3. 先不要按 Deploy，先到 **Environment Variables** 加下面 3 個（Production 與 Preview 都勾）：

| 變數 | 值 |
|---|---|
| `SUPABASE_URL` | `https://ourhzenuvampgmdkysrn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role |
| `AUTH_SECRET` | `ai00tXzudDYqOWBsbUjgtUAbkFMihv71hOBWxlnJFd8tP03edaBtndXQVq6s-jWM` |

> 三個都**不要**加 `VITE_` 前綴——加了會被打包進前端變成公開資訊。

4. Deploy。

## 3. 部署後驗收

```bash
# (a) 沒帶 token 應該被擋 → 預期 401
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://<你的網域>/api/v1/customers?orgId=midao"

# (b) 登入應該拿到 token → 預期 200 且回傳 token
curl -s -X POST "https://<你的網域>/api/v1/auth/sign-in" \
  -H 'content-type: application/json' \
  -d '{"email":"demo@orbit.test","password":"demo1234"}'
```

- (a) 若回 **200** 而不是 401 → 環境變數沒設好，函式沒起來，請檢查後重新 Deploy。
- (b) 若回 500 → 同上，多半是 `SUPABASE_SERVICE_ROLE_KEY` 沒貼對。

網址：`https://<你的網域>/midao/dashboard` 是後台，`/midao` 是顧客店面。
登入 `demo@orbit.test` / `demo1234`。

## 4. 之後的更新

repo 接上 Vercel 後，每次 `git push` 都會自動重新部署。

## 上線後建議

- 這個示範帳號密碼是公開已知的，正式使用前請改：
  ```sql
  update users set password_hash = crypt('你的新密碼', gen_salt('bf'))
  where email = 'demo@orbit.test';
  ```
- `service_role` 金鑰曾出現在對話中，建議到 Supabase 轉一次，並同步更新 Vercel 的環境變數。
