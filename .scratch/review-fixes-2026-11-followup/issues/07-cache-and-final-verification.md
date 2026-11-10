# 07: 樣式快取提版與最終驗證

**What to build:** 回訪買家在部署後拿到新樣式。layout 與 product-card-photo 已在 ticket 03 提版（`v9`／`v13`）；本票為 components、deal-bot、deal-cards 三個樣式模組在首頁、商品列表、登入頁統一提版，並確認所有本次改過的模組都不再使用舊版本。Playwright 斷言本地 CSS／JS 都有 `?v=` 且這些模組不再使用舊的 `v8`。最後跑完整驗證，確認文件、200 行上限與所有測試都完成。

**Blocked by:** 02, 03, 04, 05, 06

**Status:** ready-for-agent

- [ ] layout 與 product-card-photo 已在三個頁面使用新版本；components、deal-bot、deal-cards 提版後也一致，且不再是舊的 `v8`。
- [ ] Playwright 斷言三個頁面的本地 CSS／JS 請求都有 `?v=`。
- [ ] `npm test` 與 `npm run test:e2e` 全綠。
- [ ] UI 規格與交易房 spec 的文案／欄位和程式一致。
- [ ] 所有被修改的程式碼檔案不超過 200 行。
- [ ] 最終 review 確認沒有視覺回歸；若截圖 baseline 有更新，已記錄原因。

## Comments

- 2026-11-10：ticket 03 改了 `layout.css` 與 `product-card-photo.css`，已同步把三個頁面的 layout 提到 `v9`、首頁與商品列表的 product-card-photo 提到 `v13`，避免舊 product-card-photo 快取搭配新 layout 時失去照片框裁切。本票只剩 components、deal-bot、deal-cards 提版。

