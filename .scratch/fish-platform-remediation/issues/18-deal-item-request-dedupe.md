# 18: 加購流程與尾數驗證收斂

**What to build:** 加購與新增訂單項目的庫存守門、錯誤 payload、系統訊息與尾數驗證共用同一份實作。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 「尾數必須大於等於 1」只出現一處。
- [x] `INSUFFICIENT_QUANTITY` 只在共用函式產生。
- [x] 加購與首次建立訂單項目的行為一致，錯誤訊息與系統訊息不變。
- [x] `deals.test.js`、`deal-items.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R2」。

## Comments

- 2026-10-27 完成。新增 `lib/quantities.js`：`requireQuantity`（含唯一的「尾數必須大於等於 1」訊息）與 `insufficientQuantity`（唯一的 `INSUFFICIENT_QUANTITY` 產生點），商品上架、協議送出、加購與改尾數都改用。`lib/deal-items.js` 新增 `requireAddableQuantity`／`addWithMessage`，把加購與首次建立的尾數驗證、草稿累計、可售守門 payload、寫入項目與系統訊息收斂成同一份；`initiate-channel` 傳入原本的「可售尾數不足」短訊息，其餘錯誤訊息與系統訊息順序維持不變。`deals.test.js`、`deal-items.test.js`、`deal-proposal.test.js` 全數通過。
