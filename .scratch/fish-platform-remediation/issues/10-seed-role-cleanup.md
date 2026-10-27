# 10: 清理 `db.json` 種子資料的 `role` 與 `completed_orders`

**What to build:** 依 2026-10-27 決定，先丟棄目前 `backend/db.json` 的本機開發變更，再從 HEAD 的種子資料移除四筆使用者的 `role` 與 `completed_orders`；啟動與 bootstrap 不會再把這兩個欄位加回來。

**Blocked by:** 09（移除使用者角色與死欄位）

**Status:** ready-for-agent

- [ ] 先以 `git restore backend/db.json` 丟棄目前未提交的本機資料變更；確認不需要保留其中的測試商品、對話與行情快取。
- [ ] 移除種子 `users` 的 `role` 與 `completed_orders`；`completed_orders` 直接刪除，不併入 `completed_deals`。
- [ ] 用暫存資料庫（`FISHMATCH_DB`）重跑 seed／bootstrap，確認新使用者與舊資料都不再產生這兩個欄位；不要在驗證時把倉庫的 `db.json` 寫髒。
- [ ] `grep -rn "completed_orders" backend frontend docs` 無結果；`role` 只剩交易／評價身分與 ARIA。
- [ ] `git diff backend/db.json` 只包含這兩個欄位的移除，不夾帶 products／messages／market 的本機變更。
- [ ] `npm test` 全綠。

**Decision:** 2026-10-27 使用者選擇 C（丟棄本機 `db.json` 變更）與直接刪除 `completed_orders`；seed/runtime 分離另見 26。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D1」階段 2 與「R10」。
