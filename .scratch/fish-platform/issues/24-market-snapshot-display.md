# 24: 上架行情快照與商品頁顯示

**What to build:** 商品發布時，後端依該魚種與釣客縣市查行情，寫入 `market_snapshot`（`price_per_kg`、`price_per_taijin`、交易日期、來源、`source_url`、抓取時間、養殖旗標、`scope`／`region`、`quality`）。商品卡與詳情頁顯示快照的平均價、縣市或全國平均、交易日期、來源、「新鮮批發參考」與「養殖價格」；不顯示上價／中價／下價，也不顯示「今日行情」「即時均價」「澎湖魚市即時均價」。查無行情顯示「暫無行情」；商品仍可發布。移除示意行情 `market_reference_price`。（規格：G-16、B-8、AC-7～AC-9、F10、ADR 0003）

**Blocked by:** 23

**Status:** ready-for-agent

- [ ] 在高雄市上架石斑後，商品含 `market_snapshot`（`price_per_kg`、`price_per_taijin`、交易日期、來源、`source_url`、抓取時間、養殖旗標、`scope`／`region`、`quality`）。
- [ ] 商品卡與詳情頁的行情資訊都來自快照；商品改價不影響快照。
- [ ] `is_aquaculture: true` 時顯示「養殖價格」；行情區標「新鮮批發參考」。
- [ ] 查無行情時顯示「暫無行情」，畫面沒有價格數字。
- [ ] 畫面不再出現「澎湖魚市即時均價」「今日行情」「即時均價」。
- [ ] `market_reference_price` 與魚種字典的示意行情移除；不再用示意值定價。
- [ ] 02／03／04／05／06／07 與測試同步。
