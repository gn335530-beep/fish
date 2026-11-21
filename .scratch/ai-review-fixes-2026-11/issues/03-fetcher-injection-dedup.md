# 03: fetcher 注入樣板 dedup

**What to build:** 把 `conditions/` 四個資料源各自重複的 fetcher 注入樣板（set / reset / 取得目前 fetcher）收斂成單一 factory。每個資料源仍保留自己的獨立插槽與既有 `setFetcher`／`resetFetcher` 匯出，測試注入點與斷層不變。純重構，不改變任何上游請求行為或逾時語意。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 共用 factory 產生「可注入 fetcher 插槽」，四份重複樣板移除。
- [x] 每個資料源仍匯出 `setFetcher`／`resetFetcher`，測試 helper 不改。
- [x] 既有 CWA 預報／觀測／潮汐／Open-Meteo 測試全綠，無新增測試。
- [x] `npm test` 全綠（844/848；4 個失敗為 `market-cli.test.js` 的既有失敗，與本批無關），所有檔案 ≤ 200 行。

## Comments

- 2026-11-22：在 `fetch-json.js` 新增 `createFetcher()` factory（回傳 `{ set, reset, current }`），四個資料源（cwa-forecast、cwa-observation、cwa-tide、open-meteo）各自建立插槽並 re-export `setFetcher`／`resetFetcher`，測試 helper 與注入斷層不變。
