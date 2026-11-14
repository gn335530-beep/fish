# 04: 官方行情工具與工具呼叫骨架

**What to build:** 建立通用的唯讀工具呼叫流程，每輪最多 2 次工具呼叫，工具結果一律視為不可信資料，且沒有任何寫入工具。`get_market_price` 包裝既有官方行情服務，只使用官方平均價與交易日期。LLM 在比較、跨魚種或規則無法解析的行情問題中取得官方數字；有資料時在 CHAT 回覆文字後附既有行情卡，查無資料時只說「暫無行情」且不得出現任何價格數字。

**Blocked by:** 01、02、03.

**Status:** resolved

- [x] 每輪最多 2 次工具呼叫；超過時停止並 fallback。
- [x] `get_market_price` 只使用官方行情服務的平均價與交易日期；模型文字不能覆蓋工具結果。
- [x] 有行情時 CHAT 回覆文字後附既有行情卡；查無資料時只說「暫無行情」，不得出現價格數字。
- [x] 假 LLM 自行產生行情數字時被 guard 拒絕。
- [x] 明確的行情意圖仍走既有規則與行情卡，不被 LLM 工具取代。
- [x] log 記錄工具名稱、耗時與錯誤碼，不記工具結果內容。
- [x] 相關 API、流程與 UI 文件已同步更新。
- [x] 新增與修改的程式碼檔案皆不超過 200 行。

## Comments

- 2026-11-14：新增 `lib/ai/tools/` 與服務端工具迴圈，`LLM_MAX_TOOL_CALLS` 預設 2；`get_market_price` 包裝既有行情服務，行情資料只從工具結果進入 `tool_results.market`。CHAT 文字後由前端附行情卡；工具結果與模型文字都受數字防護。log 加入工具名稱、耗時與錯誤碼，不含結果內容。測試見 `backend/test/ai-tools-market.test.js`、`frontend/test/ai-tool-cards.test.js`。
