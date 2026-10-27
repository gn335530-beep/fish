# 26: 分離種子資料與執行時資料庫

**What to build:** 倉庫只保留一份可提交的種子資料；執行時使用被 gitignore 的資料庫檔（或由環境變數指定），啟動時若執行時檔不存在就從種子建立。跑後端、行情抓取與一般開發操作不再讓 tracked 檔案變髒。

**Blocked by:** 10（清理 `db.json` 種子資料）

**Status:** resolved

- [x] 新增可提交的種子檔（例如 `backend/db.seed.json`），內容是 10 清理後的示範資料。
- [x] 執行時資料庫預設為 gitignored 的 `backend/db.json`（或 `FISHMATCH_DB` 指定的路徑）；首次啟動時從種子建立。
- [x] 啟動、行情抓取與開發操作後，`git status` 不再出現 `db.json` 變更。
- [x] 測試仍使用各自的暫存資料庫，不會讀寫開發資料。
- [x] `README.md`、`backend/README.md` 說明種子與執行時資料的差別，以及如何重置。
- [x] 既有 `db.json` 若已被追蹤，需從版控移除並加進 `.gitignore`；必要時提供遷移說明。
- [x] `npm test` 全綠；相關檔案 ≤ 200 行。

**Source:** 2026-10-27 對 10 的決定；計畫外後續票。

## Comments

- 2026-10-27 完成。`backend/db.seed.json` 由版控中清理後的 `db.json` 複製而來；`backend/db.json` 以 `git rm --cached` 移出版控並加入根目錄 `.gitignore`，本機既有檔案保留為執行時資料，不需遷移。新增 `lib/db-file.js` 的 `ensureDatabase`，`app.js` 啟動時若 `FISHMATCH_DB`（預設 `backend/db.json`）不存在就從 seed 建立，已存在則不覆寫。`npm run market:fetch` 也經由 `require("../app")` 使用同一套初始化。
- 2026-10-27：新增 `backend/test/db-seed.test.js`（首次建立、已存在不覆寫、建立父目錄）；`README.md`、`backend/README.md` 與 `docs/spec/04-data-model.md` 說明種子／執行時差異與重置方式。`npm test` 323 個測試全綠；`backend/db.seed.json` 是資料檔，不列入程式碼 200 行限制。
