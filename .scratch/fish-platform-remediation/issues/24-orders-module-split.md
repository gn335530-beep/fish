# 24: `lib/orders.js` 依職責拆分

**What to build:** 可售數量、訊息建立與逾時掃描分到清楚的小模組，依賴方向單向，每個檔案不超過 200 行。

**Blocked by:** 17（訂單狀態單一來源）、19（卡片同步共用 helper）

**Status:** ready-for-agent

- [ ] 拆分後每個檔案 ≤ 200 行。
- [ ] 依賴方向單向，狀態常數模組不反向 require route。
- [ ] 對外行為不變；`npm test` 全綠。
- [ ] 沒有為了行數而壓縮或產生不明確的檔案界線。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R8」。
