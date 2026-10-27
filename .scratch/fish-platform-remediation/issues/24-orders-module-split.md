# 24: `lib/orders.js` 依職責拆分

**What to build:** 可售數量、訊息建立與逾時掃描分到清楚的小模組，依賴方向單向，每個檔案不超過 200 行。

**Blocked by:** 17（訂單狀態單一來源）、19（卡片同步共用 helper）

**Status:** resolved

- [x] 拆分後每個檔案 ≤ 200 行。
- [x] 依賴方向單向，狀態常數模組不反向 require route。
- [x] 對外行為不變；`npm test` 全綠。
- [x] 沒有為了行數而壓縮或產生不明確的檔案界線。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R8」。

## Comments

- 2026-10-27 完成。`lib/orders.js` 移除，依職責拆成 `lib/product-stock.js`（可售量、商品狀態與衍生欄位）、`lib/messages.js`（`addMessage`／系統訊息／卡片訊息）、`lib/timeouts.js`（逾時取消與掃描）；協議卡同步移到 `lib/cards.js` 的 `syncDealCard`，`itemsOf` 移到 `lib/deal-items.js`，`isActive` 移到 `lib/deal-statuses.js`，讓狀態判斷留在不依賴其他模組的常數檔。所有 route 與 lib 改為直接 require 新模組，依賴方向為 `routes → lib`、`product-stock → deal-items → messages → store`，沒有循環。
- 2026-10-27：`npm test` 323 個測試全綠；`orders.js` 刪除後沒有檔案超過 200 行，也沒有為了行數壓縮邏輯。
