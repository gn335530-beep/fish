# 17: 訂單狀態與前端文案單一來源

**What to build:** 後端與前端的訂單狀態清單、可操作狀態與顯示文案各只有一份定義，其餘檔案以 import 使用。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `ACTIVE_STATUS`、`CANCELLABLE` 這類清單只保留一份定義。
- [x] 前端狀態文案只剩一份 map，交易歷史、協議卡與協議表單共用。
- [x] 狀態常數放在獨立模組，不與既有的狀態轉換模組形成循環依賴。
- [x] `deal-*.test.js` 全數通過；`npm test` 全綠。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R1」。

## Comments

2026-10-27 完成。後端新增 `lib/deal-statuses.js`（`DRAFT_STATUS`、`ACTIVE_STATUS`、`ACTIVE_ORDER`、`CANCELLABLE`），`orders.js`、`deals.js`、`conversations.js`、`deal-proposal.js`、`deal-response.js` 都改為 import；此模組不依賴其他模組，避免與 `deal-status.js` 狀態轉換形成循環。前端新增 `shared/deal-status.js` 單一文案來源（DEAL／CARD／NOTE），交易歷史、協議卡、協議表單與收件匣都改用它；classic 頁面讀全域，ESM 透過 `demo/deal-labels.js` 存取。新增 `frontend/test/deal-labels.test.js`。
