# 09: 文件、ADR、詞彙表與 beta 隱私揭露

**What to build:** 新增 ADR-0013（助手使用設定縣市、在地氣象／海況、來源預設隱藏）；更新 `GLOSSARY.md`（天氣、海況、潮汐、海域、縣市、資料來源）；同步 spec 01–07、API 文件、根目錄與 backend README；補上 `CWA_API_KEY` 申請方式，以及縣市會傳給 Gemini／Open-Meteo／CWA／Tavily 的隱私說明。

**Blocked by:** 01–08（全部功能 ticket）.

**Status:** resolved

- [x] ADR-0013 記錄決策、取捨與替代方案。
- [x] `GLOSSARY.md` 新增天氣、海況、潮汐、海域；更新縣市與資料來源的定義。
- [x] spec 01–07 與 API／UI 文件一致：天氣只回天氣、海況含潮汐、來源預設隱藏、要求才顯示。
- [x] 根目錄與 backend README 說明 `CWA_API_KEY`、Open-Meteo、隱私揭露與 beta 限制。
- [x] 移除或改寫「CHAT 永遠不帶來源」「WEB 一定顯示來源」等過時描述。
- [x] 檢查所有新舊文件沒有把天氣與海況寫成同一件事。
- [x] 文件審閱清單完成；沒有遺漏的過時描述。

## Comments

- 2026-11-20：由 `local-conditions` 設計拆分。
- 2026-11-21：完成。新增 ADR-0013（設定縣市、Open-Meteo／CWA、海域對照、來源預設隱藏與來源請求）；GLOSSARY 增補天氣、海況、潮汐、海域與釣魚建議，更新縣市與資料來源。spec 01–07、API／UI 文件、根目錄與 backend README 已同步來源請求、國外地點天氣、CWA 申請方式與 Gemini／Open-Meteo／CWA／Tavily 隱私揭露。
