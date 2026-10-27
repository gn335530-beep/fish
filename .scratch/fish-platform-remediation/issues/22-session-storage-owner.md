# 22: Session 儲存單一擁有者

**What to build:** 登入 token 與使用者快取只由一個模組讀寫，其他模組透過它取得；順手修掉指向已刪檔案的註解。

**Blocked by:** 09（移除使用者角色與死欄位）

**Status:** ready-for-agent

- [ ] `haisen_token_v1`／`haisen_user_v1` 只出現在單一模組。
- [ ] 登入→重整→登出的流程正常，登出會清掉 token 與助手狀態。
- [ ] 過期或損壞的儲存值不會讓頁面崩潰。
- [ ] `login-page.test.js`、`logout.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R6」。
