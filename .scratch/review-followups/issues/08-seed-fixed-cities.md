# 08: demo 種子資料固定合法縣市，移除啟動補值

**What to build:** demo 種子資料有兩個使用者沒有縣市，伺服器啟動時以隨機值補上，導致每次啟動結果不同。直接在種子資料補上固定且合法的縣市，移除啟動時「隨機補縣市」的執行期邏輯與其測試。改為種子資料測試：每位種子使用者都有縣市，且縣市在合法清單內。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 種子資料的每位使用者都有縣市，且縣市在合法清單內。
- [x] 伺服器啟動不再執行隨機補縣市，也不再保留該執行期邏輯與其測試。
- [x] 新增種子資料測試，直接驗證每位種子使用者都有合法縣市。
- [x] 啟動結果可重現；相關使用者初始化測試全綠。

**Source:** `.scratch/review-followups/spec.md` 的「種子資料」。

## Comments

2026-10-28 完成（commit `e0c02d1`）。`db.seed.json` 的四位使用者改為固定且正規化後的縣市（新北市、台北市、高雄市、台中市）。移除 `backend/lib/user-bootstrap.js` 與 `backend/test/users-bootstrap.test.js`，`app.js` 不再於啟動時補縣市。新增 `seed-users.test.js`，以 `normalizeRegion` 驗證每位種子使用者的縣市合法且已正規化。相關規格文件與原 ticket 32 的隨機補值描述已同步更新。
