# 21: 前端 escape／money／日期格式單一來源

**What to build:** 前端跳脫、金額與日期時間格式，以及行情快照格式各只有一份實作，所有頁面共用。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `escapeHtml`、`money`、`dateTimeOf` 各只有一個定義；`grep -rn "function escape" frontend/assets/js` 只有一處。
- [x] 行情快照格式化只剩一份。
- [x] `market-card.test.js`、`trade-history.test.js`、`product-market.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R5」。

## Comments

- 2026-10-27 完成。新增 `frontend/assets/js/shared/format.js`，集中 `escapeHtml`、`money`、`timeOf`、`dateTimeOf`、`dateOf`、`localInputOf`，以及行情快照的 `priceText`、`marketSnapshotPrice`、`marketSnapshotScope`、`marketSnapshotSource`、`marketSnapshotMeta`、`marketSnapshotLine`。`demo/views/html.js`、`demo/views/market.js` 改為 re-export；`app/05-product-view.js`、`app/10-trade-history.js`、`demo/views/market-card.js`、`demo/ai/market.js` 改為呼叫共用格式，classic 腳本以延遲取值避免載入順序問題。行情卡與對話行情不再各自實作數字與地區格式。
- 2026-10-27：金額統一為 `NT$` 格式，商品列表價格區間標籤同步為 `NT$0`／`NT$1,000`；日期時間統一補零。新增 `frontend/test/format.test.js`，頁面資產版本升至 v7。`market-card.test.js`、`trade-history.test.js`、`product-market.test.js`、`market-chat.test.js` 全數通過。
