# 08: 售價精度與自動計算基準

**What to build:** 釣客明確輸入的整批售價原樣保留，不再被四捨五入；只填每台斤時，自動計算用未進位的總重，顯示層才進位。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `price: 999.5` 存回 999.5，API 回應與詳情頁一致。
- [x] 自動計算以原始總重計算，不使用進位後的重量。
- [x] 顯示層仍以整數或既定格式呈現，不影響既有版面。
- [x] 新增測試涵蓋明確價格與自動價格。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「S8」（對應既有票 27）。

## Comments

2026-10-27 完成。`readPricing` 不再對使用者明確輸入的 `price` 四捨五入，`price: 999.5` 原樣入庫並由 create／detail 回應；自動價改用未進位的原始 `weight_kg` 計算，入庫重量仍四捨五入到一位小數。前端上架流程同步保留重量輸入精度，價格步驟也保留小數。`backend/test/products-pricing.test.js`、`frontend/test/price.test.js`、`frontend/test/slots-number.test.js` 涵蓋明確價格與自動價格；文件同步 `04-data-model.md`、`05-api.md`。
