# 31: 對話刪除與交易房連帶刪除

**What to build:** 每張 AI 對話卡片右上角 X，確認「確定刪除聊天室？」後刪除對話、訊息與 context。交易房必須沒有任何 `CONFIRMED` 訂單，且目前訂單為 `CANCELLED`（或全部訂單皆 `CANCELLED`）才可刪；刪除時一併移除訊息、該房所有訂單與項目，交易紀錄不再顯示；有成交歷史或進行中訂單不可刪。刪到最後一間助手房時顯示空狀態與「新增 AI 對話」。（規格：G-20、AC-13、AC-14、F11、02 §6.2）

**Blocked by:** 30

**Status:** ready-for-human

- [x] `DELETE /api/conversations/:id`：助手房任何時候可刪，刪除該房訊息與 `context`；交易房只有在房內沒有 `CONFIRMED` 訂單，且目前訂單為 `CANCELLED`（或全部訂單皆 `CANCELLED`）時可刪，否則 409 `DEAL_NOT_DELETABLE`。
- [x] 刪除交易房一併移除訊息、該房所有 `deals` 與訂單項目；交易紀錄不再顯示。
- [x] 收件匣 X 先問「確定刪除聊天室？」；交易房只有可刪時顯示 X；房內有 `CONFIRMED` 歷史時不顯示 X。
- [x] 刪到最後一間助手房時顯示空狀態與「新增 AI 對話」；不自動建立新房間，直到使用者新增或下次登入。
- [x] 權限：參與者；404 `CONVERSATION_NOT_FOUND`、403 `FORBIDDEN`。
- [x] 測試、glossary、02-domain、03-flows、04-data-model、05-api、06-ui、07-roadmap 同步。

## Comments

- 2026-10-27：已實作。`DELETE /api/conversations/:id` 依房間類型檢查；交易房需全部訂單皆 `CANCELLED` 才可刪，刪除時一併移除訊息、訂單（含項目）。收件匣以 `deletable` 決定是否顯示 X，刪到最後一間助手房顯示空狀態。
