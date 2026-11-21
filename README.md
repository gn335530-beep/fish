# 一支釣

一支釣是以原生 HTML、CSS 與 JavaScript 建置的漁獲交易網站，後端為 json-server 模擬服務。前端與後端分離於 `frontend/` 與 `backend/`。

> 產品規格見 [`docs/spec/`](./docs/spec/README.md)，名詞定義見 [`GLOSSARY.md`](./GLOSSARY.md)。

## 開發啟動

先安裝相依套件，啟動後端與前端：

```bash
npm install
npm run backend
```

另開終端機啟動前端（已關閉快取，避免改版後瀏覽器讀到舊檔）：

```bash
npm run web
```

開啟 <  />。前端預設連線到同主機的 `3001` 埠；其他 API 設定請參考 [後端說明](./backend/README.md)。

> 後端第一次啟動時會從 `backend/db.seed.json` 建立執行時資料庫 `backend/db.json`（不進版控）。
> 要重置示範資料，刪除 `backend/db.json` 再啟動即可；也可以用 `FISHMATCH_DB` 指定其他資料庫路徑。

### AI 助手（Beta）

助手房預設使用規則引擎，不會呼叫外部服務。若要在本機啟用 LLM 文字回覆，請在 `backend/.env` 設定（後端啟動時會自動載入；已存在的環境變數優先）：

```bash
LLM_ENABLED=true
GEMINI_API_KEY=your-gemini-key
```

可選 `LLM_MODEL`（預設 `gemini-3.5-flash-lite`）、`LLM_TIMEOUT_MS`（一次回覆的總期限，預設 8000）、`LLM_SEARCH_TIMEOUT_MS`（執行 `web_search` 的回合總期限，預設 15000）與 `CWA_API_KEY`（中央氣象署潮汐開放資料；缺少時只降級潮汐，金鑰可到 [氣象資料開放平臺](https://opendata.cwa.gov.tw/) 註冊取得）。歷史固定取最近 10 則，每輪最多 2 次工具呼叫，沒有環境變數可調。缺少金鑰、模型失敗或格式錯誤時，助手會安靜回到規則引擎；交易房永遠不呼叫 LLM。助手可使用唯讀的官方行情、平台公開商品、台灣在地天氣／海況（Open-Meteo）、潮汐（CWA）與網路搜尋工具，價格、庫存、天氣、海況與潮汐數字只來自工具結果；行情、氣象與潮汐上游也受同一個回覆期限約束。需要縣市的地區問題（天氣、海況、潮汐、釣魚建議、在地新聞等）預設使用設定頁縣市，訊息中的明確縣市優先；沒有縣市時助手會先問，回答只暫存在該對話 30 分鐘，刪除對話時清除，不寫回個人設定。一般新聞與單獨的「最新」不需要縣市，有縣市時仍帶入；平台問題永遠優先，不會被縣市反問打斷；非地區問題若模型誤用在地工具會安全 fallback。天氣只回天氣，海況回浪況、海域天氣與潮汐；問適合釣魚時才使用完整海況包並給一般建議，資料不足時不做判斷。國外地點天氣走 Tavily，不用台灣海況或潮汐資料；網路停用、逾時、上游錯誤或查無結果時都明確說查不到。AI 文字保留換行。網路搜尋預設關閉；要啟用請另設 `LLM_WEB_SEARCH=true` 與 `TAVILY_API_KEY`。所有 AI 回覆預設不顯示來源卡，回覆文字中的 URL 會移除；只有明確要求連結、網址、來源、出處、哪裡看或查證時，才重查工具並顯示最多 3 個來源。`WEB` 仍會標記為網路回答，平台行情卡與商品卡來源標示不變。配額用完或 429 時，平台功能仍照常；只有規則也無法處理的問題會顯示提示與重試，重試不會重複寫入訊息，較新的訊息也不會進入重試的歷史。

這是 **soft launch beta**，不是正式上線：不強制邀請名單、任何註冊使用者都能使用，也不承諾 SLA、稽核或資料落地。Gemini 免費層與 Tavily 免費層仍有硬限制（Tavily 每月 1,000 credits，basic search 每次 1 credit）；免費層內容可能被 Google 用於改善產品，Tavily 也會收到該次搜尋查詢，地區天氣與海況會把縣市或海域座標送給 Open-Meteo，潮汐會把代表潮位站名稱送給中央氣象署；地區問題與帶有縣市的一般新聞也會把縣市放進 Gemini prompt。若之後要公開放大，應先補 allowlist、使用額度與 UI 隱私提示。設計取捨與遷移路徑見 [ADR-0011](./docs/adr/0011-hybrid-llm-assistant.md) 與 [ADR-0013](./docs/adr/0013-local-conditions-and-hidden-sources.md)。

> 若使用其他靜態伺服器，請以 `frontend/` 作為網站根目錄，例如：
> `python -m http.server 8010 --directory frontend`。
> 換一個連接埠也能避開瀏覽器對舊檔案的快取。

## 測試

```bash
npm test
```

使用 Node 內建 `node:test`；後端測試使用各自的暫存資料庫，不會動到開發資料。

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
backend/                  本機開發用模擬 API
  lib/                    共用邏輯
  routes/                 端點實作
  seed-assets/            種子示範圖片（進版控，掛在 /uploads 下）
  uploads/                使用者上傳圖片（不進版控）
  db.seed.json           可提交的種子資料
  db.json                執行時資料（不進版控，首次啟動從種子建立）
e2e/                      Playwright 瀏覽器案例與固定 fixture
docs/api/                 API 規格文件
```

JavaScript 與 CSS 依職責拆分，單一檔案不超過 200 行；HTML 頁面保留為可直接提供的靜態頁面。
