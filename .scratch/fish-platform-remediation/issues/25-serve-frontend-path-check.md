# 25: 靜態伺服器路徑逃逸檢查

**What to build:** 靜態伺服器只提供前端根目錄內的檔案，`..` 或同前綴的目錄不能逃出根目錄。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 請求 `/../package.json` 與 `frontend-evil/x` 被拒。
- [ ] 正常檔案與目錄的 index 仍可取得。
- [ ] 新增 `frontend/test/serve-frontend.test.js`，由 `npm test` 涵蓋。
- [ ] `tools/serve-frontend.js` ≤ 200 行。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R9」。
