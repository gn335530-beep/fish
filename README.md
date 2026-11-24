# 一支釣

一支釣是以原生 HTML、CSS 與 JavaScript 建置的漁獲交易網站，後端為 json-server 模擬服務。前端與後端分離於 `frontend/` 與 `backend/`。

> 產品規格見 [`docs/spec/`](./docs/spec/README.md)，名詞定義見 [`GLOSSARY.md`](./GLOSSARY.md)。

## 快速開始

先安裝相依套件：

```bash
npm install
```

啟動後端（預設 `http://localhost:3001`）：

```bash
npm run backend
```

另開終端機啟動前端：

```bash
npm run web
```

開啟 <http://localhost:8080/>。`npm run web` 已關閉快取，避免改版後瀏覽器讀到舊檔；前端預設連線到同主機的 `3001` 埠，其他 API 設定請參考[後端說明](./backend/README.md)。

後端第一次啟動時會從 `backend/db.seed.json` 建立執行時資料庫 `backend/db.json`（不進版控）。要重置示範資料，刪除 `backend/db.json` 再啟動即可；也可以用 `FISHMATCH_DB` 指定其他資料庫路徑。

若使用其他靜態伺服器，請以 `frontend/` 作為網站根目錄，例如：

```bash
python -m http.server 8010 --directory frontend
```

換一個連接埠也能避開瀏覽器對舊檔案的快取。

## AI 助手（Beta）

助手預設使用規則引擎，不會呼叫外部服務。若要在本機啟用 LLM 文字回覆，請在 `backend/.env` 設定（後端啟動時會自動載入；已存在的環境變數優先）：

```bash
LLM_ENABLED=true
GEMINI_API_KEY=your-gemini-key
```

可選設定：

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `LLM_MODEL` | `gemini-3.5-flash-lite` | 使用的模型 |
| `LLM_TIMEOUT_MS` | `8000` | 一次回覆的總期限 |
| `LLM_SEARCH_TIMEOUT_MS` | `15000` | 執行 `web_search` 的回合期限 |
| `LLM_PREFILL_TOOL` | `false` | 在地天氣／海況由後端直接執行工具並預填，省一次模型決策回合 |
| `LLM_WEB_SEARCH` | `false` | 啟用網路搜尋工具 |
| `TAVILY_API_KEY` | 空 | Tavily 金鑰；啟用網路搜尋時需要 |
| `CWA_API_KEY` | 空 | 中央氣象署金鑰；缺少時天氣回「查不到即時天氣」、潮汐降級 |

行為重點：

- 每次只回答最新一句；歷史取最近 10 則，長訊息會截短。
- 行情、庫存、天氣、海況與潮汐數字只來自唯讀工具結果；天氣與海況分開回覆。
- 需要縣市的地區問題優先採用訊息中的縣市，其次為設定頁縣市；沒有縣市時會先詢問，答案只暫存 30 分鐘。
- AI 回覆預設不顯示來源卡；只有明確要求連結、出處或查證時，才顯示最多 3 個來源。
- `LLM_ENABLED=true` 時，上架草稿也改由模型驅動；失敗時切回基本模式。
- 缺少金鑰、逾時或格式錯誤時安靜回到規則引擎；配額用完或 429 時平台功能照常，規則也無法處理才顯示重試提示。交易房永遠不呼叫 LLM。

這是 **soft launch beta**，不是正式上線：不強制邀請名單、任何註冊使用者都能使用，也不承諾 SLA、稽核或資料落地。Gemini 免費層與 Tavily 免費層仍有硬限制（Tavily 每月 1,000 credits，basic search 每次 1 credit）；免費層內容可能被 Google 用於改善產品，Tavily 也會收到該次搜尋查詢，天氣與潮汐會把縣市／潮位站名稱送給中央氣象署，海況會把海域座標送給 Open-Meteo，地區問題與帶有縣市的一般新聞也會把縣市放進 Gemini prompt。若之後要公開放大，應先補 allowlist、使用額度與 UI 隱私提示。

完整設定、工具與回覆規則見[後端說明](./backend/README.md)的 AI 助手章節；設計取捨與遷移路徑見 [ADR-0011](./docs/adr/0011-hybrid-llm-assistant.md)、[ADR-0013](./docs/adr/0013-local-conditions-and-hidden-sources.md) 與 [ADR-0015](./docs/adr/0015-model-driven-listing.md)。

## 測試

```bash
npm test
```

使用 Node 內建 `node:test` 執行 `backend/test/` 與 `frontend/test/`；後端測試使用各自的暫存資料庫，不會動到開發資料。

瀏覽器視覺案例另用 Playwright；第一次執行先安裝 chromium：

```bash
npx playwright install chromium
npm run test:e2e
```

E2E 會啟動測試後端與靜態前台，使用固定行情資料，不會呼叫真實批發行情。設定與 baseline 規則見 [`e2e/README.md`](./e2e/README.md)。

## 專案結構

```text
frontend/                 前端（網站根目錄）
  index.html              入口，導向 pages/index.html
  pages/                  網站頁面
  assets/css/             共用及頁面樣式
  assets/images/          網站圖片
  assets/js/api/          API 請求、會員、商品與行情
  assets/js/app/          共用互動與狀態功能
  assets/js/pages/        各頁專屬互動
  assets/js/demo/         對話式交易引擎
  test/                   前端單元測試
backend/                  本機開發用模擬 API
  lib/                    共用邏輯（含行情、氣象與 AI 工具）
  routes/                 端點實作
  scripts/                行情 CLI
  test/                   後端整合測試（使用暫存資料庫）
  seed-assets/            種子示範圖片（進版控，掛在 /uploads 下）
  db.seed.json            可提交的種子資料
  db.json                 執行時資料（不進版控，首次啟動從種子建立）
  uploads/                使用者上傳圖片（不進版控）
e2e/                      Playwright 瀏覽器案例與固定 fixture
tools/                    本機靜態伺服器
docs/spec/                產品規格
docs/adr/                 架構決策紀錄
docs/api/                 API 規格文件
```

## 開發慣例

JavaScript 與 CSS 依職責拆分，單一檔案不超過 200 行；HTML 頁面保留為可直接提供的靜態頁面。修改功能、行為或介面時，請同步更新 `docs/spec/`、`docs/adr/`、`GLOSSARY.md` 與相關 `README.md`。
