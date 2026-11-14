# 05: 平台商品推薦（PRODUCT_RECOMMEND）

**What to build:** `search_products` 工具只回傳目前買得到的公開商品（`ACTIVE` 與 `PARTIALLY_RESERVED`），可用魚種、地區、價格與處理方式篩選，最多 5 筆，且不含電話、地址等非公開欄位。未指定地區時預設使用者縣市。「有什麼適合乾煎、500 元以內的白肉魚」會產生推薦理由與既有商品卡；前端把 context 切到 `shopping` 並更新 `last_cards`，後續「第 2 個」能接續上一批商品卡。

**Blocked by:** 01、02、03、04.

**Status:** resolved

- [x] 只回 `ACTIVE` 與 `PARTIALLY_RESERVED`；已下架、已售出、已刪除商品不出現。
- [x] 最多 5 筆；不含電話、地址等非公開欄位。
- [x] 未指定地區時預設使用者縣市，並在回覆中說明查詢範圍。
- [x] 推薦寫入 `reply_text` 與既有商品卡，context 進入 `shopping` 並更新 `last_cards`。
- [x] 「第 2 個」能接續上一批商品卡並說明該商品。
- [x] 商品卡只由 `tool_results.products` 產生；假 LLM 改寫價格或庫存時被拒絕。
- [x] 相關流程與 UI 文件已同步更新。
- [x] 新增與修改的程式碼檔案皆不超過 200 行。

## Comments

- 2026-11-14：新增 `search_products` 工具，只回公開商品、最多 5 筆、預設使用者縣市，且不輸出地址或聯絡欄位。`PRODUCT_RECOMMEND` 的文字與商品卡只由工具結果產生，前端 context 進入 `shopping` 並更新 `last_cards`；後續「第 2 個」沿用既有指涉流程。測試見 `backend/test/ai-tools-products.test.js`、`frontend/test/ai-recommendation.test.js`。
