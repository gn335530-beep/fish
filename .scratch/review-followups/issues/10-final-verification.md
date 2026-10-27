# 10: 全量測試、行數上限與範圍外修正紀錄確認

**What to build:** 為這輪收斂做最後守門：跑完整測試、確認所有程式碼檔案不超過 200 行、確認五個測試斷層都有新案例，並確認兩個已上線但無 ticket 的合理修正已留下紀錄。這張票不新增功能，只驗證前面各票合併後的結果沒有新債。

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09

**Status:** resolved

- [x] `npm test` 全綠，涵蓋後端與前端測試。
- [x] 所有程式碼檔案不超過 200 行，且沒有為符合行數而不合理壓縮。
- [x] 五個斷層都有本輪新案例：後端 HTTP、前端共用狀態、前端視圖渲染、前端共用格式、魚種對照。
- [x] spec 與 remediation README 已記錄兩個已接受的範圍外修正（登出清除本機 token、登入頁法規強調）。
- [x] 人工驗收結果已寫回對應 ticket 的 Comments。
- [x] spec 的 Testing Decisions 沒有未涵蓋的案例。

**Source:** `.scratch/review-followups/spec.md` 的「Testing Decisions」與「完成條件」。

## Comments

2026-10-28 完成最終守門。

- `npm test`：347 個測試全數通過（0 fail），涵蓋 backend 與 frontend。
- 全 repo `.js` 檔案行數掃描：最大為 `frontend/assets/js/pages/product-detail.js` 182 行，其餘都在 200 行以下；沒有為行數壓縮程式碼。
- 五個斷層都有本輪新案例：
  1. 後端 HTTP：`deal-cancel.test.js`、`deal-timeout.test.js`、`seed-users.test.js`。
  2. 前端共用狀態：`message-store.test.js`、`deal-labels.test.js`。
  3. 前端視圖渲染：`room-summary.test.js`、`product-title.test.js`、`market-card.test.js`。
  4. 前端共用格式：`format.test.js` 的台斤常數與一位小數案例。
  5. 魚種對照：`market-mappings.test.js` 的名稱／別名、代碼集合與顯示變更鎖定。
- 範圍外修正已記錄：`spec.md` 的文件段落與 remediation README 的 2026-10-28 決定（`d2548a5` 登出清除本機 token、`bedcbf8` 登入頁法規強調）。
- 人工驗收結果已寫回 ticket 09 的 Comments。
- 對照 `spec.md` 的 Testing Decisions 新增案例清單，11 項都有對應測試，沒有未涵蓋案例。
