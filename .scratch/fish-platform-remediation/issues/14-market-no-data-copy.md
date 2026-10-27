# 14: 行情對話一律用「暫無行情」

**What to build:** 助手在查無行情或上游失敗時，一律回「暫無行情」，不再出現「沒有今天的」「暫時無法取得」等分歧說法。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 查無資料與上游失敗的對話回覆都含「暫無行情」。
- [ ] `grep -rn "沒有今天的\|暫時無法取得" frontend/assets/js/demo/ai` 無結果。
- [ ] 行情卡版維持既有「暫無行情」文案。
- [ ] `frontend/test/market-chat.test.js`、`listing-market.test.js` 更新後通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D5」與 ADR-0003。
