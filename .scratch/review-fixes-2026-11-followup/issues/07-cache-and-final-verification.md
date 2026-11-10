# 07: 樣式快取提版與最終驗證

**What to build:** 回訪買家在部署後拿到新樣式。layout、components、deal-bot、deal-cards 四個改過的樣式模組在首頁、商品列表、登入頁統一提版；Playwright 斷言本地 CSS／JS 都有 `?v=` 且這四個模組不再使用舊的 `v8`。最後跑完整驗證，確認文件、200 行上限與所有測試都完成。

**Blocked by:** 02, 03, 04, 05, 06

**Status:** ready-for-agent

- [ ] 四個改過的樣式模組在三個頁面使用相同的新版本，且不再是舊的 `v8`。
- [ ] Playwright 斷言三個頁面的本地 CSS／JS 請求都有 `?v=`。
- [ ] `npm test` 與 `npm run test:e2e` 全綠。
- [ ] UI 規格與交易房 spec 的文案／欄位和程式一致。
- [ ] 所有被修改的程式碼檔案不超過 200 行。
- [ ] 最終 review 確認沒有視覺回歸；若截圖 baseline 有更新，已記錄原因。
