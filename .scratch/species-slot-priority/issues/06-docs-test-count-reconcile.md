# 06: 文件同步：測試檔數目修正

**What to build:** 把 `docs/spec/07-roadmap.md` 風險表與 `.scratch/postgres-migration/spec.md` 中互相矛盾、且與現況不符的測試檔數目，改成一致且正確，或改以質化描述取代易漂移的數字。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 兩份文件的測試檔數目一致
- [x] 數字與實際 `*.test.js` 檔數相符（或改為質化描述、不再硬編數字）
- [x] 移除「兩處各自寫一組不同數字」的矛盾

## Comments

2026-11-24 完成。選擇質化描述，避免數字再漂移：roadmap 風險表移除「backend 90 檔、frontend 73 檔」；postgres-migration spec 的 Solution 與 User Story 35 將「152 個測試檔（backend 83、frontend 69）」改為「既有全部測試檔（backend 與 frontend）」。全 repo 已無這兩組舊數字。
