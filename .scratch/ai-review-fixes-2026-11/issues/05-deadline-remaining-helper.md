# 05: deadline 剩餘時間 helper

**What to build:** 抽出單一「剩餘毫秒」helper（下限 1ms），取代 listing 流程中重複的 deadline 剩餘時間算式；查詢預算的 3000ms 上限以該 helper 為底再取 min。純重構，不改變逾時語意。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 重複的 deadline 剩餘時間算式收斂成單一 helper。
- [x] 查詢預算維持 min(剩餘, 3000) 的語意。
- [x] 既有 listing 測試全綠，無新增測試。
- [x] `npm test` 全綠（844/848；4 個失敗為 `market-cli.test.js` 的既有失敗，與本批無關），所有檔案 ≤ 200 行。

## Comments

- 2026-11-22：在 `backend/lib/deadline.js` 新增 `remainingMs(deadline)`（回 `Math.max(1, deadline - Date.now())`），`listing.js` 的 5 處重複算式改用它；查詢預算維持 `Math.min(remainingMs(deadline), 3000)`。純重構，逾時語意不變。
