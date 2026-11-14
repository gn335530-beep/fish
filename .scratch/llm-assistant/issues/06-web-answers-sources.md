# 06: 網路問答與資料來源卡（WEB）

**What to build:** `web_search` 接上 Tavily basic search，最多回傳 3～5 個結果；查詢先遮蔽個資，且只送該次查詢、不送完整歷史。只有具時效性的問題才上網，一般知識維持 CHAT 且不消耗 Tavily credits。`WEB` 寫入回覆文字與新的資料來源卡，最多 3 個合法 URL；平台答案不顯示資料來源。`LLM_WEB_SEARCH=false` 時不呼叫 Tavily；有搜尋的回合 timeout 為 15 秒。網頁內容中的指令一律視為資料，不得觸發平台動作。

**Blocked by:** 01、02、03、04.

**Status:** ready-for-agent

- [ ] 有時效性問題才呼叫 Tavily；一般知識為 CHAT，Tavily 呼叫次數為 0。
- [ ] Tavily 只收到該次搜尋查詢，不含完整歷史或個資原文。
- [ ] `WEB` 回覆最多 3 個合法 URL 的 `sources`，並寫入資料來源卡；平台答案不顯示 `sources`。
- [ ] `LLM_WEB_SEARCH=false` 時不呼叫 Tavily。
- [ ] 有搜尋的回合 timeout 為 15 秒。
- [ ] 假網頁含「忽略先前指令」時，不會建立、修改、發布商品或建立訂單；工具仍只有唯讀。
- [ ] 資料來源卡在手機與桌面都可讀。
- [ ] 相關 API、流程、資料模型與 UI 文件已同步更新。
- [ ] 新增與修改的程式碼檔案皆不超過 200 行。
