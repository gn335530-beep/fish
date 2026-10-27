# 14: 行情對話一律用「暫無行情」

**What to build:** 助手在查無行情或上游失敗時，一律回「暫無行情」，不再出現「沒有今天的」「暫時無法取得」等分歧說法。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 查無資料與上游失敗的對話回覆都含「暫無行情」。
- [x] `grep -rn "沒有今天的\|暫時無法取得" frontend/assets/js/demo/ai` 無結果。
- [x] 行情卡版維持既有「暫無行情」文案。
- [x] `frontend/test/market-chat.test.js`、`listing-market.test.js` 更新後通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D5」與 ADR-0003。

## Comments

2026-10-27 完成。行情問答與上架行情卡在查無資料、無對照、上游失敗或連線失敗時一律回「暫無行情」，不再區分「沒有今天的」與「暫時無法取得」；指定縣市無資料但可退回全國平均時，改用「{縣市}暫無行情，改以全國平均：」。行情卡與商品卡文案維持不變。`docs/spec/02-domain.md`、`03-flows.md`、`06-ui.md`、`07-roadmap.md` 同步。`frontend/test/market-chat.test.js`、`listing-market.test.js` 已更新。
