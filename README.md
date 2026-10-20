# 海人直送

海人直送是以原生 HTML、CSS 與 JavaScript 建置的靜態網站。從專案根目錄提供靜態檔案時，`index.html` 會導向 `pages/index.html`。

## 開發啟動

先啟動模擬 API：

```bash
npm install
npm run mock-api
```

另開終端機，在專案根目錄啟動靜態網站：

```bash
python3 -m http.server 8000
```

開啟 <http://localhost:8000/>。前端預設連線到同主機的 `3001` 埠；其他 API 設定請參考 [Mock API 說明](./mock-api/README.md)。

## 專案結構

```text
pages/             網站頁面
assets/css/        共用及頁面樣式
assets/images/     網站圖片
assets/js/app/     共用互動與狀態功能
assets/js/api/     API 請求、會員、漁獲與資料轉換
assets/js/pages/   各頁專屬互動
mock-api/          本機開發用模擬 API
docs/api/          API 規格文件
```

JavaScript 與 CSS 依職責拆分，單一檔案不超過 200 行；HTML 頁面保留為可直接提供的靜態頁面。
