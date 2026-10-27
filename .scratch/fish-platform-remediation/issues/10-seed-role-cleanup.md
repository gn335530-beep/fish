# 10: 清理 `db.json` 種子資料的 `role` 與 `completed_orders`

**What to build:** 依 2026-10-27 決定，先丟棄目前 `backend/db.json` 的本機開發變更，再從 HEAD 的種子資料移除四筆使用者的 `role` 與 `completed_orders`；啟動與 bootstrap 不會再把這兩個欄位加回來。

**Blocked by:** 09（移除使用者角色與死欄位）

**Status:** resolved

- [x] 先以 `git restore backend/db.json` 丟棄目前未提交的本機資料變更；確認不需要保留其中的測試商品、對話與行情快取。
- [x] 移除種子 `users` 的 `role` 與 `completed_orders`；`completed_orders` 直接刪除，不併入 `completed_deals`。
- [x] 用暫存資料庫（`FISHMATCH_DB`）重跑 seed／bootstrap，確認新使用者與舊資料都不再產生這兩個欄位；不要在驗證時把倉庫的 `db.json` 寫髒。
- [x] `grep -rn "completed_orders" backend frontend docs` 只剩 `publicUser` 的相容刪除、測試斷言與 ADR 的資料遷移註記（plan R10 允許）。
- [x] `git diff backend/db.json` 只包含這兩個欄位的移除，不夾帶 products／messages／market 的本機變更。
- [x] `npm test` 全綠。

**Decision:** 2026-10-27 使用者選擇 C（丟棄本機 `db.json` 變更）與直接刪除 `completed_orders`；seed/runtime 分離另見 26。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D1」階段 2 與「R10」。

## Comments

2026-10-27 完成。已先 `git restore backend/db.json` 丟棄本機變更，再從 HEAD 種子移除四筆使用者的 `role` 與 `completed_orders`；`git diff backend/db.json` 只有 8 行刪除。另以暫存 `FISHMATCH_DB` 啟動 `backend/app` 重跑 seed／bootstrap，結果 4 位使用者、0 筆殘留欄位，倉庫 `db.json` 未被寫髒。剩餘 `completed_orders` 字樣只在 `publicUser` 的相容刪除、移除測試與 ADR 資料遷移註記中。
