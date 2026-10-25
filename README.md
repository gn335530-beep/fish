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

> 若使用其他靜態伺服器，請以 `frontend/` 作為網站根目錄，例如：
> `python -m http.server 8010 --directory frontend`。
> 換一個連接埠也能避開瀏覽器對舊檔案的快取。

## 測試

```bash
npm test
```

使用 Node 內建 `node:test`；後端測試使用暫存 `db.json`，不會動到開發資料。

## 專案結構

```text
frontend/                 前端（網站根目錄）
  index.html              入口，導向 pages/index.html
  pages/                  網站頁面
  assets/css/             共用及頁面樣式
  assets/images/          網站圖片
  assets/js/api/          API 請求、會員、商品與魚種
  assets/js/app/          共用互動與狀態功能
  assets/js/pages/        各頁專屬互動
  assets/js/demo/         對話式交易引擎
backend/                  本機開發用模擬 API
  lib/                    共用邏輯
  routes/                 端點實作
  uploads/                上傳圖片（不進版控）
  db.json                 模擬資料
docs/api/                 API 規格文件
```

JavaScript 與 CSS 依職責拆分，單一檔案不超過 200 行；HTML 頁面保留為可直接提供的靜態頁面。
