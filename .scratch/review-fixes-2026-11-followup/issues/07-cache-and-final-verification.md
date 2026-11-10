# 07: 樣式快取提版與最終驗證

**What to build:** 回訪買家在部署後拿到新樣式。layout、product-card-photo、chat-frame、chat-frame-content、chat-bubbles、deal-bot、market-card 已在 ticket 03／04／05 提版；本票為 components、deal-cards 在首頁、商品列表、登入頁統一提版，並確認所有本次改過的模組都不再使用舊版本。Playwright 斷言本地 CSS／JS entry 都有 `?v=` 且這些模組不再使用舊的 `v8`。最後跑完整驗證，確認文件、200 行上限與所有測試都完成。

**Blocked by:** 02, 03, 04, 05, 06

**Status:** resolved

- [x] 已提版的樣式模組在指定頁面都有版本、跨頁一致且版本只遞增；components、deal-cards 在三頁都提版，且不再是舊的 `v8`。
- [x] Playwright 斷言三個頁面的本地 CSS／JS entry 都有 `?v=`。
- [x] `npm test` 與 `npm run test:e2e` 全綠。
- [x] UI 規格與交易房 spec 的文案／欄位和程式一致。
- [x] 所有被修改的程式碼檔案不超過 200 行。
- [x] 最終 review 確認沒有視覺回歸；若截圖 baseline 有更新，已記錄原因。

## Comments

- 2026-11-10：ticket 03 改了 `layout.css` 與 `product-card-photo.css`，已同步把三個頁面的 layout 提到 `v9`、首頁與商品列表的 product-card-photo 提到 `v13`，避免舊 product-card-photo 快取搭配新 layout 時失去照片框裁切。
- 2026-11-10：ticket 04 改了 `deal-bot.css`、`chat-frame.css`、`chat-bubbles.css` 並新增 `chat-frame-content.css`；三個頁面的 deal-bot 提到 `v9`、chat-frame 提到 `v3`、chat-bubbles 提到 `v4`，新檔以 `v1` 載入。ticket 05 改了 `market-card.css`，三個頁面提到 `v17`。
- 2026-11-10：ticket 07 把 components 與 deal-cards 在三個頁面提到 `v9`。新增 `e2e/tests/cache-version.spec.js`，檢查所有本地 CSS／JS entry 都帶 `?v=`、同檔跨頁版本一致，並依頁面別鎖定本批模組的版本只遞增（product-card-photo 只在首頁與商品列表）。最終驗證：`npm test` 493 passed、`npm run test:e2e` 26 passed；30 個修改的程式碼檔案都低於 200 行；UI 規格與交易房 spec 已無「近 N 交易日」，商品摘要都含「處理方式（若有）」；既有截圖 baseline 全部通過，沒有視覺回歸。

