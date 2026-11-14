# 01: 後端 AI service 拆分與錯誤一致化

**What to build:** 助手房 AI 回覆的工具執行流程與錯誤處理變得可維護：工具迴圈獨立成模組、所有 AI 錯誤共用同一個建構方式、停用網路工具被模型呼叫時回報不合格輸出。使用者看到的行為與現在相同，只有錯誤碼語意變得更準確。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 工具執行迴圈從 AI service 拆出；service 只負責開關、設定、歷史、輸出驗證、log 與錯誤映射。
- [x] provider、輸出驗證、結果映射與工具錯誤共用單一錯誤建構器，`code` 與 `retryable` 的設定方式一致。
- [x] 網路搜尋停用時模型要求 `web_search`，回 `LLM_INVALID_OUTPUT` 並靜默 fallback，不再回 `LLM_GUARD_REJECTED`。
- [x] 既有 AI 回覆、工具、配額與前端測試全部通過；靜默 fallback 與配額重試行為不變。
- [x] 所有新增或修改的程式碼檔案不超過 200 行。
- [x] 若文件列出 `LLM_INVALID_OUTPUT`／`LLM_GUARD_REJECTED` 的語意，同步更新為新的錯誤碼分工。
