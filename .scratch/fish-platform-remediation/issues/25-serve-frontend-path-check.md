# 25: 靜態伺服器路徑逃逸檢查

**What to build:** 靜態伺服器只提供前端根目錄內的檔案，`..` 或同前綴的目錄不能逃出根目錄。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 請求 `/../package.json` 與 `frontend-evil/x` 被拒。
- [x] 正常檔案與目錄的 index 仍可取得。
- [x] 新增 `frontend/test/serve-frontend.test.js`，由 `npm test` 涵蓋。
- [x] `tools/serve-frontend.js` ≤ 200 行。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R9」。

## Comments

- 2026-10-27 完成。`tools/serve-frontend.js` 抽出 `resolveFile(root, rawUrl)`，用 `path.resolve` 後再以 `path.relative` 判斷是否逃出根目錄；`..`、同前綴的 `frontend-evil`、編碼過的 `%2e%2e`、NUL 與損壞的百分比編碼都回 403，正常檔名（含 `..safe.txt`）與目錄 index 仍可取得。新增 `createServer(root)` 並以 `require.main` 控制自動 listen，讓測試可以在暫存根目錄啟動伺服器。
- 2026-10-27：`frontend/test/serve-frontend.test.js` 涵蓋正常檔案、目錄 index、上層逃逸、同前綴目錄與編碼／NUL 案例；`npm test` 全綠。
