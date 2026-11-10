# 01: 商品卡地區顯示去重、文件對齊與快取提版

**What to build:** 買家在首頁、今日漁獲、商品列表與個人資訊頁看到的商品卡，地區欄位只顯示一次縣市：`location` 以 `region` 開頭時直接顯示 `location`；否則用 `region`＋全形空格補上；`region` 或 `location` 缺漏時顯示「地區未提供」。比對前將「臺」正規化為「台」，並去除前後空白。同步交易房 spec、UI 規格與路線圖 AC-21，讓文件說「以 `region` 開頭」而不是「已含縣市」，並把同節的「賣家資訊」改為「釣客資訊」。最後把商品卡顯示模組在所有載入頁面的 `?v=` 由 `v13` 升到 `v14`，並讓既有快取版本 e2e 鎖定這個模組。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 地區行在 `location` 以正規化後的 `region` 開頭時，只顯示 `location`，縣市只出現一次。
- [x] `location` 不以 `region` 開頭時，顯示 `region`＋全形空格＋`location`。
- [x] `region` 或 `location` 任一缺漏時顯示「地區未提供」。
- [x] 「臺」正規化為「台」，且 `region`／`location` 的前後空白不影響比對與輸出。
- [x] 商品卡 HTML 測試以地區行的完整文字做精確斷言，不再用整張卡片的「高雄市」次數；涵蓋完整地址、`location` 缺縣市、`location` 等於 `region`、缺漏、臺／台與空白邊界。
- [x] 交易房 spec 與 UI 規格的地區用語改為「以 `region` 開頭」；路線圖 AC-21 以「不重複縣市」表達且不新增技術細節。
- [x] 交易房 spec 同節的「賣家資訊」改為「釣客資訊」，不改其他歷史 ticket 的完成紀錄。
- [x] 所有載入商品卡顯示模組的頁面使用相同的 `v14`；快取版本 e2e 檢查把該模組納入鎖定，最低版本 `v14`。
- [x] `npm test` 與 `npm run test:e2e` 全綠；修改的程式碼檔案不超過 200 行。
- [x] 沒有改動 `region`／`location` 的 API 契約、資料格式或後端邏輯，也沒有加入模糊去重。

## Comments

- 2026-11-10：`placeOf` 改為先 trim 再前綴比對；商品卡測試改抓 `.catch-card__place` 完整文字，補齊 `location=region`、region／location 空白、臺／台與缺漏案例。交易房 spec、UI 規格與路線圖 AC-21 的地區用語同步為「以 `region` 開頭」；交易房 spec 內殘留的「賣家資訊」一併改為「釣客資訊」，歷史 ticket 未動。`05-product-view.js` 在首頁、商品列表、個人資訊與設定頁都由 `v13` 升到 `v14`；快取 e2e 鎖定首頁、商品列表與個人資訊的最低 `v14`，設定頁因檢查需登入未納入自動鎖定但已人工確認同版本。`npm test` 573 passed、`npm run test:e2e` 36 passed；`05-product-view.js` 129 行、`product-display.test.js` 178 行、`cache-version.spec.js` 92 行，均低於 200 行。未改 API、資料格式或後端邏輯。
