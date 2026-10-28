# 09: 後端收斂與舊資料遷移

**What to build:** 後端完全改用官方代碼模型。商品移除 `species_id` 與 `species_latin`，舊商品啟動時清空舊欄位並保留 `fish_species`；行情資料與抓取狀態以代碼為鍵；舊魚種模組、路由、端點與對照集合全部移除；CLI 可用代碼或名稱查行情。

**Blocked by:** 03, 06, 07, 08

**Status:** resolved

- [x] 啟動後既有商品不再有 `species_id` 與 `species_latin`，`fish_species` 保留，`species_code` 為空。
- [x] 商品建立與讀取不再包含 `species_id` 與 `species_latin`。
- [x] 行情價格與抓取狀態以 `species_code` 為唯一鍵，不再有 `species_id`。
- [x] 舊魚種路由與舊行情對照端點已移除，呼叫時回 404。
- [x] 舊魚種對照集合已移除，不再於啟動時同步。
- [x] 行情 CLI 可用官方代碼查詢，也可用名稱先查代碼。
- [x] 舊魚種模組不再被任何後端程式引用。
- [x] 後端與前端測試全數通過。
- [x] 所有程式碼檔案不超過 200 行。

## Comments

2026-10-29 完成。刪除 `backend/lib/species.js`、`backend/routes/species.js` 與魚種對照 `mappings.js`；市場對照移到 `lib/market/markets.js`。商品建立與讀取不再有 `species_id`／`species_latin`；啟動遷移清除舊欄位、保留 `fish_species`、把舊商品 `species_code` 設為 `null`。`market_prices` 與 `market_fetch_state` 改以 `species_code` 為鍵，舊欄位一併清除；`species_market_codes` 集合啟動時移除。CLI 可用代碼或名稱查詢，名稱多候選會列出代碼。`/api/species` 與 `/api/market/species-codes` 回 404。
