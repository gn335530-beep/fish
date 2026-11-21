# 03: 國外地點天氣逾時與上游錯誤

**What to build:** 「東京天氣如何？」遇到 Tavily 逾時或上游錯誤時，使用者看到「查不到國外地點天氣，請稍後再試。」，不是靜默 fallback 或通用引導句。要求來源時同一則附「目前沒有可提供的來源。」；網路停用與空結果維持同一套文案；配額與速率限制維持可重試。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Tavily 逾時 → 200、`handled:true`、`intent:CHAT`、指定文案；不呼叫模型產生替代答案。
- [x] Tavily 上游錯誤 → 同上。
- [x] 網路停用、空結果 → 同一套文案（回歸）。
- [x] 要求來源時附無來源提示，`sources` 為空陣列。
- [x] 回應 `error_code` 為 `null`；內部 log 保留 `LLM_TIMEOUT`／`LLM_UPSTREAM_ERROR`。
- [x] 配額用完與速率限制仍為可重試，不套用直接回覆。
- [x] 使用假 Tavily 錯誤模式；測試不連網。

## Comments

- 2026-11-21：完成。`result.js` 辨識國外天氣回合最後一次 `web_search` 的逾時／上游錯誤，`service.js` 改回 200 + `handled:true` 的「查不到」並在內部 log 保留錯誤碼；`directReply` 只把錯誤碼寫入 log，回應 `error_code` 維持 `null`。`fakeTavily` 新增錯誤與狀態注入；測試見 `ai-foreign-weather-errors.test.js`，既有停用與空結果案例維持不變。文件同步到流程規格、API 規格、ADR-0013 與 README。
