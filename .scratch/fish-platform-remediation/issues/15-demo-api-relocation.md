# 15: 對話 API 呼叫歸位到 `assets/js/api/`

**What to build:** products 與 market 的 API 請求集中在 `assets/js/api/`，對話層只保留對話專用呼叫或 re-export；呼叫端 import 一致。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `demo/api.js` 不再有 products／market 的實作，只剩 re-export 或對話專用函式。
- [ ] `api/products.js`、`api/market.js` 提供對應請求函式。
- [ ] 所有 products／market 呼叫端都指向 `assets/js/api/`。
- [ ] `npm test` 全綠；對話上架、商品列表與行情卡人工檢查不變。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D6」。
