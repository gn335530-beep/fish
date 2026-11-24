# 10: 既有測試改跑 Postgres 測試庫（整合綠燈）

**What to build:** 把 83 個既有 backend 測試改成在真 Postgres 測試庫上執行，並補上非同步的 `await` 與新的測試生命週期。既有斷言內容不變；這是整合分支第一個全綠點。

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] `npm test` 在 Postgres 啟動時全數通過；每個測試檔使用獨立測試庫
- [ ] 既有斷言內容不變，只新增 `await`、測試庫初始化與清理
- [ ] 測試不再使用 lowdb 或暫存 `db.json`
- [ ] 交易 commit／rollback 的專注測試就位
- [ ] 文件註明 `npm test` 的前置條件是先啟動 compose 的 db
- [ ] 測試執行時間可接受，且測試檔可平行執行不相污
