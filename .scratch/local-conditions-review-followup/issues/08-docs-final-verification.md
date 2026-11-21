# 08: 文件同步與最終驗證

**What to build:** 流程規格、API 規格、ADR-0013、`GLOSSARY.md` 與 README 與新行為一致；完整測試全綠；所有新增與修改的程式碼檔案不超過 200 行；spec 的驗收範例逐項可重現。

**Blocked by:** 01、02、03、04、05、06、07

**Status:** ready-for-agent

- [ ] 流程規格寫清楚哪些問題需要縣市、哪些只需網路、一般新聞沒有縣市時不反問、「最新」不再單獨觸發縣市。
- [ ] timeout 分工與程式一致：模型／行情逾時回 `LLM_TIMEOUT`；國外天氣網路逾時回 `handled:true` 的「查不到」；在地氣象、海況、潮汐逾時回缺少資料說明或「潮汐暫無資料」。
- [ ] ADR-0013、`GLOSSARY.md`、API 文件與 README 沒有過時的在地新聞、國外天氣逾時或潮汐降級描述。
- [ ] `npm test` 全綠；測試不呼叫真實 Gemini、Tavily、Open-Meteo 或 CWA。
- [ ] 新增與修改的程式碼檔案都不超過 200 行。
- [ ] spec 的驗收範例逐項通過。
