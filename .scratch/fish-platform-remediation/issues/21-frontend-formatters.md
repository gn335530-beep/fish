# 21: 前端 escape／money／日期格式單一來源

**What to build:** 前端跳脫、金額與日期時間格式，以及行情快照格式各只有一份實作，所有頁面共用。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `escapeHtml`、`money`、`dateTimeOf` 各只有一個定義；`grep -rn "function escape" frontend/assets/js` 只有一處。
- [ ] 行情快照格式化只剩一份。
- [ ] `market-card.test.js`、`trade-history.test.js`、`product-market.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R5」。
