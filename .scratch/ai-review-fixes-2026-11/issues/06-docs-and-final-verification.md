# 06: 文件同步與最終驗證

**What to build:** 同步本批契約變更到既有文件，並做最終驗證。更新 llm-listing spec 的修正契約（corrections 只限魚種與處理方式）與 conversation context 欄位（回問計數）；更新資料模型 spec 的 context 欄位；必要時更新 GLOSSARY。回寫本批 tickets 完成註記。

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] llm-listing spec 的修正契約與 context 欄位已同步。
- [ ] 資料模型 spec 的 context 欄位已同步。
- [ ] GLOSSARY 若需要新詞彙（回問次數）已補上，否則註明不需新增。
- [ ] `npm test` 全綠；E2E offline 與快取版本檢查未退化。
- [ ] 所有程式檔案 ≤ 200 行。

## Comments
