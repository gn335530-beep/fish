# 01: Prefactor：拆開助手回覆與對話流程的接縫

**What to build:** 不改變使用者行為；把現有助手回覆服務與前端對話流程沿「listing／一般回覆」與「發布／聊天」接縫拆成職責清楚的模組，讓後續 model-driven listing 能在單一 context window 完成。既有測試必須維持全綠，且不新增使用者可見的文字、按鈕或設定。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 助手回覆服務與前端對話流程的職責已拆開，相關程式檔案都低於 200 行。
- [x] LLM 關閉與開啟時的既有測試、規則上架、交易房與發布流程全部通過。
- [x] 不新增使用者可見的文字、按鈕、設定或行為改變。
- [x] 不新增測試框架或第二套 API stub；沿用既有斷層。
- [x] `npm test` 全綠。

## Comments

- 2026-11-22：完成。後端 listing 回覆拆到 `lib/ai/listing.js`（後續再拆出 prompt／validate／species／condition／draft 模組），前端模型路由拆到 `demo/ai/listing-llm.js`；LLM 開關、規則上架、交易房與發布流程測試全數通過。commit 189d45a。
