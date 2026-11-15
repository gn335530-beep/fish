# 06: 前端 AI 測試共用 fixture

**What to build:** 前端 AI 測試共用同一份 fixture：安裝假 API、初始化 flow、建立房間與訊息、重設 store。每個測試檔只保留自己的假資料、假回應與斷言；行為斷言不變。

**Blocked by:** 04（前端 AI 回覆共用流程）

**Status:** resolved

- [x] 共用 fixture 提供假 API 安裝、flow 初始化、房間與訊息建立，以及 store 重設。
- [x] 各 AI 測試檔不再複製安裝與初始化樣板，只保留自己的假資料與斷言。
- [x] 既有 AI 測試的斷言不改仍全部通過。
- [x] 新增一個 AI 測試時，不需要再貼上初始化樣板。
- [x] 共用 fixture 的初始化行為與原本各檔等價。
- [x] 所有新增或修改的程式碼檔案不超過 200 行。

## Comments

- 2026-11-15：`frontend/test/ai-fixtures.js` 提供 `setupAiTest`、`reset`、房間 helper、請求紀錄、`aiPaths` 與 `assistantTexts`；六個既有 AI 測試檔已移除安裝 API、初始化 flow 與 store 重設樣板。新增 `ai-retry-flow.test.js` 直接使用同一份 fixture。
