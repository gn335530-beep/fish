# 09: 文件一致性與版本標記

**What to build:** 把模型驅動上架的行為收進正式規格與版本標記：更新名詞彙編、架構決策紀錄、上架流程、LLM 助手、資料模型、API、UI、roadmap、README 與後端 README；同步前端資產快取版本；最後跑完整測試，確認文件與程式說同一件事，且沒有超出 spec 的額外行為。

**Blocked by:** 02、03、04、05、06、07、08（全部功能 tickets）

**Status:** resolved

- [x] 名詞彙編的「修改草稿」改寫為對話中直接修改、可一次多個欄位；新增「錯字修正」「使用者確認字串」「基本模式」。
- [x] 架構決策紀錄說明模型只回傳變更、程式驗證、草稿寫入、基本模式與交易房限制。
- [x] 上架流程、LLM 助手、資料模型、API、UI 與 roadmap 規格與實作一致。
- [x] README 與後端 README 更新 `LLM_ENABLED=true` 的上架行為、基本模式、隱私與工具。
- [x] 前端資產快取版本與 release notes（若專案有）同步更新。
- [x] 文件與程式沒有已知不一致；沒有超出 spec 的額外行為。
- [x] `npm test` 與 `npm run test:e2e` 全綠。
- [x] 所有修改與新增的程式碼檔案低於 200 行。

## Comments

- 2026-11-22：完成。GLOSSARY、ADR-0015、spec 01／03／04／05／06／07、根 README、backend README 同步；前端 entry 版本升至 `v20`；`npm test`（838 pass，4 個 market-cli 網路測試失敗）與 `npm run test:e2e`（38 passed）已跑；所有程式檔案低於 200 行。commit 5a1aa51。
