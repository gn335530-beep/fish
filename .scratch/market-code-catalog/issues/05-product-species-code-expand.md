# 05: 商品模型擴充 species_code

**What to build:** 商品可以攜帶官方魚種代碼，同時暫時保留舊的 `species_id` 與 `species_latin`，讓新舊模型並存、既有商品與呼叫端不受影響。建立商品時不因查無代碼或多候選而失敗。

**Blocked by:** 02

**Status:** resolved

- [x] 建立商品時可帶入 `fish_species` 與可選的 `species_code`，回應會包含該代碼。
- [x] 沒有帶 `species_code` 時商品仍可建立，代碼為空。
- [x] 查無代碼、多個候選或無效代碼都不會阻擋商品建立。
- [x] 商品列表與商品詳情會回傳 `species_code`。
- [x] 過渡期仍保留 `species_id` 與 `species_latin`，既有商品行為不變。
- [x] 後端 HTTP 測試涵蓋有代碼、無代碼與不合法代碼的商品建立。

## Comments

2026-10-28 完成。`POST /api/products/create` 接受可選 `species_code`：正整數存入，空白或非數字存 `null`，未知代碼也不阻擋。商品列表與詳情直接回傳該欄位；`species_id`、`species_latin` 與既有推導欄位維持不變。測試補在 `backend/test/products.test.js`。
