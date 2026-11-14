# 07: 配額、429 與重試

**What to build:** Gemini 429、Tavily 429 與 Tavily 額度用完時，回傳對應錯誤碼與 `retryable:true`。前端收到可重試錯誤時先跑規則；平台意圖能處理就照常完成、不顯示錯誤；規則也不能處理時才顯示提示與重試按鈕。重試沿用同一個 `message_id`，不重複寫入使用者訊息。不自動排隊、不自動重試、不快取搜尋結果。

**Blocked by:** 02、06.

**Status:** resolved

- [x] Gemini 429 回 `LLM_RATE_LIMITED`；Tavily 429 回 `SEARCH_RATE_LIMITED`；額度用完回 `SEARCH_QUOTA_EXHAUSTED`；`retryable` 正確。
- [x] 配額錯誤時先跑規則；平台意圖能處理就照常完成且不顯示錯誤。
- [x] 規則不能處理時顯示提示與重試按鈕；重試沿用同一個 `message_id`，不重複寫入使用者訊息。
- [x] 平台功能在配額用完時仍可上架、找魚、查行情。
- [x] 非 retryable 錯誤維持靜默 fallback，不顯示技術錯誤。
- [x] 不自動排隊、不自動重試、不快取搜尋結果。
- [x] 相關 API、流程與 UI 文件已同步更新。
- [x] 新增與修改的程式碼檔案皆不超過 200 行。

## Comments

- 2026-11-14：後端既有 `result.js`／`provider.js`／`tools/web.js` 已回傳配額錯誤碼與 `retryable`；本次補上前端流程。新增 `demo/ai/reply-flow.js`（規則優先、提示與重試）、`demo/ai/retry.js`（錯誤文案）、`demo/views/ai-retry.js`（transient 提示與「重試」按鈕），並在 `flow.js`、`actions.js`、`store.js`、`views/assistant.js` 接線。重試沿用原 `message_id`；切換房間、送出下一個訊息或重試成功都會清除提示；`aiPending` 期間隱藏按鈕。測試見 `frontend/test/ai-quota-retry.test.js`（7 個案例），涵蓋平台意圖不顯示提示、規則無法處理才提示、同 `message_id` 重試、重試仍失敗、非 retryable 靜默 fallback、重試後轉為非 retryable，以及切換房間清除提示。`npm test` 638 通過。
