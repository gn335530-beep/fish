# 03: 導購 `species_code` 優先篩選

**What to build:** 當模型回傳有效的 `species_code` 時，導購回覆先用官方代碼字典把代碼解析成官方名稱，再以該名稱篩選商品；解析不出來退回 `fish_species`，再退回規則式名稱。沒有代碼的既有商品仍依名稱比對，不因代碼優先而漏掉。

**Blocked by:** 01（共用魚種來源 helper）

**Status:** resolved

- [x] 模型回傳 `species_code` → 依代碼對應官方名稱篩選出正確商品
- [x] 模型只回 `fish_species` → 依名稱篩選（既有行為不變）
- [x] 兩者皆無 → 規則式名稱 fallback 不變
- [x] 無代碼的既有商品仍可依名稱被找到
- [x] 於 AI 回覆流程接縫與導購 fallback 接縫補上測試（先例見 spec 的 Testing Decisions）

## Comments

2026-11-24 完成。導購在模型提供有效 `species_code` 時，先以新增的 `findCatalogNameByCode`（`species-catalog.js`）解析成官方名稱再篩選商品；解析不到才退回 `fish_species`，再退回 `findCatalogName`。無代碼舊商品仍依名稱比對。`frontend/test/ai-species-code-priority.test.js` 覆蓋代碼、名稱與規則式 fallback 三個導購案例。`npm test` 872 項全綠。
