# 12: 縣市「臺／台」顯示一致

**What to build:** 登入彈窗的縣市顯示與登入頁選項一致，台北市不因 API 回傳「臺北市」而變成另一種寫法。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 登入彈窗顯示「台北市」，與登入頁選項一致。
- [x] 顯示層套用既有的縣市正規化，不改 `db.json`。
- [x] 其他縣市與既有測試不受影響；`npm test` 全綠。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D3」。

## Comments

2026-10-27 完成。登入頁載入既有的 `app/04-regions.js`，`finish()` 以 `normalizeCityName(city)` 顯示縣市，API 回傳的「臺北市」會顯示為「台北市」。未修改 `db.json`。`frontend/test/login-page.test.js` 新增正規化與載入檢查。
