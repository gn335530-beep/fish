# 09: 後端收斂與舊資料遷移

**What to build:** 後端完全改用官方代碼模型。商品移除 `species_id` 與 `species_latin`，舊商品啟動時清空舊欄位並保留 `fish_species`；行情資料與抓取狀態以代碼為鍵；舊魚種模組、路由、端點與對照集合全部移除；CLI 可用代碼或名稱查行情。

**Blocked by:** 03, 06, 07, 08

**Status:** ready-for-agent

- [ ] 啟動後既有商品不再有 `species_id` 與 `species_latin`，`fish_species` 保留，`species_code` 為空。
- [ ] 商品建立與讀取不再包含 `species_id` 與 `species_latin`。
- [ ] 行情價格與抓取狀態以 `species_code` 為唯一鍵，不再有 `species_id`。
- [ ] 舊魚種路由與舊行情對照端點已移除，呼叫時回 404。
- [ ] 舊魚種對照集合已移除，不再於啟動時同步。
- [ ] 行情 CLI 可用官方代碼查詢，也可用名稱先查代碼。
- [ ] 舊魚種模組不再被任何後端程式引用。
- [ ] 後端與前端測試全數通過。
- [ ] 所有程式碼檔案不超過 200 行。
