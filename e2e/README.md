# E2E 視覺 seam

Playwright 只驗證使用者在真實瀏覽器看到的外在行為。`npm test` 仍只跑 Node 測試，不需要瀏覽器；瀏覽器案例一律用 `npm run test:e2e`。

## 啟動方式

```bash
npx playwright install chromium
npm run test:e2e
```

設定會同時啟動：

- 測試後端：`http://127.0.0.1:3101`，每次從 `backend/db.seed.json` 重建 `e2e/.data/db.json`。
- 靜態前台：`http://127.0.0.1:8090`，以 `frontend/` 為根目錄。

測試會在瀏覽器層把 `config.js` 的 API base 改寫為 `3101`，因此不會碰觸開發中的 `3001` 後端。

## 固定條件

- 只跑 chromium；桌面 `1280×800`、手機 `390×844`。
- `deviceScaleFactor: 1`、`zh-TW`、`Asia/Taipei`。
- 截圖前停用動畫並等待 `document.fonts.ready`。
- 行情 API 由 `e2e/fixtures/market.js` 的固定資料在瀏覽器層攔截；不得呼叫真實批發行情上游。

## Baseline 規則

- Baseline 以**改動前**的畫面為準。若先改程式，必須回到改動前的 commit 重新截圖，不可把回歸畫成新基準。
- 只有穩定狀態才用截圖（例如面板開啟、單張商品卡）；動態列表、輪詢或載入中狀態改用文字、bounding box 與 computed style 斷言。
- 幾何與 computed style 已能表達的規則（例如照片框 `3:2`、面板寬高）優先使用斷言，截圖只補足整體外觀。
- 若字型或平台造成 baseline 不穩，先縮小截圖範圍或改用幾何斷言，不要放寬 diff threshold 到失去意義。

## 檔案

```text
e2e/
  config.js                測試前後端位址與資料庫路徑
  fixtures/market.js       行情卡與魚種字典固定資料
  helpers/auth.js          seed 買家／釣客登入
  helpers/layout.js        水平溢出與字型等待
  helpers/market-fixture.js 行情 API 攔截
  helpers/product-card.js  商品卡照片框量測
  helpers/test-api.js      把前台 API base 指到測試後端
  scripts/start-backend.js 重建測試資料庫並啟動後端
  tests/*.spec.js          瀏覽器案例
```
