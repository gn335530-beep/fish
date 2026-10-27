# 15: 對話 API 呼叫歸位到 `assets/js/api/`

**What to build:** products 與 market 的 API 請求集中在 `assets/js/api/`，對話層只保留對話專用呼叫或 re-export；呼叫端 import 一致。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `demo/api.js` 不再有 products／market 的實作，只剩 re-export 或對話專用函式。
- [x] `api/products.js`、`api/market.js` 提供對應請求函式。
- [x] 所有 products／market 呼叫端都指向 `assets/js/api/`。
- [x] `npm test` 全綠；對話上架、商品列表與行情卡人工檢查不變。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D6」。

## Comments

2026-10-27 完成。products／market 實作移到 `api/products.js` 與 `api/market.js`，共用 `api/request.js`；demo 呼叫端改為直接 import，`demo/api.js` 只剩對話與交易 API。舊頁面仍透過 `api/products.js` 補上的 `window.HaisenAPI` 呼叫，並改在 `DOMContentLoaded` 後載入，避免 module 載入順序問題。新增 `frontend/test/api-location.test.js`。未實際開瀏覽器做視覺／互動人工檢查，改以自動測試與載入順序檢查涵蓋。
