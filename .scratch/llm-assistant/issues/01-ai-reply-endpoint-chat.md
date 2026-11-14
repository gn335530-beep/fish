# 01: AI 回覆端點與一般問答（CHAT）

**What to build:** 登入使用者可在助手房呼叫新的 AI 回覆端點；端點驗證房間、訊息與 context，讀取最近 10 則對話（卡片以一行摘要取代），遮蔽個資後呼叫 Gemini，回傳結構化結果。LLM 關閉、缺少金鑰、逾時、上游錯誤或格式錯誤時，回 HTTP 200 與 `handled:false`，不寫入訊息、不改 context。端點只接受助手房；log 只記 metadata，不記訊息內容。

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] 未登入、非參與者、非助手房、`message_id` 不屬於該房或目前使用者，皆回 4xx。
- [x] `LLM_ENABLED=false` 或缺少 `GEMINI_API_KEY` 時 provider 呼叫次數為 0，回 `handled:false` 與正確 `error_code`。
- [x] 假 provider 回 CHAT 時，回應含 `intent: "CHAT"`、`reply_text`、空 `sources`、空 `tool_results` 與 `retryable:false`。
- [x] 歷史只取最近 10 則使用者／助手訊息；系統訊息、圖片與完整卡片 JSON 不送入 provider；卡片以一行摘要取代。
- [x] 假 provider 收到的輸入不含電話、Email、身分證字號或地址原文；不送頭像、個人檔案電話與地址。
- [x] 逾時、5xx、invalid output 都回 `handled:false`，且不寫入任何訊息。
- [x] log 不含訊息內容、prompt、搜尋結果或 API key；含 request id、使用者 id、intent、token 數、耗時與錯誤碼。
- [x] `LLM_MODEL` 可用環境變數更換；一般回覆 timeout 預設 8 秒。
- [x] 相關 API 與流程文件已同步更新。
- [x] 新增與修改的程式碼檔案皆不超過 200 行。

## Comments

- 2026-11-14：新增 `backend/routes/ai.js` 與 `backend/lib/ai/`（config、provider、prompt、history、validate、service、log）；`LLM_ENABLED` 預設關閉，缺少金鑰、逾時、5xx、429、格式錯誤與數字防護分別回傳對應 `error_code`，端點不寫訊息。歷史摘要、個資遮蔽與 metadata log 已以 `backend/test/ai-reply*.test.js` 覆蓋。
