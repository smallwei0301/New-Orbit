# Orbit 設計系統 (Design System)

> 本文件的所有數值皆從 Orbit 生產環境前端 bundle（編譯後的 Tailwind CSS）以 1:1 逆向取得，並已落實在 `tailwind.config.js` 與 `src/styles/index.css`。目標：任何人依此文件即可重建出與線上後台完全一致的視覺。

Orbit 的視覺語言是「溫暖大地色系（warm earth-tone）」——以奶茶棕為主色、米白為底、極大圓角卡片、帶主色暈染的淡陰影。整體給人柔和、療癒、專業的感覺，符合其目標客群（瑜伽、美業、身心靈、health & wellness）。

---

## 1. 色彩 Tokens (Color)

自訂 Tailwind 色票前綴為 `orbit-`。使用方式如 `bg-orbit-primary`、`text-orbit-900`、`border-orbit-border`。

### 品牌 / 介面色

| Token | Hex | RGB | 用途 |
|---|---|---|---|
| `orbit-primary` | `#a08060` | 160 128 96 | 主色、主要按鈕、連結、聚焦環 |
| `orbit-primary-hover` | `#8b6e50` | — | 主色滑過（hover）狀態 |
| `orbit-primary-light` | `#d4c4b0` | 212 196 176 | 主色的淺色變體 |
| `orbit-bg` / `orbit-muted` | `#faf7f2` | 250 247 242 | 頁面底色、次要底色 |
| `orbit-warm` | `#f5f0e8` | 245 240 232 | 卡片強調、側欄 active 項目背景 |
| `orbit-card` | `#ffffff` | 255 255 255 | 卡片底色 |
| `orbit-border` | `#ede8e0` | 237 232 224 | 邊框、分隔線 |

### 文字色階（暖灰）

| Token | Hex | 對應語意 |
|---|---|---|
| `orbit-300` | `#b8a99a` | 最淺文字（placeholder、極次要） |
| `orbit-400` | `#9c8e7c` | 次要文字（subtitle、hint） |
| `orbit-500` | `#7a6e5e` | 一般文字（body） |
| `orbit-700` | `#5c4f3d` | 深文字（重點內文） |
| `orbit-900` | `#3d3528` | 標題文字（headings） |

### 語意色（Semantic）

| Token | Hex | 用途 |
|---|---|---|
| `orbit-success` | `#6b8f71` | 成功綠（已確認、成功狀態） |
| `orbit-success-bg` | `#e8f0e8` | 成功底色 |
| `orbit-danger` | `#c45d4e` | 警示紅（刪除、失敗、黑名單） |
| `orbit-info-bg` | `#fff8f0` | 資訊提示底色 |
| `orbit-info-border` | `#f0e0cc` | 資訊提示邊框 |

> 客製預約頁的配色器對外開放以下 13 個色槽（顧客端頁面可自訂）：`主色 / 按鈕`、`主色（滑過）`、`頁面底色`、`次要底色`、`卡片底色`、`邊框`、`標題文字`、`深文字`、`一般文字`、`次要文字`、`最淺文字`、`成功綠`、`警示紅`——正好對應上表。

---

## 2. 字體 Tokens (Typography)

透過 Google Fonts 載入（見 `index.html`）：`Noto Sans TC`、`Noto Serif TC`、`Outfit`、`Zen Kaku Gothic New`、`Zen Maru Gothic`。

| Family | 字體堆疊 | 用途 |
|---|---|---|
| `font-sans`（預設） | `"Noto Sans TC", "Zen Maru Gothic", system-ui, sans-serif` | 全站內文 |
| `font-serif` | `"Noto Serif TC", ui-serif, Georgia, serif` | 標題（headings） |
| `font-logo` | `Outfit, "Zen Kaku Gothic New", sans-serif` | 「Orbit」logo 字樣 |

Base：`font-size: 16px; line-height: 1.5;`，啟用 `-webkit-font-smoothing: antialiased`。

### 字級 Scale（沿用 Tailwind 預設，未覆寫）

| Class | font-size | line-height |
|---|---|---|
| `text-xs` | 0.75rem (12px) | 1rem |
| `text-sm` | 0.875rem (14px) | 1.25rem |
| `text-base` | 1rem (16px) | 1.5rem |
| `text-lg` | 1.125rem (18px) | 1.75rem |
| `text-xl` | 1.25rem (20px) | 1.75rem |
| `text-2xl` | 1.5rem (24px) | 2rem |
| `text-3xl` | 1.875rem (30px) | 2.25rem |
| `text-4xl` | 2.25rem (36px) | 2.5rem |

---

## 3. 圓角 Tokens (Border Radius) — 已覆寫

Orbit **覆寫了 Tailwind 預設**的圓角，卡片與表格特別圓，是識別度的關鍵。

