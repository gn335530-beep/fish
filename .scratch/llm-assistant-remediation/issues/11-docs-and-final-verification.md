# 11: 文件同步與最終驗收

**What to build:** 所有文件與實際行為一致，完整測試、200 行限制與人工驗收清單都通過。這是修正工作的整合驗收，不新增功能。

**Blocked by:** 01、02、03、04、05、06、07、08、09、10

**Status:** resolved

- [x] 領域文件的卡片種類補上 `sources`：最多 3 個 `{ title, url }`，只由後端的 `web_search` 結果產生。
- [x] API、流程與 UI 文件對 `CHAT`／`WEB`、來源卡、重試錨定與逾時的描述一致。
- [x] `GLOSSARY.md` 與兩份 README 沒有與行為矛盾的說法；環境變數只列支援項目。
- [x] `npm test` 全綠；既有 `assistant-offline` e2e 不退化。
- [x] 所有修改的程式碼檔案不超過 200 行。
- [x] 人工驗收清單通過：一般文字不被誤遮、個資格式被遮蔽、重試錨定、接近 500 字回覆、行情逾時 fallback、來源卡、商品推薦路由。
- [x] 確認交易房完全不呼叫 LLM，靜默 fallback 與配額重試行為不變。

## Comments

- 2026-11-15：`npm test` 652 通過；`npx playwright test e2e/tests/assistant-offline.spec.js` 2 通過（desktop／mobile）。人工核對：一般文字保留與個資遮蔽、重試錨定、495 字推薦、行情逾時 fallback、`CHAT` 升級 `WEB` 來源卡、`BUY`＋`PRODUCT_RECOMMEND` 路由皆由端點／前端測試覆蓋；交易房與 LLM 關閉行為由 `assistant-offline` e2e 覆蓋。所有修改檔案 ≤ 200 行。環境變數只保留 `LLM_ENABLED`、`GEMINI_API_KEY`、`LLM_MODEL`、`LLM_TIMEOUT_MS`、`LLM_WEB_SEARCH`、`TAVILY_API_KEY`、`LLM_SEARCH_TIMEOUT_MS`。
