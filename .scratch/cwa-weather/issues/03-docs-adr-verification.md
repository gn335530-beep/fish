# 03: 文件、ADR 與真實 API 驗收

**What to build:** 用 ADR-0014 記錄「天氣改 CWA、海況維持 Open-Meteo、CWA 失敗不 fallback」，更新 ADR-0013 的交叉引用與資料來源描述，同步 spec、API／UI 文件、README 與 `GLOSSARY.md`。用真實 `CWA_API_KEY` 對中央氣象署預報與自動氣象站做一次手動 smoke test，確認天氣回答、目前氣溫、來源請求與失敗文案；跑完整測試並檢查檔案行數。

**Blocked by:** 01、02（CWA 官方天氣預報、自動氣象站目前氣溫）。

**Status:** resolved

- [x] 新增 ADR-0014，記錄決策、取捨、替代方案與隱私影響。
- [x] 更新 ADR-0013 的交叉引用與天氣資料來源描述，不再說天氣使用 Open-Meteo。
- [x] 同步 spec、API／UI 文件、根目錄與 backend README：天氣使用 `F-D0047-091`＋`O-A0001-001`，海況仍用 Open-Meteo，CWA 失敗不 fallback。
- [x] 更新 `GLOSSARY.md` 的天氣與目前氣溫定義；不要加入實作細節。
- [x] 真實 `CWA_API_KEY` 手動 smoke test：今天天氣、指定縣市、來源請求、預報失敗或觀測失敗的可預期文案。
- [x] `npm test` 全綠；測試不呼叫真實 Gemini、Tavily、Open-Meteo 或 CWA。
- [x] 檢查所有新增與修改的程式碼檔案不超過 200 行。
- [x] 搜尋文件與程式，確認沒有殘留「天氣使用 Open-Meteo」或「CWA 失敗 fallback 回 Open-Meteo」的過時描述。

## Comments

- 2026-11-21：由 `cwa-weather` spec 拆分。
- 2026-11-21：完成。新增 ADR-0014；ADR-0013 與 ADR-0011 的天氣資料來源、隱私與交叉引用已更新。流程、API、UI、根目錄與 backend README、`GLOSSARY.md` 已同步為「天氣 F-D0047-091＋O-A0001-001、海況 Open-Meteo、CWA 失敗不 fallback」。
- 2026-11-21：真實 `CWA_API_KEY` smoke test（工具層）：高雄市與花蓮縣均取得 7 日預報、今日高低溫／降雨／風與自動氣象站目前氣溫（高雄市新興 20.5°C、花蓮 18.5°C，附觀測時間）；來源列中央氣象署天氣預報與自動氣象站觀測。缺金鑰回「查不到即時天氣」；預報 1ms 逾時為 `UPSTREAM_TIMEOUT`，文案同上；觀測使用無效金鑰為 `UPSTREAM_UNAVAILABLE`，僅觀測失敗時會補「目前氣溫暫無資料」。
- 2026-11-21：`npm test` 789 全綠；測試不呼叫真實 Gemini、Tavily、Open-Meteo 或 CWA。新增與修改的程式碼檔案最大 200 行（`validate.js`），其餘皆低於上限。文件與程式搜尋只剩歷史 `.scratch/local-conditions` ticket 提到舊的 Open-Meteo 天氣；現行文件與程式的 Open-Meteo 描述均限海況／海域天氣，並明確寫出不 fallback。
