# 02: 助手房接上 AI 回覆與等待指示

**What to build:** 助手房送出使用者訊息後，以該訊息的 `message_id` 與目前房間 context 呼叫 AI 回覆端點。`CHAT` 寫入 AI 回覆文字；`handled:false` 時安靜回到既有規則引擎，不顯示技術錯誤。等待期間顯示「小幫手正在輸入…」，交易房完全不呼叫 AI 端點。

**Blocked by:** 01.

**Status:** resolved

- [x] 送出使用者訊息後才呼叫 AI 回覆端點，且使用該訊息的 `message_id` 與目前房間 context。
- [x] `CHAT` 寫入 AI 訊息；`handled:false` 時只出現既有規則回覆，不顯示技術錯誤。
- [x] 等待期間顯示「小幫手正在輸入…」，回覆或 fallback 後消失。
- [x] 交易房送訊息時 AI 端點呼叫次數為 0。
- [x] 每間助手房只使用自己的 context，不混用其他房間的草稿。
- [x] 等待中送出的使用者訊息不會遺失。
- [x] 相關 UI 與流程文件已同步更新。
- [x] 新增與修改的程式碼檔案皆不超過 200 行。

## Comments

- 2026-11-14：`demo/flow.js` 在寫入使用者訊息後以 `message_id` 呼叫 `POST /api/ai/reply`；`demo/ai/reply.js` 負責 fallback 與批次轉換，`CHAT`／`WEB` 寫入 AI 文字，`handled:false` 安靜回到規則。等待狀態改用 `aiPending` 計數，助手房訊息流顯示「小幫手正在輸入…」；交易房直接跳過。`frontend/test/ai-reply-flow.test.js` 覆蓋順序、fallback、等待指示、交易房、房間 context 與並行送出。
