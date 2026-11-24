# 03: Async Postgres 資料存取層與交易

**What to build:** 在舊 lowdb 之外，建立新的非同步 Postgres 資料存取層，保留既有函式名稱與語意，並提供交易邊界。新層有自己的測試骨架，可在不接上 app 的情況下獨立驗證。

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] 資料存取層提供 async 版 `all`、`findById`、`insert`、`setAll`、`dropCollection`、`patch`、`remove`、`nextCode`、`nextStableCode`、`nextProductCode`、`bumpStableCode`、`nextNumericId`、`nextSeq`
- [ ] 新增 `transaction(fn)`：成功提交、丟錯回滾、結束釋放連線
- [ ] `all()` 回傳的物件形狀與目前完全相同（`doc` 為唯一事實來源；抽取欄位只是寫入投影）
- [ ] 可讀 ID 維持 `prd_／conv_／msg_／deal_／rev_` 格式；每日流水號在交易內受鎖或唯一約束保護
- [ ] `users.id` 維持整數 max＋1；`messages.seq` 由 Postgres `SEQUENCE` 提供，單調遞增（允許缺口）
- [ ] 每個測試檔取得自己唯一命名的 Postgres 測試庫，套 migration、灌 fixture、結束刪除
- [ ] store 層測試涵蓋 CRUD、可讀 ID、`seq`、交易 commit 與 rollback，全部通過
- [ ] app 仍跑在 lowdb；沒有任何路由接上新層
- [ ] 每個程式碼檔案不超過 200 行
