# 01: 公開列表只顯示可購買商品

**What to build:** 買家在首頁、漁獲列表、助手推薦與加購清單只看到上架中與洽談中的商品；已售出與已下架商品不再出現。商品有最近上架時間與下架時間，公開列表依最近上架時間由新到舊；單筆商品讀取仍可用。這個 ticket 也建立後續下架／重新上架／刪除所需的狀態與時間欄位。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 首頁、漁獲列表、助手推薦與加購清單只出現 `ACTIVE` 與 `PARTIALLY_RESERVED`。
- [x] `SOLD_OUT` 與 `DELISTED` 不出現在公開列表；單筆商品讀取仍回傳商品與狀態。
- [x] 既有商品都有 `listed_at`（回填為 `created_at`）；公開列表依 `listed_at` 由新到舊。
- [x] `delisted_at` 欄位存在，`DELISTED` 狀態由它推導。
- [x] 後端與前端測試通過。
