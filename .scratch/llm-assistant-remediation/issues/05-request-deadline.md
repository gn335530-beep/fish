# 05: 單一請求期限與行情逾時

**What to build:** 助手回覆在承諾期限內完成或靜默 fallback。一般回覆 8 秒、含網路搜尋的回合 15 秒；行情查詢也共用同一個期限，市場上游變慢時不會讓使用者一直等待。

**Blocked by:** 01（後端 AI service 拆分與錯誤一致化）

**Status:** resolved

- [x] 一般回覆的總期限是 8 秒；該輪執行 `web_search` 後總期限延長為 15 秒。
- [x] 期限同時套用到 provider 呼叫與每一個工具執行；剩餘時間不足時不再呼叫下游。
- [x] 行情工具把剩餘時間傳給行情查詢與上游抓取，上游請求出現在期限內被中止。
- [x] 行情上游逾時回報 `LLM_TIMEOUT` 並靜默 fallback，不是一般的 `LLM_UPSTREAM_ERROR`。
- [x] 端點測試用延遲的假行情上游，斷言端點在期限內回 `handled:false`、`error_code:"LLM_TIMEOUT"`。
- [x] 靜默 fallback、配額提示與重試按鈕行為不變。
- [x] 文件同步一般回覆與網路回合的逾時關係。
