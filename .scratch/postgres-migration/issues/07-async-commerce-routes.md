# 07: 商業路由改 async

**What to build:** 把認證、會員、商品、商品生命週期、對話、訊息、對話刪除、訂單、訂單項目、提案、回應與評價的 HTTP 路由全部改為 await 非同步資料存取。

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] 所有商業路由的 handler 改為 async，並 await 資料存取層與共用邏輯
- [ ] 逾時掃描在讀取商品、對話清單與訂單時以 await 執行
- [ ] API 路徑、請求與回應格式、狀態碼、錯誤碼全部不變
- [ ] 聊天輪詢的 `after_seq` 增量行為不變
- [ ] 這是整合分支的批次；整合綠燈在 ticket 10
