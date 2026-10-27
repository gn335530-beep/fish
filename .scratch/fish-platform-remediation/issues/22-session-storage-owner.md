# 22: Session 儲存單一擁有者

**What to build:** 登入 token 與使用者快取只由一個模組讀寫，其他模組透過它取得；順手修掉指向已刪檔案的註解。

**Blocked by:** 09（移除使用者角色與死欄位）

**Status:** resolved

- [x] `haisen_token_v1`／`haisen_user_v1` 只出現在單一模組。
- [x] 登入→重整→登出的流程正常，登出會清掉 token 與助手狀態。
- [x] 過期或損壞的儲存值不會讓頁面崩潰。
- [x] `login-page.test.js`、`logout.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R6」。

## Comments

2026-10-27 完成。`api/client.js` 成為 `haisen_token_v1`／`haisen_user_v1` 的唯一讀寫者；`app/02-account.js` 的 `getUser`／`setUser`／`logoutUser` 全部改走 `HaisenAPI`，不再直接碰 localStorage。損壞的會員 JSON 會被清掉並回 `null`。修正 `client.js` 指向已刪 `app.js` 的註解。`logout.test.js` 新增重整後保留、登出後清除與損壞快取案例，並檢查其他模組不再出現儲存 key。
