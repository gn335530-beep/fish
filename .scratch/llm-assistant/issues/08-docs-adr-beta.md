# 08: 文件、ADR 與 beta 收尾

**What to build:** 完成 beta 的文件與驗收收尾：新增 ADR-0011，記錄混合式 LLM 助手、唯讀工具、免費層 beta、Tavily 取捨與未來遷移路徑；GLOSSARY 只新增使用者可見的「資料來源」；Roadmap M6 標記為 beta。更新總覽、流程、資料模型、API、UI、Root README 與 backend README，寫明免費層資料使用、Tavily 每月 1,000 credits、軟啟動不強制名單、不承諾 SLA、缺少金鑰時自動退回規則引擎。E2E 在 `LLM_ENABLED=false` 下確認規則式助手正常、交易房不呼叫 AI。

**Blocked by:** 01、02、03、04、05、06、07.

**Status:** resolved

- [x] ADR-0011 記錄混合式 LLM 助手、唯讀工具、免費層 beta、Tavily 取捨與未來升級路徑。
- [x] `GLOSSARY.md` 只新增「資料來源」，不把 LLM、Tavily、Gemini 等實作名詞放進 glossary。
- [x] Roadmap M6 標記為 beta，不標記為正式完成。
- [x] 總覽、流程、資料模型、API、UI、Root README 與 backend README 已同步。
- [x] README 寫明免費層資料可能被 Google 使用、Tavily 每月 1,000 credits、軟啟動與不承諾 SLA。
- [x] E2E 在 `LLM_ENABLED=false` 下：上架、找魚、查行情都正常；交易房不呼叫 AI；沒有外部網路請求。
- [x] spec 第 11 節的驗收情境全部通過。
- [x] `npm test` 與 `npm run test:e2e` 通過；所有程式碼檔案不超過 200 行。

## Comments

- 2026-11-14：新增 `docs/adr/0011-hybrid-llm-assistant.md`，記錄混合式助手、唯讀工具、免費層 soft launch、Tavily 取捨與付費層／Google Search grounding 遷移路徑。`GLOSSARY.md` 維持只有使用者可見的「資料來源」。Roadmap M6 改為「Beta，🟡 軟啟動」並新增 AC-58（配額與重試）、AC-59（beta 文件）。同步更新總覽、F13 流程、資料模型（配額提示是 transient，不寫入訊息）、API、UI、spec README、Root README、backend README、API README 與 E2E README。新增 `e2e/tests/assistant-offline.spec.js`，在 `LLM_ENABLED=false` 下驗證規則式找魚、行情、上架、端點回 `LLM_DISABLED`，以及種子交易房送訊息不呼叫 AI；`playwright.config.js` 明確設定測試後端 `LLM_ENABLED=false`。`npm test` 638 通過、`npm run test:e2e` 38 通過；程式碼檔案皆 ≤ 200 行。
