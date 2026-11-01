# 01: 前置重構：拆分面板、交易房與卡片模組

**What to build:** 將聊天面板的標題列與頁尾、交易房的訂單摘要、協議卡、評價卡、商品卡與上架草稿卡拆成獨立、職責清楚的模組，並抽出共用的星等渲染。這是純重構：畫面、文案、互動與資料格式都不變，目的是讓後續改版能在單檔 200 行限制內完成。既有對外函式與畫面行為必須保持可用。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 面板外殼、標題列、頁尾；交易房摘要；協議卡；評價卡；商品卡；草稿卡分別位於獨立模組。
- [x] 既有呼叫端（包含測試）不需要改變行為即可取得原本的畫面與函式。
- [x] 共用星等渲染可支援唯讀星等，並可供後續可點星等重用。
- [x] 不改動任何使用者可見文案、互動流程或 API 格式。
- [x] 既有前端與後端測試全數通過。
- [x] 所有程式碼檔案不超過 200 行。

## Comments

- 2026-11-01：完成前置重構。新增 `views/panel-header.js`、`panel-footer.js`、`panel-shell.js`、`stars.js`、`product-card.js`、`draft-card.js`、`deal-agreement-card.js`、`deal-review-card.js`、`deal-card-state.js`；`cards.js` 與 `deal-cards.js` 保留原本 `renderCard`／`renderDealCard`／`renderReviewCard` 對外介面。`stars.js` 的 `starStates`／`starGlyph` 可供後續可點星等重用。未改動使用者可見文案與行為，`npm test` 全數通過。
