# 07: 文件核對與最終驗收

**What to build:** 助手房 LLM Beta 第二輪修正完成後，行為、文件與用詞一致，且可以直接交付。這一張只做核對與收尾，不新增功能。

**Blocked by:** 01（個資遮蔽）、02（用詞與文件一致）、03（共用期限工具）、04（前端共用流程）、05（路由分檔）、06（共用 fixture）

**Status:** resolved

- [x] 後端與前端測試全綠；在最終回覆列出實際執行的指令與結果。
- [x] 以假 provider 驗證遮蔽案例清單：一般句子保持原樣，電話、Email、身分證與地址被遮蔽。
- [x] 已移除的環境變數不改變任何行為，回歸測試有註解說明。
- [x] 每個程式碼檔案不超過 200 行。
- [x] 規格、領域詞彙表、ADR 與兩份 README 與實際行為一致；逐項列出人工核對結果。
- [x] 使用者可見字串不再出現「聊天室」，也不再把「地址」列為設定欄位。
- [x] ADR-0011 維持凍結；本次行為若有新增細節，記錄在流程或 API 文件。
- [x] 工作區不含與本修正無關的對話刪除變更，或已分開提交。

## Comments

- 2026-11-15：最終驗收完成。
  - `npm test`：675 項通過、0 失敗。
  - `node --test backend/test/ai-reply-redaction.test.js backend/test/ai-tools-web-redaction.test.js`：3 項通過；一般句子保留，`+886` 手機／市話、括號與 4 碼區碼、Email、身分證、行政區錨點地址皆換成 `[已遮蔽]`。
  - `node --test backend/test/ai-reply-history.test.js backend/test/ai-tools-market.test.js`：11 項通過；`LLM_HISTORY_LIMIT=30` 與 `LLM_MAX_TOOL_CALLS=5` 不改變固定 10 則／2 次工具呼叫。
  - 掃描 `backend/lib`、`backend/routes`、`backend/test`、`backend/scripts`、`frontend/assets/js`、`frontend/test`、`e2e`、`tools` 的 JS 檔，沒有超過 200 行者。
  - 文件核對：`GLOSSARY.md` 的資料來源只留使用者可見描述；`docs/spec/03-flows.md`、`05-api.md`、`07-roadmap.md` 與兩份 README 的遮蔽、期限、強制工具與 beta 狀態一致；`docs/adr/0011-hybrid-llm-assistant.md` 與 a501804 無差異；ADR-0012 使用「對話」。
  - 使用者可見字串：`frontend/pages/settings.html` 與設定模組沒有地址欄位；前端與文件的使用者可見文字沒有「聊天室」。
  - 工作區已無未提交變更；先前既有的對話刪除變更已包含在 `3141489`，該 commit 訊息已註明混合內容，未另拆 commit。
