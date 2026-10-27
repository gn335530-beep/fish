# 11: 統一使用者可見詞彙

**What to build:** 使用者看到的對話、草稿與行情用語與 `GLOSSARY.md` 一致：助手房／交易房、上架草稿、主要新鮮代碼。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 刪除對話的提問與按鈕依房間類型顯示「助手房」或「交易房」，不再出現「聊天室」。
- [x] 商品草稿卡顯示「上架草稿」，不再出現「商品草稿」。
- [x] 行情路由與測試訊息使用「主要新鮮代碼」，不再出現「魚種代碼」。
- [x] `grep -rn "聊天室\|商品草稿\|魚種代碼" frontend backend` 無使用者可見字串。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D2」。

## Comments

2026-10-27 完成。`rooms.deleteConversation` 依房型顯示「確定刪除助手房？」或「確定刪除交易房？」，收件匣 X 的 aria/title 同步；草稿卡改為「上架草稿」；行情路由說明與回應改用「主要新鮮代碼」。`docs/spec/06-ui.md`、`07-roadmap.md` 同步更新。`frontend/test/inbox-rooms.test.js`、`assistant-rooms.test.js`、`draft-edit.test.js` 與 `backend/test/market-mappings.test.js` 涵蓋新文案。
