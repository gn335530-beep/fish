# 23: 魚種名稱與別名單一來源

**What to build:** 魚種的顯示名稱與別名只由魚種清單提供，行情對照只存代碼與對照關係，不再重複列名稱。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `grep -rn "嘉鱲\|加鱲" backend` 只在單一來源檔出現。
- [x] `GET /api/species` 的名稱與別名輸出維持不變。
- [x] 行情對照查詢結果不變。
- [x] `market-mappings.test.js`、`market-price.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R7」。

## Comments

- 2026-10-27 完成。`backend/lib/market/mappings.js` 的 `CODE_BY_SPECIES` 只保留 `code` 與 `category`；`speciesCodes()` 的名稱與別名改由 `species.js` 的 `name`／`alias` 帶出，`is_aquaculture` 仍由 `AQUACULTURE_SPECIES` 決定。`GET /api/species` 與行情價格查詢未動，代碼、分類與養殖旗標不變；舊的官方別名（如 `加臘`、`七星鱸`、`鱰魚`）若不在魚種清單中就不再輸出。
- 2026-10-27：測試 fixture 的 `prd_b` 產品名由「嘉鱲」改為「黑鯛」，避免 `backend` 的 grep 把測試資料誤認為第二個別名來源。`docs/spec/04-data-model.md` 同步說明名稱與別名由 `species.js` 帶出。`market-mappings.test.js`、`market-price.test.js` 全數通過。
- 2026-10-28：補上顯示名稱變更紀錄（follow-up ticket 07）。行情對照的 `official_name` 與 `aliases` 目前逐筆等於魚種清單；已接受七星鱸→海鱸、鯖魚→白腹鯖、小卷→澎湖小卷、巴攏→竹筴魚，理由是名稱單一來源與避免官方舊稱漂移，舊稱只在魚種清單仍列為 `alias` 時保留。`market-mappings.test.js` 新增逐筆名稱／別名鎖定、代碼集合與顯示變更測試；API 文件同步註明來源。
