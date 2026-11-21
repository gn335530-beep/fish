# 04: 前後端 intent 常數對應文件化

**What to build:** 前後端 intent 常數各別維護（受前後端模組系統隔離限制，本批不做完全單一來源）。在兩處加互相指向的註記，說明對應關係與「改一邊要同步另一邊」，避免未來改動漏同步。無行為變化。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 後端 intent 常數處與前端 intent 常數處各加互相指向的註記。
- [x] 註記標明：intent 集合、平台意圖、回覆意圖，以及草稿欄位清單的對應。
- [x] 無行為變化；`npm test` 全綠（844/848；4 個失敗為 `market-cli.test.js` 的既有失敗，與本批無關），所有檔案 ≤ 200 行。

## Comments

- 2026-11-22：在 `backend/lib/ai/validate.js` 與 `frontend/assets/js/demo/ai/intents.js` 各加互相指向的註記，標明 intent 集合／平台意圖／回覆意圖的對應，以及 `EDIT_FIELDS` 與 `DRAFT_SLOTS` 的重疊欄位。純註記，無行為變化。
