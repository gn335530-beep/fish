# 05: 平台商品推薦（PRODUCT_RECOMMEND）

**What to build:** `search_products` 工具只回傳目前買得到的公開商品（`ACTIVE` 與 `PARTIALLY_RESERVED`），可用魚種、地區、價格與處理方式篩選，最多 5 筆，且不含電話、地址等非公開欄位。未指定地區時預設使用者縣市。「有什麼適合乾煎、500 元以內的白肉魚」會產生推薦理由與既有商品卡；前端把 context 切到 `shopping` 並更新 `last_cards`，後續「第 2 個」能接續上一批商品卡。

**Blocked by:** 01、02、03、04.

**Status:** ready-for-agent

- [ ] 只回 `ACTIVE` 與 `PARTIALLY_RESERVED`；已下架、已售出、已刪除商品不出現。
- [ ] 最多 5 筆；不含電話、地址等非公開欄位。
- [ ] 未指定地區時預設使用者縣市，並在回覆中說明查詢範圍。
- [ ] 推薦寫入 `reply_text` 與既有商品卡，context 進入 `shopping` 並更新 `last_cards`。
- [ ] 「第 2 個」能接續上一批商品卡並說明該商品。
- [ ] 商品卡只由 `tool_results.products` 產生；假 LLM 改寫價格或庫存時被拒絕。
- [ ] 相關流程與 UI 文件已同步更新。
- [ ] 新增與修改的程式碼檔案皆不超過 200 行。
