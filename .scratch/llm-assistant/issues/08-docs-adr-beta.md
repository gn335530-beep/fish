# 08: 文件、ADR 與 beta 收尾

**What to build:** 完成 beta 的文件與驗收收尾：新增 ADR-0011，記錄混合式 LLM 助手、唯讀工具、免費層 beta、Tavily 取捨與未來遷移路徑；GLOSSARY 只新增使用者可見的「資料來源」；Roadmap M6 標記為 beta。更新總覽、流程、資料模型、API、UI、Root README 與 backend README，寫明免費層資料使用、Tavily 每月 1,000 credits、軟啟動不強制名單、不承諾 SLA、缺少金鑰時自動退回規則引擎。E2E 在 `LLM_ENABLED=false` 下確認規則式助手正常、交易房不呼叫 AI。

**Blocked by:** 01、02、03、04、05、06、07.

**Status:** ready-for-agent

- [ ] ADR-0011 記錄混合式 LLM 助手、唯讀工具、免費層 beta、Tavily 取捨與未來升級路徑。
- [ ] `GLOSSARY.md` 只新增「資料來源」，不把 LLM、Tavily、Gemini 等實作名詞放進 glossary。
- [ ] Roadmap M6 標記為 beta，不標記為正式完成。
- [ ] 總覽、流程、資料模型、API、UI、Root README 與 backend README 已同步。
- [ ] README 寫明免費層資料可能被 Google 使用、Tavily 每月 1,000 credits、軟啟動與不承諾 SLA。
- [ ] E2E 在 `LLM_ENABLED=false` 下：上架、找魚、查行情都正常；交易房不呼叫 AI；沒有外部網路請求。
- [ ] spec 第 11 節的驗收情境全部通過。
- [ ] `npm test` 與 `npm run test:e2e` 通過；所有程式碼檔案不超過 200 行。
