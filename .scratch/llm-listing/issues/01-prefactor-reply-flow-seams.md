# 01: Prefactor：拆開助手回覆與對話流程的接縫

**What to build:** 不改變使用者行為；把現有助手回覆服務與前端對話流程沿「listing／一般回覆」與「發布／聊天」接縫拆成職責清楚的模組，讓後續 model-driven listing 能在單一 context window 完成。既有測試必須維持全綠，且不新增使用者可見的文字、按鈕或設定。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 助手回覆服務與前端對話流程的職責已拆開，相關程式檔案都低於 200 行。
- [ ] LLM 關閉與開啟時的既有測試、規則上架、交易房與發布流程全部通過。
- [ ] 不新增使用者可見的文字、按鈕、設定或行為改變。
- [ ] 不新增測試框架或第二套 API stub；沿用既有斷層。
- [ ] `npm test` 全綠。
