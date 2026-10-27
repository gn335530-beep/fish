# 18: 加購流程與尾數驗證收斂

**What to build:** 加購與新增訂單項目的庫存守門、錯誤 payload、系統訊息與尾數驗證共用同一份實作。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 「尾數必須大於等於 1」只出現一處。
- [ ] `INSUFFICIENT_QUANTITY` 只在共用函式產生。
- [ ] 加購與首次建立訂單項目的行為一致，錯誤訊息與系統訊息不變。
- [ ] `deals.test.js`、`deal-items.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R2」。
