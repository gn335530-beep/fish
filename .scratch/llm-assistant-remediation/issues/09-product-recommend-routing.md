# 09: PRODUCT_RECOMMEND 路由

**What to build:** 後端找到符合的商品時，前端一律採用推薦結果，不再被自製的關鍵字規則否決。使用者說「有沒有澎湖的魚」時會看到推薦文字與商品卡；平台動作與上架流程仍由規則引擎優先。

**Blocked by:** 02（前端信任後端 slots 與共用常數）

**Status:** resolved

- [x] 規則引擎判為 `BUY`、後端回 `PRODUCT_RECOMMEND` 時，前端寫入模型文字並產生工具結果中的商品卡。
- [x] 移除 `PRODUCT_HINT` 關鍵字判斷；不再用前端自製規則否決後端 intent。
- [x] `SELL`、`MARKET`、`CANCEL`、`EDIT` 與上架流程進行中仍由規則引擎優先，不寫入模型文字。
- [x] 商品卡只由 `tool_results.products` 產生；context 進入 shopping 模式並更新 `last_cards`。
- [x] 前端測試涵蓋「BUY＋PRODUCT_RECOMMEND」與「平台動作仍規則優先」兩類情境。
- [x] 文件同步 intent 路由與前端行為。
