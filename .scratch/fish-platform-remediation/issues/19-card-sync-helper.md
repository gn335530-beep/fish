# 19: 協議／評價卡片同步共用 helper

**What to build:** 協議卡與評價卡都用同一個「依 seq 更新最新卡片」的 helper，不再各自維護排序與更新邏輯。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 只剩一份「排序訊息、更新最新卡片」的實作。
- [x] 協議卡與評價卡的行為、歷史卡保留規則不變。
- [x] `deal-response.test.js`、`reviews.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R3」。

## Comments

- 2026-10-27 完成。新增 `lib/cards.js` 的 `syncLatestCard(dealId, type, changes)`：依 `seq` 由大到小找出同一訂單同型別的最新卡片並合併更新，沒有卡片時回傳 null。`lib/orders.js` 的 `syncDealCard` 與 `lib/reviews.js` 的 `syncReviewCard` 都改為呼叫它，各自只負責自己的欄位；較早的卡片仍保留歷史狀態。`deal-response.test.js`、`reviews.test.js`、前端卡片同步測試全數通過。
