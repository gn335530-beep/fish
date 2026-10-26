# 27: 商品售價支援每台斤與整批

**What to build:** 商品售價同時支援每台斤與整批。`price`（整批）是訂單／協議使用的價格；`price_per_taijin` 可為空；`price_auto` 標記整批是否由每台斤自動計算。只填整批時每台斤留空；只填每台斤時發布前自動計算整批並標「自動計算」；兩者都填時都保留、不檢查一致性，整批可為折扣。商品卡、詳情頁、草稿卡各自標明價格；商品卡與 #24 同動，請同批處理。（規格：G-18、AC-11、F2）

**Blocked by:** 無

**Status:** ready-for-agent

- [ ] 商品建立 API 接受 `price` 與／或 `price_per_taijin`；至少一個 > 0；都沒有回 400 `MISSING_PRICE`；有值但 ≤ 0 回 400 `INVALID_PRICE`。
- [ ] 只填整批 → `price_per_taijin = null`、`price_auto = false`。
- [ ] 只填每台斤 → 後端計算 `price = round(per_taijin × weight_kg ÷ 0.6)`、`price_auto = true`，畫面標「自動計算」。
- [ ] 兩者都填 → 都保留、`price_auto = false`；整批可低於每台斤 × 台斤數（折扣）。
- [ ] 商品回應含 `price`、`price_per_taijin`、`price_auto`、`unit_price`。
- [ ] 商品卡、詳情頁、草稿卡分別標明上架整批、每台斤、每尾均價；不得把整批價當單價乘尾數。
- [ ] 訂單／協議使用整批價；成交價可與上架售價不同。
- [ ] 測試、02-domain 3.1、03-flows、04-data-model、05-api、06-ui、07-roadmap、glossary 同步。
