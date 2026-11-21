# 05: deadline 剩餘時間 helper

**What to build:** 抽出單一「剩餘毫秒」helper（下限 1ms），取代 listing 流程中重複的 deadline 剩餘時間算式；查詢預算的 3000ms 上限以該 helper 為底再取 min。純重構，不改變逾時語意。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 重複的 deadline 剩餘時間算式收斂成單一 helper。
- [ ] 查詢預算維持 min(剩餘, 3000) 的語意。
- [ ] 既有 listing 測試全綠，無新增測試。
- [ ] `npm test` 全綠，所有檔案 ≤ 200 行。

## Comments
