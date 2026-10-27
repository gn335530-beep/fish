# 20: 評分與 `round1` 單一 helper

**What to build:** 評分換算與一位小數四捨五入各只有一份實作，其餘模組 import 使用。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 評分換算只剩一份 helper。
- [x] `round1` 只有一個定義。
- [x] `reviews.test.js`、`market-price.test.js`、`products.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R4」。

## Comments

- 2026-10-27 完成。新增 `lib/round.js`（後端唯一的 `round1` 定義），`lib/product-title.js` 與 `lib/market/query.js` 改為 import，`routes/products.js` 直接從 `lib/round` 取用。`lib/reviews.js` 新增 `averageRating(rows)`，回傳 `{ count, score }`；`recomputeUser` 與 `GET /api/reviews` 都改用它，評分換算只剩一份。前端 `demo/ai/listing-market.js` 的 `round1` 屬瀏覽器端獨立執行環境，不與後端共用模組，維持原狀。`reviews.test.js`、`market-price.test.js`、`products.test.js` 全數通過。
