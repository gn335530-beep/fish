# 一支釣 API 與前端用戶端

> 對外 API 契約以 [`docs/spec/05-api.md`](../spec/05-api.md) 為準。
> 本文件只整理前端 `window.HaisenAPI` 的封裝與目前實際提供的端點；兩者衝突時以規格文件為準。

## 1. 基本設定

- API base 由 `frontend/assets/js/config.js` 設定，預設為目前主機的 `3001` 埠；可在載入 `api/client.js` 前用 `window.HAISEN_API_BASE` 覆寫。
- 請求使用 JSON；需登入的端點會帶 `Authorization: Bearer <token>`。
- Token 與會員資料存在 `localStorage` 的 `haisen_token_v1`、`haisen_user_v1`。
- 商品價格以「整批總價」儲存與回傳；`price_per_taijin` 是每台斤售價（可選）。前台不自行乘尾數，也不再自動計算整批。

## 2. 端點

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | 公開 | 註冊，回 `data.token`、`data.user`；需帶 `city` |
| `POST` | `/api/auth/login` | 公開 | 登入 |
| `POST` | `/api/auth/signin` | 公開 | 登入別名 |
| `GET` | `/api/auth/me` | 登入 | 目前會員 |
| `PUT` | `/api/users/profile` | 登入 | 更新暱稱、地址、銀行資料（後端端點；目前前端沒有 UI 呼叫） |
| `POST` | `/api/users/seller-consent` | 登入 | 記錄第一次販賣確認，重複呼叫不覆寫時間 |
| `GET` | `/api/products` | 公開 | 商品清單，只回傳上架中／洽談中；支援 `region`、`species`、`seller_id`、`status`、`limit` |
| `GET` | `/api/products/mine` | 登入 | 目前釣客所有未刪除商品（含已下架、已售出），依 `listed_at` 由新到舊 |
| `GET` | `/api/products/{id}` | 公開 | 單一商品（含已下架、已售出）；不存在回 404 `PRODUCT_NOT_FOUND` |
| `POST` | `/api/products/{id}/delist` | 登入 | 下架自己的商品 |
| `POST` | `/api/products/{id}/relist` | 登入 | 重新上架自己的已下架商品 |
| `DELETE` | `/api/products/{id}` | 登入 | 刪除已下架或已售出商品 |
| `POST` | `/api/products/create` | 登入 | 上架商品；可帶可選 `species_code` |
| `GET` | `/api/conversations` | 登入 | 房間清單 |
| `POST` | `/api/conversations/assistant` | 登入 | 每次建立一間新的助手房（登入時若完全沒有才由前端自動呼叫） |
| `DELETE` | `/api/conversations/{id}` | 參與者 | 刪除助手房或可刪的交易房 |
| `GET` | `/api/conversations/{id}/messages` | 參與者 | 訊息，支援 `after_seq`、`limit` |
| `POST` | `/api/chat/message` | 參與者 | 送出訊息 |
| `PUT` | `/api/conversations/{id}/context` | 參與者（助手房） | 更新助手房 context |
| `POST` | `/api/conversations/{id}/read` | 參與者 | 標記已讀 |
| `POST` | `/api/conversations/{id}/clear` | 參與者（助手房） | 清除舊訊息 |
| `POST` | `/api/deals/initiate-channel` | 登入 | 由商品開啟或沿用交易房與草稿訂單 |
| `GET` | `/api/deals/{id}` | 參與者 | 訂單明細，項目附可售尾數 |
| `POST` | `/api/deals/items` | 買家 | 加購同一釣客的商品 |
| `POST` | `/api/deals/items/batch` | 買家 | 批次加購多個商品，只留一則系統訊息 |
| `PATCH` | `/api/deals/items/{itemId}` | 買家 | 改尾數（需帶 `deal_id`） |
| `DELETE` | `/api/deals/items/{itemId}`、`/api/deals/items` | 買家 | 刪除項目／清空（舊介面） |
| `POST` | `/api/deals/propose` | 參與者 | 送出協議，鎖定 30 分鐘 |
| `POST` | `/api/deals/respond` | 參與者（非發起方） | 確認協議；退回為 legacy |
| `POST` | `/api/deals/cancel` | 參與者 | 取消並帶自由文字 `note` |
| `POST` | `/api/deals/reinitiate` | 買家 | 取消後重新發起協議 |
| `GET` | `/api/deals` | 登入 | 交易紀錄列表 |
| `POST` | `/api/reviews/submit` | 參與者 | 成交後評價對方 |
| `GET` | `/api/reviews?user_id=` | 公開 | 評價與平均星等 |
| `GET` | `/api/market/codes` | 公開 | 官方代碼字典；帶 `q` 查名稱／別名／代碼，省略回完整字典 |
| `GET` | `/api/market/quote` | 公開 | 名稱→代碼→價格整合查詢；支援 `q`、`region`、`date`、`include=history`、`days` |
| `GET` | `/api/market/prices` | 公開 | 代碼查價；每次請求重抓，支援 `code`、`region`、`date`、`include=history`、`days` |
| `GET` | `/api/market/markets` | 公開 | 市場對照表 |
| `POST` | `/api/uploads` | 登入 | 上傳圖片（base64 data URL） |

`GET /api/products` 會先掃描逾時訂單並釋放保留，不是純讀取。舊的 `/api/fish/data` 與 `PUT /api/fish/data/{id}` 已移除。

### 官方代碼字典

