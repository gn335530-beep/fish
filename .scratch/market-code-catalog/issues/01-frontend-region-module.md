# 01: 抽出前端地區模組

**What to build:** 將地區正規化與地區解析從舊魚種模組抽成獨立的前端地區模組，讓對話、上架與商品頁的地區行為維持不變。這是後續刪除舊魚種模組的前置整理。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 對話與上架流程仍能正確解析縣市，包含「臺」正規化為「台」。
- [x] 商品列表與商品詳情的地區顯示與現在一致。
- [x] 舊魚種模組不再負責地區正規化或地區解析。
- [x] 既有地區相關測試維持通過，且沒有新增第二份縣市清單。

## Comments

2026-10-28 完成。新增 `frontend/assets/js/shared/regions-data.js`（唯一縣市清單與文字正規化，classic／module 共用）與 `frontend/assets/js/shared/regions.js`（`findRegion`、`normalizeCityName`）。`demo/ai/species.js` 只保留魚種查詢；對話、上架、導購與商品卡改從 shared 地區模組匯入。`app/04-regions.js` 改用同一份清單與正規化，四個頁面補載 `regions-data.js`。新增 `frontend/test/regions.test.js`。
