# 03: 平台意圖與槽位合併

**What to build:** LLM 回傳 `SELL`、`BUY`、`MARKET`、`CANCEL`、`EDIT` 時，前端把 slots 合併進既有上架、導購、行情、取消與修改流程。平台意圖不產生重複的 LLM 文字；一句話同時包含平台意圖與其他問題時，只處理平台意圖。上架流程進行中仍呼叫 AI 端點，但規則優先；若 AI 回傳 `CHAT` 或 `WEB`，忽略 LLM 文字並繼續上架。平台數字（價格、尾數）必須來自使用者訊息或工具結果，否則整則回覆丟棄並 fallback。

**Blocked by:** 01、02.

**Status:** resolved

- [x] 「我要賣花枝 2 尾 放血冰鎮」只追問缺少的非價格欄位，不重問已提供的魚種、尾數或處理方式。
- [x] 明確行情、找魚、取消上架與修改草稿都由既有規則完成，不寫入重複的 AI 文字。
- [x] 一句話同時有賣魚與其他問題時，只處理平台意圖，其他問題不在同一輪回答。
- [x] 上架流程進行中，AI 回傳 `CHAT`／`WEB` 時忽略文字並繼續上架；`EDIT`／`SELL`／`CANCEL` 等平台意圖仍可協助。
- [x] 假 LLM 產生不存在的價格或庫存時回 `LLM_GUARD_REJECTED`，前端 fallback，不寫入訊息。
- [x] 不同助手房的草稿與 context 不混用。
- [x] 相關流程與 API 文件已同步更新。
- [x] 新增與修改的程式碼檔案皆不超過 200 行。

## Comments

- 2026-11-14：新增 `demo/ai/llm.js` 路由平台意圖；`SELL` 會把已驗證的 slots 合併進草稿再走既有追問，`BUY`／`MARKET`／`CANCEL`／`EDIT` 交給既有規則，不寫 LLM 文字。上架進行中規則優先，`CHAT`／`WEB` 文字忽略；`EDIT` 使用既有逐欄修改流程。後端 `LLM_GUARD_REJECTED` 不寫訊息，前端只跑 fallback。`frontend/test/ai-intents.test.js` 覆蓋 slots、重複文字、複合意圖、上架中側聊、修改與防護 fallback。
