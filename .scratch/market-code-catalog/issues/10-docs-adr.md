# 10: 文件與 ADR 更新

**What to build:** 將規格、API 文件、資料模型、上架流程、導購、glossary 與 ADR 全部改成官方代碼字典模型，移除 `species_id`、`species_latin`、固定魚種清單與料理資料的舊描述。

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] 新增 ADR，記錄以官方代碼字典取代固定魚種清單的決策與取捨。
- [ ] API 文件記載查代碼、代碼查價與整合行情端點，並移除舊魚種端點與 `species_id` 參數。
- [ ] 資料模型文件記載商品只保留 `fish_species` 與可選 `species_code`。
- [ ] 上架、對話、導購與商品頁文件不再描述料理資料或舊魚種白名單。
- [ ] Glossary 更新為官方代碼字典、候選魚種等用語，不再把 `species_id` 當成主要概念。
- [ ] 文件不再出現 `/api/species`、`species_market_codes` 或 `species_latin` 的現行用法。
- [ ] README 與後端說明同步更新，沒有留下舊流程描述。
