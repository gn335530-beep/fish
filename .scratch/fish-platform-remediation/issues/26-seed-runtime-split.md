# 26: 分離種子資料與執行時資料庫

**What to build:** 倉庫只保留一份可提交的種子資料；執行時使用被 gitignore 的資料庫檔（或由環境變數指定），啟動時若執行時檔不存在就從種子建立。跑後端、行情抓取與一般開發操作不再讓 tracked 檔案變髒。

**Blocked by:** 10（清理 `db.json` 種子資料）

**Status:** ready-for-agent

- [ ] 新增可提交的種子檔（例如 `backend/db.seed.json`），內容是 10 清理後的示範資料。
- [ ] 執行時資料庫預設為 gitignored 的 `backend/db.json`（或 `FISHMATCH_DB` 指定的路徑）；首次啟動時從種子建立。
- [ ] 啟動、行情抓取與開發操作後，`git status` 不再出現 `db.json` 變更。
- [ ] 測試仍使用各自的暫存資料庫，不會讀寫開發資料。
- [ ] `README.md`、`backend/README.md` 說明種子與執行時資料的差別，以及如何重置。
- [ ] 既有 `db.json` 若已被追蹤，需從版控移除並加進 `.gitignore`；必要時提供遷移說明。
- [ ] `npm test` 全綠；相關檔案 ≤ 200 行。

**Source:** 2026-10-27 對 10 的決定；計畫外後續票。
