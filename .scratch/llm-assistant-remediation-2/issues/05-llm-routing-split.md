# 05: AI 路由與平台回覆分檔

**What to build:** AI 路由模組只負責 intent 優先序、上架流程中的特殊處理與 origin 判斷；平台意圖（賣魚、找魚、行情、取消、修改）的處理與共用重置文案各自獨立。對外介面不變，既有行為與測試不受影響。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 路由模組只保留上下文正規化、規則與 LLM intent 的優先序、上架流程進行中的處理、商品推薦與回覆 intent 判斷，以及最終 fallback。
- [x] 平台意圖處理獨立成模組，輸入與 `{ origin, result }` 輸出介面與現在一致。
- [x] 重置文案只有一份，路由模組與既有規則服務共用。
- [x] 對外函式簽名不變；呼叫端與既有測試不需要修改即可通過。
- [x] 所有新增或修改的程式碼檔案不超過 200 行。

## Comments

- 2026-11-15：新增 `platform.js`（賣魚、找魚、行情、取消、修改）、`llm-slots.js`（slot 挑選）、`texts.js` 與 `reset.js`（共用重置文案與回覆）；`llm.js` 只保留 intent 優先序、上架流程、推薦／回覆 intent 與 fallback。`handleMessage` 簽名與輸出不變。
