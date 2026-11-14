# 07: 配額、429 與重試

**What to build:** Gemini 429、Tavily 429 與 Tavily 額度用完時，回傳對應錯誤碼與 `retryable:true`。前端收到可重試錯誤時先跑規則；平台意圖能處理就照常完成、不顯示錯誤；規則也不能處理時才顯示提示與重試按鈕。重試沿用同一個 `message_id`，不重複寫入使用者訊息。不自動排隊、不自動重試、不快取搜尋結果。

**Blocked by:** 02、06.

**Status:** ready-for-agent

- [ ] Gemini 429 回 `LLM_RATE_LIMITED`；Tavily 429 回 `SEARCH_RATE_LIMITED`；額度用完回 `SEARCH_QUOTA_EXHAUSTED`；`retryable` 正確。
- [ ] 配額錯誤時先跑規則；平台意圖能處理就照常完成且不顯示錯誤。
- [ ] 規則不能處理時顯示提示與重試按鈕；重試沿用同一個 `message_id`，不重複寫入使用者訊息。
- [ ] 平台功能在配額用完時仍可上架、找魚、查行情。
- [ ] 非 retryable 錯誤維持靜默 fallback，不顯示技術錯誤。
- [ ] 不自動排隊、不自動重試、不快取搜尋結果。
- [ ] 相關 API、流程與 UI 文件已同步更新。
- [ ] 新增與修改的程式碼檔案皆不超過 200 行。
