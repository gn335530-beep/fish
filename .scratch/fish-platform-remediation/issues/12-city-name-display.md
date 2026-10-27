# 12: 縣市「臺／台」顯示一致

**What to build:** 登入彈窗的縣市顯示與登入頁選項一致，台北市不因 API 回傳「臺北市」而變成另一種寫法。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 登入彈窗顯示「台北市」，與登入頁選項一致。
- [ ] 顯示層套用既有的縣市正規化，不改 `db.json`。
- [ ] 其他縣市與既有測試不受影響；`npm test` 全綠。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D3」。
