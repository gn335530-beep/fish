# 05: 首頁今日漁獲改由 API 產生

**What to build:** 首頁「今日漁獲」依後端商品 API 的結果排序取前 N 筆，不再固定四個 key，也不在 API 失敗時顯示示意資料。首頁文案與結構維持可用，並把過長的頁面拆到 ≤200 行。（規格：R-2、B-7、R-12）

**Blocked by:** 03（漁獲列表改接商品 API）

**Status:** resolved

- [x] 首頁今日漁獲的數量與順序由 API 結果決定；商品少於 N 筆時顯示實際筆數。
- [x] API 失敗時顯示「無法連線」之類的明確提示，不顯示示意商品。
- [x] 首頁不再引用舊格式或靜態商品清單。
- [x] 首頁相關檔案維持 ≤200 行。

## Comments

- 2026-10-25：已實作。首頁改呼叫 `GET /api/products`，依 API 順序取前 4 筆並顯示實際筆數；失敗顯示明確錯誤、空資料顯示空狀態。移除 `01-data.js`、`api/fish.js`、`fish-mapper.js`、舊 `03-catalog.js` 與 `GET /api/fish/data`；`03-catalog.js` 改為只含導覽／toast 的 `03-ui.js`。
