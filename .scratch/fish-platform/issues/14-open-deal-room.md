# 14: 洽談購買開啟交易房

**What to build:** 買家在商品卡按「洽談購買」並選尾數後，系統找出或建立這位買家與該釣客唯一的交易房，建立或沿用一筆草稿訂單，把商品加入，插入系統訊息，並把面板切到交易房視圖（電話橫幅、訂單摘要、訊息流、輸入框）。釣客在另一個瀏覽器 3 秒內看到新訊息。同一釣客的多個商品進同一房、同一訂單；不同釣客各自一房。（規格：G-7、G-8、G-9、ADR 0001）

**Blocked by:** 04（商品詳情改讀真實商品）

**Status:** resolved

- [x] 商品卡與商品詳情頁都有「洽談購買」，可選 1 到可售尾數。
- [x] 按下後開啟交易房，房內有電話橫幅（完整號碼、可點擊撥號）、訂單摘要、訊息流與輸入框。
- [x] 房間參與者只有買家與釣客；第三人讀寫一律被拒。
- [x] 同一組人第二次洽談時沿用同一間房，不建立重複房間。
- [x] 同一釣客的第二個商品加入同一筆草稿訂單；不同釣客建立另一間房與另一筆訂單。
- [x] 釣客端在 3 秒內看到系統訊息與買家訊息。
- [x] 交易房裡的訊息不會觸發助手回覆。

## Comments

- 2026-10-25：已實作後端 `POST /api/deals/initiate-channel`（`routes/deals.js`、`lib/deals.js`）。以商品 `seller_id` 找或建立 `type = "deal"` 的交易房（唯一鍵 `buyer_id + seller_id`），找或建立該房唯一的 `DRAFT` 訂單，項目存商品快照（`unit_price = 整批價 ÷ 總尾數`），同商品再加購累加尾數並重算 `items_total`。加入時插入系統訊息「已進入交易洽談」與「已將⋯加入訂單草稿」；`systemMessage` 補上全域 `seq`，輪詢才看得到。超量回 409 `INSUFFICIENT_QUANTITY` 並附 `product_id`，自己的商品回 400 `OWN_PRODUCT`。交易房的系統訊息計入未讀，釣客的收件匣 3 秒內會出現紅點。
- 2026-10-25：前端商品卡與詳情頁加入尾數選擇與「洽談購買」（`app/05-product-view.js`、`app/09-deal-buy.js`、`pages/product-detail.*`、助手商品卡 `views/cards.js`）。按下後由 `flow.beginDeal()` 開房並切換到 `view = "deal"`；`views/deal.js` 顯示完整電話 `tel:` 連結、訂單摘要與訊息流，面板加寬。交易房訊息走純真人訊息，`submitText`／`submitPhoto` 不再呼叫規則引擎；輪詢也會同步目前房間的訂單摘要。新增 `backend/test/deals.test.js`（11 個案例）與 `frontend/test/deal-room.test.js`（電話橫幅、訂單摘要、交易房不觸發助手）覆蓋。
