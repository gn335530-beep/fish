# 01: 協議與評價卡同步到非操作方

**What to build:** 對方在交易房同意、退回、取消或逾時，或送出評價後，另一方不需重開房間，3 秒內看到協議卡、評價卡與房間摘要更新。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 兩個瀏覽器分飾釣客與買家；一方送出協議後，另一方看到待確認卡。
- [x] 一方同意／退回／取消／等逾時後，另一方 3 秒內看到卡片狀態與摘要更新，不需重開房間。
- [x] 評價送出後，另一方的評價卡在 3 秒內顯示已評價。
- [x] 輪詢不會重複追加訊息，也不會把舊卡片蓋回新狀態。
- [x] 文件同步：`docs/api/README.md` 與 `docs/spec/03-flows.md` 描述新的摘要欄位與刷新行為。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「S1」（對應既有票 17、18、19）。

## Comments

2026-10-27 完成。`GET /api/conversations` 每間房新增 `last_order` 與 `orders`（均含 `review_status`、`updated_at`）；前端輪詢比對後重取訂單或更新訂單摘要。協議卡與評價卡顯示目前訂單狀態，較早的卡片維持歷史狀態；逾時訂單依 `cancel_reason` 顯示「已逾時」。新增 `backend/test/conversation-order-summary.test.js`、`frontend/test/deal-sync.test.js` 與 `frontend/test/card-sync.test.js`。