| Class | 值 | 備註 |
|---|---|---|
| `rounded`（預設） | 0.25rem | |
| `rounded-md` | 0.375rem | |
| `rounded-lg` | **20px** | 覆寫（原 0.5rem） |
| `rounded-xl` | **24px** | 覆寫（原 0.75rem）——卡片、資料表主要圓角 |
| `rounded-2xl` | **35px** | 覆寫（原 1rem） |
| `rounded-3xl` | 1.5rem | |
| `rounded-full` | 9999px | 按鈕、標籤（pill） |

> 按鈕採 `rounded-full`（膠囊狀），卡片採 `rounded-xl`（24px），手機抽屜側欄用 `rounded-r-[40px]`。

---

## 4. 陰影 Tokens (Shadow) — 主色暈染

Orbit 的陰影不是中性黑，而是以主色 `#a08060` 加透明度暈染，讓浮起的元素也維持暖調。

| Token（本專案命名） | 值 | 用途 |
|---|---|---|
| `shadow-orbit-card` / `shadow-orbit-sm` | `0 1px 3px #a0806014` | 卡片、資料表預設陰影 |
| `shadow-orbit-hover` | `0 8px 24px #a080601f` | 卡片 hover 浮起 |
| `shadow-orbit-nav` | `2px 0 8px rgba(160,128,96,0.12)` | 側欄右緣陰影 |

（Tailwind 標準 `shadow-sm/shadow/shadow-lg/...` 仍以中性黑保留，供一般元件使用。）

---

## 5. 動畫 Tokens (Animation)

| 名稱 | Keyframes | 用途 |
|---|---|---|
| `orbit-dropdown-in` | `opacity 0→1, translateY(-4px)→0`，0.15s ease-out | 下拉、彈窗進場 |
| `breathe` | `opacity 1→0.4→1, scale 1→0.85→1` | logo 呼吸點 |
| `heroCircleBreathe` | `translate(-50%,-50%) scale(0.95→1.15)` | 行銷頁 hero 圓形律動 |
| `bounce` / `pulse` / `spin` | Tailwind 標準 | 載入、提示 |

轉場時長常用：`duration-100`（表格列 hover）、`duration-150`（下拉）、`duration-200`（卡片）、`duration-300`。

---

## 6. 間距與版面

- 內容區最大寬度約 `max-w-6xl`，左右 padding `px-5 lg:px-8`，底部 `pb-20`。
- 側欄：展開 `w-56`（224px）、收合 `w-14`（56px），狀態存於 `localStorage["dashboard-menu-collapsed"]`。
- 卡片內距常用 `p-6`；表單欄位間距 `space-y-4`；區塊間距 `gap-4`/`gap-6`。
- 常見資料表格線用 subgrid（見下方元件）。

---

## 7. 核心元件類別 (Component Classes)

以下自訂 class 定義於 `src/styles/index.css`（原站以 CSS 直接定義）。

### 卡片
```
.orbit-card            背景白、1px orbit-border、圓角 24px、shadow 0 1px 3px #a0806014
.orbit-card-hover      hover 時 shadow 0 8px 24px #a080601f
.orbit-card-contents       上邊 border 分隔、margin-top .25rem
.orbit-card-contents-title 12px、色 orbit-400
```

### 按鈕（膠囊）
```
.orbit-btn             inline-flex、圓角 full、padding .5rem 1rem、active:scale(0.97)
.orbit-btn-primary     bg orbit-primary、白字、hover bg orbit-primary-hover
.orbit-btn-ghost       透明底、色 orbit-500、hover bg orbit-warm
```

### 資料表（subgrid grid table）
```
.orbit-grid-table          overflow hidden、圓角 24px、1px border、白底、shadow orbit-card
.orbit-grid-table-head     grid 跨欄、subgrid、下 border、底 #faf7f280
.orbit-grid-table-th       padding .75rem 1.25rem、12px、500、uppercase、letter-spacing .05em、色 #9c8e7c
.orbit-grid-table-row      grid 跨欄、subgrid、items-center、下 border #ede8e080、hover 變色、transition .1s
.orbit-grid-table-td       padding .875rem 1.25rem、14px
```

典型欄寬（來自生產環境 grid-template-columns，供資料表參考）：
- 預約管理：`minmax(180px,1.5fr) minmax(140px,1.2fr) 120px 110px minmax(110px,auto) 160px 110px minmax(120px,1fr) 140px`
- 項目管理：`40px minmax(220px,1fr) 100px 130px 140px 140px 280px`

---

## 8. 圖示 (Icons)

原站使用 **Tabler Icons**（`@tabler/icons-react`）。側欄各項對應的圖示名稱記錄於 `src/layout/nav.js`：`calendar, list, stack-2, file-text, clock, users, target-arrow, tag, bell, settings, template, credit-card, brand-line, sparkles`；頁尾為 `home, brand-line, logout`。骨架中以佔位方塊呈現，導入 `@tabler/icons-react` 後即可換上真圖示。
