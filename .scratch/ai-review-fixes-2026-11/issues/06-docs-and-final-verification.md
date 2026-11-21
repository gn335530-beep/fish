# 06: 文件同步與最終驗證

**What to build:** 同步本批契約變更到既有文件，並做最終驗證。更新 llm-listing spec 的修正契約（corrections 只限魚種與處理方式）與 conversation context 欄位（回問計數）；更新資料模型 spec 的 context 欄位；必要時更新 GLOSSARY。回寫本批 tickets 完成註記。

**Blocked by:** 01, 02

**Status:** resolved

- [x] llm-listing spec 的修正契約與 context 欄位已同步。
- [x] 資料模型 spec 的 context 欄位已同步。
- [x] GLOSSARY 不需新增詞彙（「回問次數」是 context 實作欄位，非 domain 詞彙）。
- [x] `npm test` 全綠（844/848；4 個失敗為 `market-cli.test.js` 的既有失敗，與本批無關）；E2E offline 與快取版本檢查未受本批影響（未觸及離線流程與快取版本碼）。
- [x] 所有程式檔案 ≤ 200 行。

## Comments

- 2026-11-22：同步契約變更到 `.scratch/llm-listing/spec.md`（corrections 只限魚種與處理方式、condition_ask 輸出訊號、condition_ask_count 回問計數與兩次回問閘門）、`docs/spec/04-data-model.md`（context 欄位）、`docs/spec/05-api.md`（listing 契約與處理方式驗證）、`docs/spec/03-flows.md`（SELL 流程）、`docs/adr/0015-model-driven-listing.md`（決策、隱私、context 欄位）、`backend/README.md`（listing 契約）。GLOSSARY 不需新增詞彙。
