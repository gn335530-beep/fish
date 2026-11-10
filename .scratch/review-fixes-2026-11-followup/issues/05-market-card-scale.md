# 05: 行情卡縮放常數集中

**What to build:** 買家在行情卡 7 日與 30 日、短價格與長價格都看到價格與「元/台斤」不重疊。行情卡的水平與垂直縮放常數集中在同一個凍結常數；渲染時同時輸出兩個自訂屬性，CSS 只讀變數，不再寫死 `.9`。

**Blocked by:** 01

**Status:** resolved

- [x] 垂直縮放值只出現在行情卡價格幾何常數，CSS 不再有 `.9` 字面值。
- [x] 價格元素同時輸出水平與垂直縮放的自訂屬性；CSS 的預設值不會成為第二個來源。
- [x] Playwright 在 7 日／30 日、短價格／長價格下量到價格不與「元/台斤」重疊、不超出卡片。
- [x] 48px 字級、可用寬度、價格文字、卡片座標與 7／30 日切換行為不變。
- [x] 重量試算與參考價仍可互動；既有行情卡 Node 測試通過。
- [x] `npm test` 與 `npm run test:e2e` 通過。

## Comments

- 2026-11-10：`PRICE_GEOMETRY` 補 `minHorizontalScale` 與 `verticalScale: .9`；渲染同時輸出 `--price-scale` 與 `--price-scale-y`。CSS 的 transform 只讀兩個自訂屬性，`0.9` 僅保留為舊快取 JS 的 fallback，並由 Playwright 的無 inline style 案例鎖定。新增 `e2e/fixtures/market-card.html` 用真實行情卡 view 載入固定資料，涵蓋 7／30 日與短／長價格的價格幾何、日期、來源、重量試算與單位切換；截圖 baseline 在改常數前建立，改動後比對通過。`market-card.css` 已提版到 `v17`。

