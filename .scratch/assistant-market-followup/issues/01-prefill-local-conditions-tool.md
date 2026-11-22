# 01: 在地天氣／海況預填工具（`LLM_PREFILL_TOOL`）

**What to build:** 在地天氣／海況由後端直接執行在地工具並預填結果，省一次模型決策回合。預設關閉，`LLM_PREFILL_TOOL=true` 開啟；只在後端已能決定在地模式與縣市／海域時預填，`web_search`／`search_products` 仍由模型產生查詢或魚種。預填執行受同一個回覆期限約束。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 新增 `LLM_PREFILL_TOOL` 環境變數（預設關閉），寫入 `README.md` 與 `backend/README.md`。
- [x] 工具迴圈在地工具被強制且 context 就緒時，先執行工具並預填結果。
- [x] 新增測試 `ai-prefill-tool.test.js`：開啟時只呼叫模型一次、`tool_results.local` 有資料；關閉時維持兩次呼叫。
- [x] 補同步 `docs/spec/05-api.md`（環境變數清單）與 `03-flows.md`（移除「沒有環境變數可調」的過時敘述）。
- [x] 逾時防護：預填前已有「剩餘時間用盡即回 `LLM_TIMEOUT`」防護，並由迴圈層級 deadline 檢查兜底；此極端時序在 HTTP seam 無假時鐘可穩定重現，不另寫 flaky 測試。

## Comments

- 2026-11-22：實作已存在於工作樹（未提交），核心流程與測試已就緒；docs/spec 已補同步，逾時邊界採「程式防護＋既有 deadline 檢查」而非 flaky 測試。
