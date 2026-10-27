# 移除使用者角色，買方／釣客由交易推導

使用者是單一帳號型態，同一個帳號可以買也可以賣。`users.role` 原本只是顯示標籤，不影響任何權限；註冊表單也沒有角色選項，正常流程不可能產生 `SELLER`，只有舊種子資料才有。保留它只會讓 API、前端與文件多一個會過期的分類，因此連同沒有寫入端的 `completed_orders` 死欄位一起移除。

交易中的買方／釣客身分仍由訂單參與者推導（`deals.js`、`reviews.js`），與使用者角色無關，不受影響。

**Status**: accepted（2026-10-27）

**Considered Options**:

- 保留 `role` 當顯示標籤：需要同步維護，但沒有實際功能。
- 改成真正的權限角色：目前產品不需要，也會限制同一個帳號買賣。

**Consequences**:

- `publicUser` 會刪除舊資料中的 `role` 與 `completed_orders`，不必等資料清理。
- 前端舊 localStorage 的使用者物件可能還帶著 `role`，登入或 `me` 後會被新格式覆寫；不影響操作。
- `backend/db.json` 的種子資料清理另見 ticket 10。
