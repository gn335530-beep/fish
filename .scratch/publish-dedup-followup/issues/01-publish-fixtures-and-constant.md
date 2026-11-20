# 01: 發布測試 fixture 收斂與識別碼常數正名

**What to build:** 讓後續的發布行為測試建立在共用的測試工具上。延遲 gate 只實作一次，任何測試都能取得 promise 與 release；發布測試共用同一份標準商品資料，不再各自硬編商品標題。後端識別碼格式常數改名為表達「格式」而非「欄位值」的名稱。完成後所有既有測試仍通過，產品行為、HTTP 狀態與錯誤碼不變。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 延遲 gate 只有一份實作；現有發布測試全部改用，測試不再各自複製 promise／release 樣板。
- [x] 標準商品資料由共用發布 fixture 提供；前端發布測試不再硬編商品標題字面值。
- [x] 後端識別碼格式常數名稱表達它是 pattern，而不是欄位值。
- [x] 識別碼驗證行為、建立商品的 HTTP 狀態、錯誤碼與回應欄位完全不變。
- [x] `npm test` 全綠；修改檔案不超過 200 行。

## Comments

- 2026-11-20：`publish-fixtures.js` 新增 `createGate()`（回傳 `promise` 與 `release`），並以 `PRODUCT`／`NOTICE` 作為唯一商品 fixture；`publish-draft.test.js` 與 `publish-room-safety.test.js` 全部改用，移除各自複製的 promise／release 與商品標題字面值。後端常數 `CLIENT_REQUEST_ID` 改名為 `CLIENT_REQUEST_ID_PATTERN`，驗證行為與 HTTP 契約不變。`npm test` 694 通過；`products.js` 182 行、`product-idempotency.test.js` 120 行、`publish-fixtures.js` 137 行、`publish-draft.test.js` 92 行、`publish-lifecycle.test.js` 72 行、`publish-room-safety.test.js` 66 行。
