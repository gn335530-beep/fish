# 04: 接上 Postgres：啟動、測試 client 與商品／認證共用邏輯

**What to build:** 讓 app 以顯式 async 初始化連上 Postgres，並把測試 client／fixture 改為使用 Postgres 測試庫。同時把認證、會員、商品可售與狀態推導等共用邏輯改成非同步。完成後，登入、註冊、個人檔案與商品讀寫可在 Postgres 上端到端運作。

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] app 啟動流程為：建立連線池 → 套 migration → 同步市場對照 → 正規化商品 → 才開始接收請求
- [ ] 伺服器與測試 client 都會 await 初始化完成才 `listen`
- [ ] 測試 client／fixture 改為建立獨立 Postgres 測試庫、套 migration、灌 fixture，結束時清理
- [ ] 認證、會員、商品可售／狀態推導、商品與訂單查詢等共用邏輯改為 async
- [ ] 登入、註冊、讀寫個人檔案、建立商品、讀取商品與上架紀錄端到端可用
- [ ] 已轉換路徑不再使用 lowdb
- [ ] 這是整合分支的第一個批次；尚未轉換的模組可能仍壞，整合綠燈在 ticket 10
