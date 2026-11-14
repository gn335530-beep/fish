# 10: 固定上限與環境變數文件

**What to build:** 助手房的歷史訊息與工具呼叫次數回到 ADR-0011 的固定上限：最近 10 則、每輪最多 2 次。設定、README 與 API 文件只列出真正支援的環境變數，不再有未文件化的隱藏上限。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 歷史固定取最近 10 則使用者／助手訊息。
- [ ] 每輪工具呼叫固定最多 2 次。
- [ ] 移除 `LLM_HISTORY_LIMIT` 與 `LLM_MAX_TOOL_CALLS`；程式與文件都不再接受或列出這兩個變數。
- [ ] 模型輸入的歷史最多 10 則；要求第 3 次工具呼叫時回 `LLM_GUARD_REJECTED`。
- [ ] `LLM_TIMEOUT_MS` 與 `LLM_SEARCH_TIMEOUT_MS` 仍可調整，文件說明它們與一般回覆／網路回合的關係。
- [ ] 根目錄與後端 README 的環境變數清單一致且只含支援項目。
- [ ] 端點測試覆蓋固定上限與移除環境變數後的行為。
