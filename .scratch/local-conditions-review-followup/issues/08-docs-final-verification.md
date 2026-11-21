# 08: 文件同步與最終驗證

**What to build:** 流程規格、API 規格、ADR-0013、`GLOSSARY.md` 與 README 與新行為一致；完整測試全綠；所有新增與修改的程式碼檔案不超過 200 行；spec 的驗收範例逐項可重現。

**Blocked by:** 01、02、03、04、05、06、07

**Status:** resolved

- [x] 流程規格寫清楚哪些問題需要縣市、哪些只需網路、一般新聞沒有縣市時不反問、「最新」不再單獨觸發縣市。
- [x] timeout 分工與程式一致：模型／行情逾時回 `LLM_TIMEOUT`；國外天氣網路逾時回 `handled:true` 的「查不到」；在地氣象、海況、潮汐逾時回缺少資料說明或「潮汐暫無資料」。
- [x] ADR-0013、`GLOSSARY.md`、API 文件與 README 沒有過時的在地新聞、國外天氣逾時或潮汐降級描述。
- [x] `npm test` 全綠；測試不呼叫真實 Gemini、Tavily、Open-Meteo 或 CWA。
- [x] 新增與修改的程式碼檔案都不超過 200 行。
- [x] spec 的驗收範例逐項通過。

## Comments

- 2026-11-21：完成。最終檢查 `npm test` 778 全綠；新增／修改的程式碼檔案最大 200 行（`local-guard.js`），其餘皆低於上限。流程規格、API 規格、ADR-0013、`GLOSSARY.md`、根目錄與後端 README 已同步縣市分類、一般新聞、「最新」、國外天氣逾時、在地數字、潮汐降級與在地模式。驗收範例由 `ai-region-classification.test.js`、`ai-foreign-weather-errors.test.js`、`ai-source-requests-next.test.js`、`ai-tools-tide-degradation.test.js`、`ai-local-number-guard.test.js`、`ai-local-mode.test.js` 與 `frontend/test/ai-intents.test.js` 覆蓋；所有外部服務都以 fake 注入。
