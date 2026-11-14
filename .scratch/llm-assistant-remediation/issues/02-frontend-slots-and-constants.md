# 02: 前端信任後端 slots 與共用常數

**What to build:** 前端不再重複驗證後端已經驗證過的 slots，刪除重複的數字來源檢查；intent 分支改用共用常數；使用者文字與回覆來源使用不同名稱；AI 測試共用同一份 API stub 與 fixture。使用者行為不變。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 前端不再另行過濾、改寫或重新驗證後端回傳的 slots；規則引擎自己的 slot 抽取仍保留。
- [x] intent 分支使用匯出的常數，不再出現裸字串或同一組 cascade 重複三次。
- [x] 使用者文字與回覆來源的變數命名分離，閱讀時不會把兩者搞混。
- [x] 等待計數的函式名稱能說明它增加的是 AI 等待中的回覆數。
- [x] 前端 AI 測試共用 API stub、訊息 factory 與使用者 fixture；既有行為斷言不變。
- [x] 所有新增或修改的程式碼檔案不超過 200 行；`npm test` 全綠。