`GET /api/market/codes` 回傳官方代碼、官方名稱、別名、分類、養殖旗標與最後出現日期。字典在執行時同步最近 30 天官方資料，成功後快取 24 小時；同步失敗時沿用舊字典。查無名稱回 `404 SPECIES_NOT_FOUND`，字典不可用回 `503 CATALOG_UNAVAILABLE`。

交易房由 `POST /api/deals/initiate-channel` 開啟，房間唯一鍵是 `buyer_id + seller_id`；同一釣客的多個商品會進同一筆草稿訂單。交易房的系統訊息會計入未讀。助手房每次 `POST /api/conversations/assistant` 都是獨立一間，有自己的 `context` 與草稿；`GET /api/conversations` 會回 `deletable` 供收件匣決定是否顯示刪除。

### 對話摘要欄位

`GET /api/conversations` 的每間房除了 `peer`、`last_message`、`unread_count`、`deletable`，另有訂單摘要：

| 欄位 | 說明 |
| --- | --- |
| `order` | 進行中訂單（`DRAFT`、`PENDING_REVIEW`、`NEGOTIATING`）的摘要；已成交、取消或逾時後為 `null` |
| `last_order` | 最新一筆訂單摘要，不限狀態；沒有訂單的助手房為 `null` |
| `orders` | 這間房所有訂單摘要，新到舊；供評價卡等歷史卡片更新 |

三者皆含 `id`、`status`、`cancel_reason`、`item_count`、`total_quantity`、`final_price`、`review_status`、`updated_at`。`cancel_reason` 供前端區分逾時（`LOCK_EXPIRED`、`HOLD_EXPIRED`）與主動取消。

前端每 3 秒輪詢對話清單；`last_order` 的 `id`、`status` 或 `updated_at` 改變時，會重取 `GET /api/deals/{id}`，協議卡、評價卡與房間摘要跟著目前訂單更新，不需要重開房間。已成交、已取消與已逾時的協議卡只顯示狀態，不再提供同意、退回或取消操作。

## 3. 商品回應欄位

`GET /api/products`、`GET /api/products/{id}` 與建立商品都會回傳衍生欄位：

| 欄位 | 說明 |
| --- | --- |
| `title` | 由後端產生的 `{魚種}（{尾數}尾 / {處理}）`；前端直接顯示，不得自行拼接 |
| `fish_species` | 使用者說的魚種名稱；未知魚種也保留原字串 |
| `species_code` | 對到的官方魚種代碼；未知魚種為 `null` |
| `weight_kg` | 選填／legacy；新商品可為 `null`，畫面不顯示 |
| `quantity` | 總尾數 |
| `available` | 可售尾數 |
| `reserved_quantity` | 進行中訂單保留的尾數 |
| `unit_price` | 每尾價格；只供訂單金額，商品卡與推薦卡不顯示 |
| `avg_weight_kg` | 每尾平均重量；重量為空時為 `null` |
| `status` | `ACTIVE` / `PARTIALLY_RESERVED` / `SOLD_OUT` / `DELISTED` |
| `region`, `location` | 縣市與完整地點 |
| `catch_time`, `created_at` | 捕獲與建立時間 |
| `listed_at`, `delisted_at` | 最近上架時間與下架時間；未下架時 `delisted_at` 為 `null` |

## 4. 前端公開函式

| 函式 | 用途 |
| --- | --- |
| `getToken()` / `setToken()` | 讀寫本機 Token |
| `getUser()` / `setUser()` | 讀寫本機會員資料 |
| `register({ phone, password, nick, city })` | 註冊並保存登入狀態 |
| `login({ phone, password })` | 登入並保存登入狀態 |
| `me()` | 以 Token 取得並同步會員資料 |
| `logout()` | 清除本機 Token、會員資料與頭像 |
| `listProducts()` | 取得公開商品清單（上架中／洽談中） |
| `listMyProducts()` | 取得目前釣客所有未刪除商品（上架紀錄） |
| `delistProduct(id)` | 下架自己的商品 |
| `relistProduct(id)` | 重新上架自己的已下架商品 |
| `deleteProduct(id)` | 刪除已下架或已售出的商品 |
| `getProduct(id)` | 取得單一商品 |
| `photoUrl(path)` | 將 `/uploads/...`、`images/...` 轉成可顯示網址 |

`createFish()`、`deleteFish()`、`updateFish()`、`listFish()`、`rowToCatch()`、`rowsToCatch()`、`updateProfile()` 都已移除。

## 5. 頁面初始化

- `frontend/assets/js/app/08-api-init.js` 只負責導覽、個人選單與 `syncSessionFromApi()`。
- `syncSessionFromApi()` 在有 Token 時呼叫 `me()`；401／403 會清除本機登入狀態，只有會員資料而沒有 Token 時也會清除。
- 頁面資料由各頁自己的 API 呼叫載入：首頁與列表用 `listProducts()`；助手魚種查詢用 `/api/market/codes` 與 `/api/market/quote`；上架紀錄用 `listMyProducts()`。商品詳情頁已移除，`getProduct(id)` 只供對話與內部使用。

## 6. 錯誤處理

- 連線失敗時錯誤 `status = 0`，訊息為「無法連線到伺服器，請確認後端已啟動」。
- HTTP 非成功或 `success: false` 時，依序取 `message`、`error`，否則顯示 `HTTP <狀態碼>`。
- 首頁、列表與詳情頁都把失敗顯示為明確狀態，不以示意資料冒充。
