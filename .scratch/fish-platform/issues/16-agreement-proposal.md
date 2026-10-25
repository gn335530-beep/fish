# 16: 協議提案與協議卡

**What to build:** 買家或釣客按「協商完畢」，填整單金額、面交地點與面交時間後送出。系統逐項檢查尾數沒有超過可售，通過後訂單進入待回覆、鎖定 30 分鐘、發起方自動視為已簽，並在交易房插入協議卡；商品顯示洽談中保留。（規格：G-11、F7）

**Blocked by:** 15（訂單摘要與加購、改量、刪項）

**Status:** resolved

- [x] 「協商完畢」可填整單金額、面交地點、面交時間；缺少必填欄位時不能送出。
- [x] 送出後訂單進入待回覆，鎖定 30 分鐘，發起方簽核為真。
- [x] 協議卡顯示品項、整單金額、地點、時間與「等待確認」狀態。
- [x] 任一項尾數超過可售時回 409 並指出是哪個商品，訂單維持草稿。
- [x] 商品的可售尾數扣除保留後正確，狀態顯示洽談中。
- [x] 非房間參與者不能提案。

## Comments

- 2026-10-25：後端新增 `POST /api/deals/propose`（`routes/deal-proposal.js`）。驗證整單金額 > 0、面交地點 1–100 字、面交時間可解析、至少一個項目；逐項比對 `quantity ≤ available`，不足回 409 `INSUFFICIENT_QUANTITY` 並附 `item_id`／`product_id`／`available`，訂單維持 `DRAFT`。通過後 `DRAFT → PENDING_REVIEW`、`lock_expires_at = now + 30 分`、`deal_terms` 寫入，發起方對應的 `buyer_confirmed` 或 `seller_confirmed` 設為真，插入協議卡與系統訊息。同一房已有一筆進行中訂單時回 409 `DEAL_IN_PROGRESS`（02-domain 6.2）。
- 2026-10-25：商品狀態仍由數量推導（ADR 0002）；`PENDING_REVIEW` 已列入保留，`available` 會扣除提案尾數。保留優先於售完，因此即使可售為 0，只要還有保留就顯示「洽談中」（`PARTIALLY_RESERVED`），全部售完且沒有保留才是 `SOLD_OUT`。
- 2026-10-25：前端協議卡渲染（`views/cards.js`）顯示品項、整單金額、面交地點、時間與「等待確認」；交易房摘要切換為唯讀並顯示協議條件。提案表單的輸入值寫回 state，輪詢重繪時不會清掉內容。面板 `setBody` 會保留焦點與游標。
- 2026-10-25：新增 `backend/test/deal-proposal.test.js`（10 個案例：缺欄位、金額、釣客發起、全部保留時的狀態、30 分鐘鎖定、協議卡與系統訊息、保留與可售、409 維持草稿、非參與者、進行中唯一）與 `frontend/test/deal-order.test.js` 的協議卡與必填欄位案例。
