# 23: 魚種名稱與別名單一來源

**What to build:** 魚種的顯示名稱與別名只由魚種清單提供，行情對照只存代碼與對照關係，不再重複列名稱。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `grep -rn "嘉鱲\|加鱲" backend` 只在單一來源檔出現。
- [ ] `GET /api/species` 的名稱與別名輸出維持不變。
- [ ] 行情對照查詢結果不變。
- [ ] `market-mappings.test.js`、`market-price.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R7」。
