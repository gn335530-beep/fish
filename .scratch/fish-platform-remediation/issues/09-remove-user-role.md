# 09: 移除使用者角色與 `completed_orders` 死欄位（程式、API、文件）

**What to build:** 使用者是單一帳號型態，登入、註冊與 `me` 回應不再帶 `role` 或 `completed_orders`；前端不再送出或讀取這兩個欄位；交易中的釣客／買家身分不受影響。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `GET /api/auth/me`、login、register 回應不含 `role` 與 `completed_orders`；舊種子使用者亦同（`publicUser` 同時刪除這兩個欄位）。
- [ ] 新註冊使用者不再寫入這兩個欄位。
- [ ] 前端不再送出 `role`；使用者快取的 `orders` 只取 `completed_deals`，不再 fallback 到 `completed_orders`；相關註解同步。
- [ ] 測試 fixture 與 users-bootstrap fixture 不再帶 `role`／`completed_orders`。
- [ ] 程式、測試與文件不再有 `completed_orders`；`backend/db.json` 的資料清理另見 10。
- [ ] `grep -rn "role" backend frontend` 只剩交易／評價身分與 ARIA `role`。
- [ ] `docs/spec/01`、`02`、`04`、`05` 與 `docs/api/README.md` 不再把 `role` 描述成顯示標籤；`docs/spec/04-data-model.md` 移除 `completed_orders` 列。
- [ ] 新增 `docs/adr/0005-remove-user-role.md`，記錄「使用者是單一帳號型態，買方／釣客由交易推導」。
- [ ] `npm test` 全綠。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D1」階段 1 與「R10」。
