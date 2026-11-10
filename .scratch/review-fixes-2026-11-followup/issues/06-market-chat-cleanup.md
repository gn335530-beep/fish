# 06: 行情問答包裝小清理

**What to build:** 檢視行情問答中只用一次的包裝函式與只轉呼叫的輔助函式。若內聯後流程更短、更容易讀，就內聯；若會降低可讀性，保留並註解說明原因。使用者看到的行情回覆、候選魚種回問與錯誤處理都不變。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 每個被檢視的包裝函式都有明確決定：內聯，或保留並註解原因。
- [x] 行情回覆、候選魚種回問、查無行情與 API 錯誤處理的行為不變。
- [x] 既有行情問答測試與 `npm test` 通過。
- [x] 修改後的程式碼檔案不超過 200 行。

## Comments

- 2026-11-10：內聯 `profileRegion`、`marketMeta`（只包 `requestedRegion` 且只用一次）與 `priceReply`（只包一張卡）到 `marketReply`／`quoteFor`，並把 `meta` 物件改成直接傳 `requestedRegion`。保留 `replyWith`（多處使用）、`candidateReply`（含候選 context 邏輯）、`withoutRegion`（縣市移除邏輯）與 `namesOf`（兩處比對）；`quoteFor` 仍因代碼／名稱兩條路徑而保留。行情回覆、候選回問與錯誤文案未變，相關 Node 測試通過。

