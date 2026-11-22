# 05 API 規格

## 1. 通則

| 項目 | 內容 |
| --- | --- |
| Base URL | 前端預設 `http://{目前主機}:3001`（`frontend/assets/js/config.js`）；可用 `window.HAISEN_API_BASE` 覆寫 |
| 格式 | JSON |
| 認證 | `Authorization: Bearer {token}`；Token 存於後端記憶體，重啟失效 |
| CORS | 全開（`*`） |
| 404 | 任何未定義路徑回 JSON 404，不會落到 json-server 的預設路由 |

### 1.1 成功回應

```json
{ "success": true, "message": "取得商品清單成功", "data": [] }
```

建立類端點回 HTTP 201，其餘 200。`data` 一律存在（沒有值時為 `null`）。

### 1.2 失敗回應

```json
{ "success": false, "code": "INVALID_PRICE", "message": "售價必須大於 0 元" }
```

部分錯誤會附額外欄位（例：可售不足時附 `product_id`）。

### 1.3 權限層級

| 層級 | 意思 |
| --- | --- |
| 公開 | 不需 Token |
| 登入 | 需要有效 Token，否則 401 `UNAUTHORIZED` |
| 參與者 | 除了登入，還必須是該房間的參與者，否則 403 `FORBIDDEN` |

## 2. 端點總表

> ✅ 為現況；🟡 為部分實作；⬜ 為尚未實作的目標端點。

| # | 方法 | 路徑 | 權限 | 狀態 |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/auth/register` | 公開 | ✅ |
| 2 | POST | `/api/auth/login` | 公開 | ✅ |
| 3 | POST | `/api/auth/signin` | 公開 | ✅（登入別名） |
| 4 | GET | `/api/auth/me` | 登入 | ✅ |
| 5 | PUT | `/api/users/profile` | 登入 | ✅（電話、頭像欄位） |
| 5a | GET | `/api/users/:id` | 公開 | ✅ 公開個人資訊 |
| 6 | GET | `/api/products` | 公開 | ✅ |
| 7 | GET | `/api/products/:id` | 公開 | ✅ |
| 8 | POST | `/api/products/create` | 登入 | ✅ |
| 9 | GET | `/api/market/codes` | 公開 | ✅ 官方代碼字典 |
| 10 | GET | `/api/conversations` | 登入 | ✅ |
| 11 | POST | `/api/conversations/assistant` | 登入 | ✅ |
| 12 | GET | `/api/conversations/:id/messages` | 參與者 | ✅ |
| 13 | POST | `/api/chat/message` | 參與者 | ✅ |
| 14 | PUT | `/api/conversations/:id/context` | 參與者（助手房） | ✅ |
| 15 | POST | `/api/conversations/:id/read` | 參與者 | ✅ |
| 16 | POST | `/api/conversations/:id/clear` | 參與者（助手房） | ✅ |
| 17 | POST | `/api/uploads` | 登入 | ✅ |
| 18 | GET | `/uploads/*` | 公開 | ✅ 靜態檔 |
| 19 | POST | `/api/deals/initiate-channel` | 登入 | ✅ 開啟／沿用交易房 |
| 19a | POST | `/api/deals/initiate-room` | 登入 | ✅ 由個人資訊開啟交易房／純聊天 |
| 20 | GET | `/api/deals/:id` | 參與者 | ✅ 訂單明細（含商品快照與可售） |
| 21 | POST | `/api/deals/items` | 登入（買家） | ✅ 加購同一釣客的商品 |
| 22 | POST | `/api/deals/items/batch` | 登入（買家） | ✅ 批次加購 |
| 23 | PATCH | `/api/deals/items/:itemId` | 登入（買家） | ✅ 改尾數 |
| 24 | DELETE | `/api/deals/items/:itemId` | 登入（買家） | ✅ 逐項移除（購物車使用，不留系統訊息） |
| 25 | DELETE | `/api/deals/items` | 登入（買家） | ✅ 清空訂單（舊介面；UI 不提供） |
| 26 | POST | `/api/deals/propose` | 參與者 | ✅ 送出協議 |
| 27 | POST | `/api/deals/respond` | 參與者（非發起方） | ✅ 確認；退回為 legacy |
| 28 | POST | `/api/deals/cancel` | 參與者 | ✅ 取消並釋放（自由文字 note） |
| 29 | POST | `/api/deals/reinitiate` | 登入（買家） | ✅ 取消後重新發起 |
| 30 | GET | `/api/deals` | 登入 | ✅ 交易紀錄列表 |
| 31 | POST | `/api/reviews/submit` | 登入（參與者） | ✅ 送出評價 |
| 32 | GET | `/api/reviews?user_id=&role=&sort=&rating=&offset=&limit=` | 公開 | ✅ 角色、排序、篩選、分布與商品照片 |
| 33 | GET | `/api/market/quote` | 公開 | ✅ 名稱→代碼→價格整合查詢 |
| 34 | GET | `/api/market/markets` | 公開 | ✅ 市場對照 |
| 35 | GET | `/api/market/prices` | 公開 | ✅ 代碼查價（含 `include=history`） |
| 36 | GET | `/api/products/mine` | 登入 | ✅ 上架紀錄（所有未刪除商品） |
| 37 | POST | `/api/products/:id/delist` | 登入（擁有者） | ✅ 下架 |
| 38 | POST | `/api/products/:id/relist` | 登入（擁有者） | ✅ 重新上架 |
| 39 | DELETE | `/api/products/:id` | 登入（擁有者） | ✅ 硬刪 |
| 40 | POST | `/api/ai/reply` | 參與者（助手房） | 🟡 Beta：文字回覆、唯讀工具、平台意圖 slots、fallback 與配額重試 |

### 2.1 本版新增／變更的端點

交易房改版新增批次加購與重新發起；商品建立改為整批售價必填、重量選填，並支援可選的 `client_request_id` 冪等鍵；取消改為自由文字 `note`。

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公開 | 變更：新增 `city`（必填） |
| POST | `/api/users/seller-consent` | 登入 | 新增：記錄第一次販賣確認 |
| GET | `/api/users/:id` | 公開 | 新增：公開個人資訊與角色評分 |
| PUT | `/api/users/profile` | 登入 | 變更：接受 `phone`、`avatar_url`；電話唯一 |
| POST | `/api/deals/initiate-room` | 登入 | 新增：由個人資訊開交易房；無商品時純聊天 |
| POST | `/api/products/create` | 登入 | 變更：整批售價必填、每台斤選填、重量選填、不再自動計算；可選 `client_request_id` 冪等鍵；ID 使用 `nextProductCode()`、寫入 `listed_at` |
| GET | `/api/products` | 公開 | 變更：只回 `ACTIVE`／`PARTIALLY_RESERVED`，依 `listed_at` 排序 |
| GET | `/api/products/mine` | 登入 | 新增：目前釣客所有未刪除商品 |
| POST | `/api/products/:id/delist` | 登入（擁有者） | 新增：下架 |
| POST | `/api/products/:id/relist` | 登入（擁有者） | 新增：重新上架 |
| DELETE | `/api/products/:id` | 登入（擁有者） | 新增：刪除已下架或已售出商品 |
| POST | `/api/deals/items/batch` | 登入（買家） | 新增：一次加入多個商品，只留一則系統訊息 |
| POST | `/api/deals/reinitiate` | 登入（買家） | 新增：取消後複製最後一筆訂單為新草稿 |
| POST | `/api/deals/cancel` | 參與者 | 變更：接受自由文字 `note` |
| DELETE | `/api/conversations/:id` | 參與者 | 變更：任何房間都能刪；交易房保留已成交訂單 |
| GET | `/api/reviews` | 公開 | 變更：支援 `role`、`sort`、`rating`、`offset`、`limit`；回角色摘要、分布與商品照片 |
| GET | `/api/market/codes` | 公開 | 新增：官方代碼字典與候選查詢 |
| GET | `/api/market/quote` | 公開 | 新增：名稱→代碼→價格整合查詢 |
| GET | `/api/market/prices` | 公開 | 變更：只接受 `code`，支援 `include=history` |
| GET | `/api/market/markets` | 公開 | 新增：市場對照表 |
| POST | `/api/ai/reply` | 參與者（助手房） | 新增（beta）：回傳 intent、slots、reply_text、sources 與工具結果；失敗一律 200 + `handled:false` |

## 3. 會員

### `POST /api/auth/register`

```json
{ "username": "0912345678", "password": "secret123", "display_name": "阿海",
  "city": "新北市" }
```

回 201：`data = { token, user }`。使用者是單一帳號型態，註冊不帶角色；傳入未知欄位會被忽略。
`city` 必填，必須在縣市清單內；「臺」正規化為「台」。
錯誤：400 `MISSING_FIELDS`、400 `MISSING_REGION`、400 `INVALID_REGION`、409 `DUPLICATE_PHONE`。

### `POST /api/auth/login`

```json
{ "username": "0912345678", "password": "secret123" }
```

回 200：`data = { token, user }`。錯誤：401 `INVALID_CREDENTIALS`。

### `GET /api/auth/me`

回傳 `publicUser`：全部會員欄位，**移除** `password`、`bank_code`、`bank_account`、`bank_account_name`，**加上** `display_address`、`region`。包含 `seller_terms_accepted_at`（未確認時為 `null`）。

### `PUT /api/users/profile`

```json
{ "display_name": "阿海", "phone": "0912345678", "avatar_url": "/uploads/a.jpg",
  "city": "新北市", "district": "瑞芳區", "address_line": "鼻頭路 1 號",
  "bank_code": "", "bank_account": "", "bank_account_name": "" }
```

可接受 `nickname` 作為 `display_name` 的別名。暱稱 2–20 字；`city`/`district` ≤ 20、`address_line` ≤ 100、銀行欄位有各自上限。`city` 若有值必須在縣市清單內，「臺」正規化為「台」。
`phone` 對應 `username`；格式 `^09\d{8}$`，全站唯一。修改電話**不要求目前密碼**，也不重新簽 token；token 仍綁 user id，下一次登入使用新電話。`avatar_url` 只接受 `/uploads/...` 或空字串；空字串代表移除頭像。
錯誤：400 `INVALID_NICKNAME`、400 `INVALID_REGION`、400 `FIELD_TOO_LONG`、400 `NO_CHANGES`、400 `INVALID_PHONE`、409 `PHONE_TAKEN`、400 `INVALID_AVATAR`。

### `GET /api/users/:id`

公開個人資訊，不需登入。回 200：

```json
{ "id": 1, "display_name": "陳阿海", "avatar_url": "/uploads/a.jpg",
  "region": "新北市", "is_verified": true, "completed_deals": 18,
  "rating": {
    "overall": { "score": 4.8, "count": 20 },
    "as_seller": { "score": 4.9, "count": 18 },
    "as_buyer": { "score": 4.5, "count": 2 }
  } }
```

- 只回公開欄位；不可直接重用含電話與地址的 `publicUser`。
- `as_seller` 用 `reviewer_role = buyer` 的評價計算；`as_buyer` 用 `reviewer_role = seller` 的評價計算；`overall` 用全部評價。
- 找不到回 404 `USER_NOT_FOUND`。

### `POST /api/users/seller-consent`

登入後記錄第一次販賣確認。伺服器設定 `seller_terms_accepted_at = now`，回 200 `{ user }`。已確認過則**不覆寫**原時間，仍回 200。這個同意永久有效，不因法規文字更新重問。
錯誤：401 `UNAUTHORIZED`。

## 4. 商品

### `GET /api/products`

| 參數 | 說明 |
| --- | --- |
| `region` | 子字串比對 `region`（例：`新北`） |
| `species` | 子字串比對 `fish_species` |
| `seller_id` | 精確比對 |
| `status` | 精確比對衍生狀態；公開端點只接受 `ACTIVE`／`PARTIALLY_RESERVED`，查其他狀態回空陣列 |
| `limit` | 取前 N 筆 |

回傳 `data` 是商品陣列（含衍生欄位），只包含 `ACTIVE` 與 `PARTIALLY_RESERVED`，依 `listed_at` 由新到舊。`seller_id` 也只回該釣客的公開商品；完整清單請用 `/api/products/mine`。

**副作用**：每次呼叫前會掃描逾時訂單並釋放保留（`sweepExpired`）。GET 有寫入副作用是刻意的（沒有排程），文件化即可。

### `GET /api/products/mine`

需登入。回傳目前釣客所有未刪除商品，包含 `ACTIVE`、`PARTIALLY_RESERVED`、`SOLD_OUT`、`DELISTED`，依 `listed_at` 由新到舊。

```json
{ "success": true, "data": [
  { "id": "prd_20261108_001", "seller_id": 1, "fish_species": "石斑",
    "quantity": 3, "sold_quantity": 1, "price": 2800, "price_per_taijin": 373,
    "listed_at": "2026-11-08T05:00:00.000Z", "delisted_at": null,
    "reserved_quantity": 0, "available": 2, "status": "ACTIVE" }
], "message": "取得上架紀錄成功" }
```

### `GET /api/products/:id`

回傳單一商品＋衍生欄位。`SOLD_OUT`／`DELISTED` 仍回 200 並帶狀態；已刪除回 404 `PRODUCT_NOT_FOUND`。

### `POST /api/products/create`

> 交易房改版：整批售價必填、每台斤選填、重量選填，不再自動計算整批。2026-10-28：移除商品行情快照。

```json
{ "fish_species": "石斑", "species_code": 2201, "quantity": 1,
  "condition": "放血冰鎮", "photo_url": "/uploads/ab12.jpg",
  "price": 1000, "price_per_taijin": 200, "client_request_id": "pub_abc123",
  "region": "新北市", "location": "新北市瑞芳區鼻頭路 1 號",
  "catch_time": "2026-10-25T14:00:00+08:00" }
```

伺服器行為：

- `seller_id` 取自 Token，client 傳的值一律忽略。
- `client_request_id` 是選填的冪等鍵，1–80 個英數字、底線或連字號；空白或格式不合法視同沒有帶，不新增錯誤碼。
- 同一釣客帶相同 `client_request_id` 重送時，先回傳第一次建立的商品（200），不新增；查重先於其他欄位驗證，不同釣客可重複使用同一值。
- 沒有帶 `client_request_id` 時維持可建立多筆相同內容商品的舊行為。商品硬刪後識別碼紀錄也消失；同值重送可建立新商品。
- `species_code` 是選填的正整數；空白或非數字存 `null`，未知代碼也不阻擋建立。伺服器不回填、也不改寫使用者輸入的 `fish_species`。
- `title` 由後端產生並隨商品回應回傳：`{魚種}（{尾數}尾 / {處理}）`；前端直接顯示，標題缺漏時使用通用文案，不自行拼接。
- `condition` 是自由文字：trim、非空、最多 20 字。
- `weight_kg` 是選填／legacy：有值且 > 0 時四捨五入到一位小數，否則存 `null`。不再因缺少重量而拒絕建立。
- 售價：
  - `price` 必填且 > 0，原樣保留（可含小數）。
  - `price_per_taijin` 選填；有值時必須 > 0，否則存 `null`。
  - 只填 `price_per_taijin`、沒有 `price` → 400 `MISSING_PRICE`（請提供整批售價）。
  - `price_auto` 一律 `false`；不再自動計算整批。
- 發布商品不查行情，也不寫入任何行情欄位；商品仍照常建立。
- `sold_quantity = 0`；**不寫入 `status`**。
- `id` 使用 `nextProductCode()`：每日流水號寫回 `counters`，硬刪後不重用。
- `listed_at = now`、`delisted_at = null`。
- `region` 預設個人檔案的縣市；`location` 預設三段地址串接。
- 首次建立回 201，`data` 是含衍生欄位的商品；同識別碼重送回 200，`data` 是第一次建立的商品。相同識別碼搭配不同內容時 first write wins。
- 商品資料保存 `client_request_id`，但所有商品 API 回應都不包含它。

錯誤：400 `MISSING_SPECIES`、`INVALID_QUANTITY`、`MISSING_CONDITION`、`INVALID_CONDITION`、`FIELD_TOO_LONG`、`MISSING_PRICE`、`INVALID_PRICE`、`MISSING_PHOTO`。

驗證規則：尾數 ≥ 1（無條件捨去小數）；處理方式非空、≤ 20 字且不能只有數字或單位；整批售價必填且 > 0；每台斤有值時 > 0；照片必填。

### `POST /api/products/:id/delist`

需登入，只能操作自己的商品。`ACTIVE`／`PARTIALLY_RESERVED` 可隨時下架。

- 設定 `delisted_at = now`，可售視為 0，狀態變 `DELISTED`。
- 從公開列表移除，仍留在 `/api/products/mine`。
- `PENDING_REVIEW` 訂單不變。
- `NEGOTIATING` 訂單自動取消：`cancel_reason = OTHER`、`cancel_note = "商品已下架"`，同步協議卡並留下系統訊息「商品已下架，協議已取消。」
- `DRAFT` 訂單移除該商品、重算 `items_total`，並留下系統訊息「『魚種』已下架，已從訂單草稿移除。」

回 200：

```json
{ "success": true, "data": {
  "product": { "id": "prd_20261108_001", "status": "DELISTED", "available": 0 },
  "cancelled_deals": 1, "removed_drafts": 2
}, "message": "商品已下架" }
```

錯誤：404 `PRODUCT_NOT_FOUND`、403 `FORBIDDEN`、409 `PRODUCT_ALREADY_DELISTED`（「此商品已下架」）、409 `PRODUCT_SOLD_OUT`。

### `POST /api/products/:id/relist`

需登入，只能操作自己的商品，且商品必須是 `DELISTED` 且 `總尾數 − 已售 > 0`。

- 清空 `delisted_at`、設定 `listed_at = now`。
- 狀態依公式重算，可能是 `ACTIVE` 或 `PARTIALLY_RESERVED`。
- 回到公開列表最前面。

回 200 `data.product` 是更新後的商品。錯誤：404 `PRODUCT_NOT_FOUND`、403 `FORBIDDEN`、409 `PRODUCT_NOT_DELISTED`、409 `PRODUCT_HAS_NO_STOCK`。

### `DELETE /api/products/:id`

需登入，只能操作自己的商品。`SOLD_OUT` 可直接刪除；`DELISTED` 可刪除；`ACTIVE`／`PARTIALLY_RESERVED` 必須先下架。

- 硬刪 `products` 資料列；照片檔保留。
- 從上架紀錄與公開列表消失。
- `PENDING_REVIEW` 訂單不變，買家仍可確認成交。
- `NEGOTIATING` 自動取消、`DRAFT` 移除該商品，規則同下架。
- 已成交訂單、訂單項目快照與評價保留。
- 商品 ID 由 `counters` 保留，不重用。

回 200：

```json
{ "success": true, "data": {
  "product_id": "prd_20261108_001",
  "cancelled_deals": 1, "removed_drafts": 2
}, "message": "商品已刪除" }
```

錯誤：404 `PRODUCT_NOT_FOUND`、403 `FORBIDDEN`、409 `PRODUCT_MUST_BE_DELISTED`。

### 商品衍生欄位

```jsonc
{ "...商品欄位": "...",
  "title": "石斑（1尾 / 放血冰鎮）",
  "price": 1000, "price_per_taijin": 200, "price_auto": false,
  "weight_kg": null,
  "listed_at": "2026-11-08T05:00:00.000Z", "delisted_at": null,
  "unit_price": 1000,
  "reserved_quantity": 0, "available": 1,
  "avg_weight_kg": null, "status": "ACTIVE" }
```

`status` 為 `ACTIVE`／`PARTIALLY_RESERVED`／`SOLD_OUT`／`DELISTED`；已下架時 `available` 一律為 0。

### `GET /api/market/codes`

公開官方新鮮代碼字典。省略 `q` 回完整字典；帶 `q` 可查精確官方名稱、精確別名或純數字代碼。

```jsonc
{ "success": true, "data": { "query": "土魠魚", "candidates": [
  { "species_code": 2141, "official_name": "土魠", "aliases": ["土魠魚"],
    "category": "2", "is_aquaculture": false, "last_seen_date": "2026-10-22" }
] } }
```

- 多候選依代碼由小到大排序，不自動選第一個。
- 查無名稱回 404 `SPECIES_NOT_FOUND`；字典不可用回 503 `CATALOG_UNAVAILABLE`。
- 同步失敗但已有舊字典時，查詢仍可用。

## 5. 對話

### `GET /api/conversations`

回傳 `data`：目前使用者參與的所有房間摘要，依最後訊息時間由新到舊。助手房可以有多筆，每筆有自己的 `context` 與草稿。

```jsonc
{ "id": "conv_...", "type": "assistant", "mode": "AI",
  "context": { "mode": "idle", "draft": null, "last_cards": [] },
  "peer": { "id": "ai", "display_name": "小幫手", "username": "" },
  "order": null,
  "last_order": null,
  "orders": [],
  "last_message": { "...": "..." },
  "unread_count": 0,
  "deletable": true,
  "created_at": "...", "last_message_at": "..." }
```

`has_products` 表示交易房的釣客目前是否有公開商品；純聊天房與助手房為 `false`，前端據此決定是否顯示浮動購物車。`order` 只在交易房有進行中訂單時才有值：`{ id, status, cancel_reason, item_count, total_quantity, final_price, review_status, updated_at }`；`cancel_reason` 讓前端區分逾時與主動取消。`last_order` 是最新一筆訂單的摘要，不限狀態；`orders` 是這間房所有訂單摘要（新到舊），供評價卡等歷史卡片更新。沒有訂單的助手房三者皆為 `null` 或空陣列。`updated_at` 在每次加購、改量、刪除、清空、提案、回應、取消、逾時或評價時更新，前端用來判斷何時重抓明細；`last_order` 的 `id`、`status` 或 `updated_at` 改變時，前端會重取 `GET /api/deals/:id`。

交易房的 `peer` 使用 `publicUser`，因此含 `id`、`display_name`、`username`（完整電話）、`rating_score`、`review_count` 等公開欄位；前端用 `rating_score`／`review_count` 顯示標題列星星，用 `username` 顯示 `tel:` 電話。交易房開啟後，`GET /api/deals/:id` 的 `peer` 會依目前使用者的交易角色提供角色評分；對話摘要的 `peer` 仍是整體評分。助手房的 `peer` 固定是 `{ id: "ai", display_name: "小幫手", username: "" }`。

交易房方向固定：`buyer_id` 是按「聊聊」或「洽談購買」的人，`seller_id` 是被看／商品擁有者；反向交易是另一間房。由個人資訊開啟且對方沒有商品時，房間沒有任何 `deals`，是純聊天房；`order`、`last_order`、`orders` 皆為 `null` 或空陣列。

未讀數不含自己送出的訊息。助手房的系統訊息不算未讀；交易房的系統訊息（開房、加購通知）算未讀。`deletable` 目前恆為 true；保留欄位供前端決定是否顯示刪除入口。任何房間都能刪，交易房刪除後未成交訂單會消失，已成交訂單留在交易紀錄。

**副作用**：會先做一次逾時掃描（`sweepExpired`），所以讀取清單可能讓過期的協議轉為 `CANCELLED` 並留下系統訊息。

### `POST /api/conversations/assistant`

建立一間新的助手房。寫入一則招呼語並標記已讀。回傳同上摘要。登入後若使用者沒有任何助手房，前端自動呼叫一次；收件匣的「新增 AI 對話」也呼叫這個端點。

### `GET /api/conversations/:id/messages`

| 參數 | 說明 |
| --- | --- |
| `after_seq` | 只回傳序號大於此值的訊息，預設 0 |
| `limit` | 預設 50，上限 100 |

會自動跳過「已清除」的訊息（`cleared_before_seq`）。回傳依 `seq` 升冪。

### `POST /api/chat/message`

```json
{ "conversation_id": "conv_...", "text": "還有貨嗎", "image_url": null, "card": null }
```

助手房額外允許：

```json
{ "conversation_id": "conv_...", "sender_type": "ai", "text": "…", "card": { }, "context": { } }
```

規則：

- **必須是房間參與者**，不論有沒有帶 `sender_type`。`sender_type` 只是訊息標記，不是身分證明。
- `text`、`image_url`、`card` 至少要有一個。
- `card.type = "legal_consent"` 只在助手房、第一次販賣前送出；確認／取消由前端按鈕處理，確認成功後呼叫 `POST /api/users/seller-consent`，不是由 `chat/message` 寫入同意。
- `text` 上限 500 字。
- `sender_type = "ai"` 只在助手房且 `mode = AI` 時接受，否則 409 `AI_NOT_ACTIVE`。
- `context` 只能寫在助手房；交易房帶 `context` 回 409 `NOT_ASSISTANT_ROOM`。省略或 `null` 視為不更新。
- `context` 必須是物件；字串或陣列回 400 `INVALID_CONTEXT`。
- 寫入後更新 `last_message_at`，並把**送出者**的已讀時間設為現在。
- 回 201，`data` 是完整訊息。

錯誤：400 `MISSING_CONVERSATION`、404 `CONVERSATION_NOT_FOUND`、403 `FORBIDDEN`、409 `AI_NOT_ACTIVE`、409 `NOT_ASSISTANT_ROOM`、400 `INVALID_CONTEXT`、400 `EMPTY_MESSAGE`、400 `MESSAGE_TOO_LONG`。

> **設計限制**：AI 回覆仍由前端規則引擎或 `POST /api/ai/reply` 取得後回寫，伺服器無法分辨「真助手」與「使用者代寫」。伺服器保證的是**不得跨房間寫入**；使用者在自己的助手房裡代寫 AI 訊息只會騙到自己。`POST /api/ai/reply` 只產生結構化結果，不寫訊息，讓 fallback 與既有訊息協議共用同一條路。

### `POST /api/ai/reply`

> **Beta**：LLM 預設關閉；`LLM_ENABLED=true` 且設定 `GEMINI_API_KEY` 才會呼叫外部模型。支援一般文字回覆（`CHAT`）、`WEB` 文字、平台意圖 slots、在地天氣／海況／潮汐、釣魚建議與來源請求；來源預設不回傳，回覆文字中的 URL 一律移除，明確要求來源時才由後端回傳最多 3 個。需要縣市的地區問題會使用設定、暫存或訊息中的明確縣市；缺縣市時直接反問，不呼叫模型。一般新聞與單獨的「最新」不需要縣市；平台意圖永遠優先。非地區問題若模型誤呼叫在地工具，回 `LLM_GUARD_REJECTED`，不反問縣市。配額錯誤會回 `retryable:true`，前端先跑規則，必要時顯示提示與重試。

```json
{ "conversation_id": "conv_...", "message_id": "msg_...",
  "context": { "mode": "idle", "draft": null, "last_cards": [] } }
```

- 權限：登入且為該助手房參與者；未登入 401、非參與者 403、非助手房 409 `NOT_ASSISTANT_ROOM`。
- `message_id` 必須屬於該房且由目前使用者送出，否則 404 `MESSAGE_NOT_FOUND`；非文字訊息回 400 `INVALID_MESSAGE`。
- `context` 必須是純物件，序列化後上限 16 KB，否則 400 `INVALID_CONTEXT`。
- 後端以 `message_id` 從資料庫讀取使用者文字，不信任前端傳來的訊息內容；`context` 不寫回資料庫。
- 歷史以 `message_id` 為錨點：只取同一間助手房、序號小於或等於該訊息的使用者與助手文字／卡片訊息，最近 10 則；錨定訊息固定是最後一則 user turn，較新的訊息不送入模型。系統訊息、圖片與完整卡片 JSON 不送入模型，卡片以一行摘要取代。
- 送出前遮蔽手機、市話（含 `+886` 國際碼、括號或分隔區碼、4 碼區碼）、Email、身分證字號與具行政區錨點的地址；地址必須有縣市或鄉鎮市區錨點，街名不得以虛詞開頭，因此「台北市區的網路」「新北市的路況」「弄一桌好菜」不觸發遮蔽。不送頭像、個人檔案電話或地址。
- 成功回 HTTP 200，`data`：

```jsonc
{ "handled": true, "intent": "CHAT",
  "slots": {}, "reply_text": "吳郭魚肉質細緻，適合乾煎或清蒸。",
  "sources": [], "tool_results": {},
  "error_code": null, "retryable": false }
```

- `intent`：`SELL`／`BUY`／`MARKET`／`CANCEL`／`EDIT`／`CHAT`／`WEB`／`PRODUCT_RECOMMEND`／`UNKNOWN`。
- 平台意圖（`SELL`、`BUY`、`MARKET`、`CANCEL`、`EDIT`）不產生 `reply_text`，前端交由既有規則完成；`CHAT`／`WEB`／`PRODUCT_RECOMMEND` 才寫入文字。
- 上架草稿進行中（`context.mode === "listing"` 且 `context.draft` 存在）改回 `listing` 契約，取代 `intent`／`slots`：`reply_text`（可為 `null`）、`corrections`（本輪修正告知 `[{ field, original, corrected }]`，`field` 只接受 `fish_species`、`condition`）、`draft_changes`（只接受 `fish_species`、`quantity`、`condition`、`price`、`price_per_taijin`；尾數與售價必須出現在釣客這一則訊息，否則整輪回 `LLM_GUARD_REJECTED`）、`correction_history`（累積修正紀錄，含 `time`）、`protected_names`（釣客要求保留的原始字串）、`condition_proposal`（待同意縮短版，可為 `null`）、`condition_ask_count`（處理方式回問計數，達兩次才接受提議）、`next_action`（`ask`／`show_market_card`／`show_draft_card`／`none`）。行情卡只能在非價格欄位完成後顯示、草稿卡只能在全部欄位完成後顯示，否則降級為 `ask`。模型不能發布、下架、刪除或修改已上架商品；白名單以外的 `draft_changes` 欄位一律丟棄。模型逾時、429、無金鑰、上游或格式錯誤由前端切換基本模式；`LLM_DISABLED` 維持規則模式。
- listing 魚種以官方代碼字典為唯一權威：原字串精確查詢有候選（含合法別名）時保留原文；只有一個候選才由後端在 `draft_changes.species_code` 帶入官方代碼，商品名稱仍是原文；多候選或查無不帶代碼。魚種錯字修正需同時成立：原字串查無、修正後唯一候選、原值等於草稿、原字串不在 `protected_names`，否則整輪回 `LLM_GUARD_REJECTED`。listing 只提供唯讀 `lookup_species` 工具（精確比對，不做模糊搜尋）；字典未同步時不套用修正。
- listing 處理方式保留原句：`draft_changes.condition` 必須在 20 字內且含文字（不能只有數字或單位），否則整輪回 `LLM_GUARD_REJECTED`；處理方式錯字修正的編輯距離上限 2，超過視為改寫並丟棄。`condition_proposal` 必須是合法的 20 字內版本，且只在 `condition_ask_count` 達兩次後接受、未達兩次時丟棄並降級為回問；套用待同意版本時，值必須等於 `context.condition_proposal` 且釣客這一則訊息是明確同意（例如「好」「套用」），否則丟棄。長度縮短不寫入 `corrections`。
- 唯讀工具：`get_market_price`（官方行情）、`search_products`（公開商品，最多 5 筆）、`get_local_conditions`（中央氣象署 F-D0047-091 縣市天氣預報，或 Open-Meteo 海域海況＋CWA 潮汐）、`web_search`（Tavily basic search）。每輪最多 2 次工具呼叫；模型不能使用寫入工具。工具結果視為不可信資料，平台數字、天氣、海況與潮汐數字只能來自使用者訊息或後端工具結果。
- 第一輪依問題類型強制工具：需要縣市的天氣／海況／潮汐／釣魚建議 → `get_local_conditions`；國外地點天氣、一般新聞、時效性問題 → `web_search`；商品推薦／找魚 → `search_products`；平台意圖與一般知識不強制。工具結果回來後恢復自動輸出 JSON。
- 地區上下文只用於需要縣市的地區問題：天氣、海況、潮汐、釣魚建議、在地新聞／地方新聞、颱風、交通、路況、活動、附近／這裡／這邊與縣市名稱。預設設定頁縣市，訊息中明確縣市優先；一般新聞（例如「NBA 新聞」）與單獨的「最新」不需要縣市，沒有縣市時不反問，網路搜尋可用就走網路搜尋；有設定、暫存或訊息中的縣市時仍帶入該縣市。平台意圖永遠優先，不反問縣市、不把縣市放進 prompt、不強制在地工具。其他非地區問題不把縣市放進 prompt 或工具查詢。system prompt 固定帶目前日期（Asia/Taipei）。需要縣市但沒有有效縣市時回 200 + `handled:true`、`intent:CHAT`、`reply_text:"你所在的縣市是哪裡？"`，不呼叫模型；使用者回答的縣市只暫存在後端記憶體（同一對話、30 分鐘、刪除對話時清除），不寫回個人設定。只使用縣市，不使用區或地址。非地區問題若模型誤呼叫在地工具，不採用模型文字，回 `LLM_GUARD_REJECTED`。`LLM_ENABLED=false` 或缺少金鑰時仍回靜默 fallback，不建立暫存。
- 天氣問題的 `get_local_conditions` 結果只含天氣現象、目前氣溫、今日高低溫、降雨機率、風速風向與 7 日預報；預報使用中央氣象署 F-D0047-091，12 小時分段在後端整理成每日資料。目前氣溫只來自自動氣象站 O-A0001-001；後端依 `GeoInfo.CountyName` 在本地過濾，選同縣市、`AirTemperature` 不是 `-99`、靠近縣市代表點且優先低海拔的測站，回傳測站名稱、觀測時間與氣溫。目前天氣現象、風速風向與陣風優先使用觀測，缺項時才用 F-D0047-091。沒有觀測時 `current_temperature_c` 為 `null`、`observation` 為 `null`、`observation_error` 保留原因，回覆一定標示「目前氣溫暫無資料」，不拿 12 小時平均預報溫度冒充。預報失敗、逾時、格式錯誤或缺少 `CWA_API_KEY` 時回「查不到即時天氣」，不 fallback 回 Open-Meteo。海況結果含浪高、浪向、浪週期、海溫、海域天氣、風速陣風與當日滿潮／乾潮時間。模式由後端依問題類型決定：天氣問題固定用天氣模式，海況／潮汐／釣魚建議固定用海況模式，模型傳錯模式不影響工具結果；天氣回覆混入海況、浪或潮汐時回 `LLM_GUARD_REJECTED`。只有該輪沒有在地模式時才允許模型選擇天氣或海況模式。海況優先使用訊息中的明確海域，否則縣市主要海域；內陸縣市或無法對應時回 200 + `intent:CHAT`、`reply_text:"你想問哪個海域？"`，不呼叫模型。缺少 `CWA_API_KEY`、沒有代表潮位站、潮汐逾時、無資料或格式錯誤時一定顯示「潮汐暫無資料」；模型漏寫時後端補上，已寫時不重複，追加後超過 500 字時優先保留提示。上游逾時、無資料或格式錯誤時只回缺少什麼，不產生數字。
- 國外地點天氣走 Tavily `web_search`，不呼叫台灣縣市天氣／海況／潮汐工具；網路搜尋關閉、逾時、上游錯誤或無結果時都回 200 + `handled:true`、`intent:CHAT`、`reply_text:"查不到國外地點天氣，請稍後再試。"`，不呼叫模型產生替代答案。要求來源時同一則加「目前沒有可提供的來源。」且 `sources` 為空陣列；回應 `error_code` 為 `null`，內部 log 保留 `LLM_TIMEOUT` 或 `LLM_UPSTREAM_ERROR`。配額用完與速率限制維持可重試，不套用這個直接回覆。
- 使用者問「適合釣魚嗎／要注意什麼」時，使用天氣、海況與潮汐的完整海況包，可回偏適合、需注意或偏不適合；資料不足時只說明缺少哪一項，不做適合／不適合判斷。絕對保證用語與固定免責句會使整則回覆回 `LLM_GUARD_REJECTED`；單純天氣或海況不自動產生釣魚建議。
- `search_products` 回空陣列時，後端把 `PRODUCT_RECOMMEND` 轉成 `CHAT`，只回目前沒有符合條件的商品，不產生商品卡。商品筆數 `N` 的依據是工具回傳的 `count`。
- 每次回覆只有一個請求期限：一般 8 秒（`LLM_TIMEOUT_MS`）；該輪執行 `web_search` 後延長為 15 秒（`LLM_SEARCH_TIMEOUT_MS`）。期限同時套用模型呼叫、每個工具與行情／氣象／潮汐上游；工具開始前剩餘時間已用盡就不再呼叫下游。模型或行情上游逾時回 `LLM_TIMEOUT` 靜默 fallback；國外地點天氣的網路逾時或上游錯誤回 `handled:true` 的「查不到」；在地天氣、海況、潮汐上游逾時回缺少資料的說明或「潮汐暫無資料」。
- `tool_results` 可含 `market`（給前端行情卡的完整官方資料，含 7／30 日曆天歷史、品質旗標、抓取時間與來源 URL）、`products`（公開商品陣列）與 `local`（天氣／海況／潮汐工具結果與後端來源；天氣含 `observation` 與 `observation_error`）；`PRODUCT_RECOMMEND` 的文字與商品卡只由工具結果產生，模型不能自行改寫。回覆未提到查詢範圍時，後端在最終文字後補上「（查詢範圍：縣市）」；加入後會超過 500 字就省略後綴，回覆仍成功。
- 模型看到的 `get_market_price` 結果只有是否查到、官方代碼、官方名稱、地區、交易日期、每公斤與每台斤平均價與養殖標記；歷史、品質、抓取時間與來源 URL 不進模型，也不進數字防護證據池。
- `sources` 預設為空陣列。使用者明確要求「連結、網址、來源、出處、哪裡看、哪個網站、資料哪來、引用、查證」時，後端重跑對應工具並回傳最多 3 個合法 http／https URL：同一則要求就在同一則給；下一句只要求來源時，以來源詞語為主判定，移除來源關鍵詞、指示詞、語氣詞、主題詞（例如天氣、海況、潮汐、新聞）與常見動詞後沒有新的問題內容就算純來源請求，依最近一則使用者問題重查天氣、海況或網路工具，不呼叫模型、不暫存來源。「來源是哪個網站」「這則的來源」「資料哪來，有網址嗎」都算。平台意圖永遠不產生網路來源卡；非平台回覆沒有來源時，`reply_text` 明確加上「目前沒有可提供的來源。」。
- 模型自稱 `CHAT` 但成功使用 `web_search` 時，最終 intent 仍升級為 `WEB`。模型自行提供的來源與回覆文字中的 http／https URL 一律丟棄或移除；平台行情卡與商品卡的來源標示不受影響。
- 平台數字（價格、尾數、行情、庫存）與天氣／海況／潮汐數字必須出現在使用者訊息或工具結果中，否則整則回覆丟棄，回 `handled:false` + `LLM_GUARD_REJECTED`。使用在地工具時另檢查單位：帶「度」「℃」「%」「級」「公尺」「米」「秒」「節」的數字必須出現在對應工具欄位，不能靠一般單位例外或小於等於 3 放行；日期與潮汐時間必須是工具結果中的同一組，不能只靠其中的數字出現。工具依據包含預報天數，讓「未來 7 天」有來源；一般知識的數字防護不變。條列編號（數字後緊接列表符號 `.`、`、`、`)`、`）` 且非小數，如「4. 煮湯」「1.清蒸 2.紅燒」）不是平台數字，不進接地檢查；其餘相同數字仍須接地。
- 失敗一律 HTTP 200：`LLM_DISABLED`、`LLM_NOT_CONFIGURED`、`LLM_TIMEOUT`、`LLM_UPSTREAM_ERROR`、`LLM_INVALID_OUTPUT`、`LLM_GUARD_REJECTED` 為靜默 fallback；`LLM_RATE_LIMITED`、`SEARCH_RATE_LIMITED`、`SEARCH_QUOTA_EXHAUSTED` 為 `retryable:true`，前端先跑規則，規則無法處理時才顯示提示與重試按鈕。國外地點天氣的網路逾時／上游錯誤例外：回 200 + `handled:true` 的「查不到」，`error_code` 為 `null`，僅內部 log 保留錯誤碼。
- 端點不寫入訊息、不改 `context`；AI 訊息仍由前端呼叫 `POST /api/chat/message` 寫入。地區暫存縣市不寫入資料庫。
- 重試由前端按鈕觸發，沿用同一個 `message_id`；後端不保存重試狀態、不自動重試、不排隊、不快取搜尋結果。
- 設定：後端啟動時自動載入 `backend/.env`，既有環境變數優先。`LLM_ENABLED`（預設 `false`）、`GEMINI_API_KEY`、`LLM_MODEL`（預設 `gemini-3.5-flash-lite`）、`LLM_TIMEOUT_MS`（預設 8000）、`LLM_WEB_SEARCH`（預設 `false`）、`TAVILY_API_KEY`、`LLM_SEARCH_TIMEOUT_MS`（預設 15000）、`LLM_PREFILL_TOOL`（預設 `false`，在地天氣／海況由後端直接執行 `get_local_conditions` 並預填結果，省一次模型決策回合）、`CWA_API_KEY`。Open-Meteo 海況不需要金鑰；缺少 `CWA_API_KEY` 時天氣回「查不到即時天氣」、潮汐降級。歷史固定最近 10 則，助手回覆截短到 120 字、使用者訊息 300 字；每輪最多 2 次工具呼叫。system prompt 明示只回答最新一句、不重複先前回覆與話題，使用者明確要延續（例如「第二個」「那另外一種」）時才參照先前回覆。
- log 只記 request id、使用者 id、intent、token 數、耗時、工具名稱／耗時／錯誤碼；不記訊息、prompt、工具結果、搜尋結果或 API key。

### `PUT /api/conversations/:id/context`

```json
{ "mode": "AI", "context": { "mode": "listing", "draft": { } } }
```

只有助手房可用（409 `NOT_ASSISTANT_ROOM`）。`context` 是淺合併。至少要有一個欄位，否則 400 `NO_CHANGES`。

### `POST /api/conversations/:id/read`

把目前使用者的已讀時間設為現在，回 `{ unread_count: 0 }`。

### `POST /api/conversations/:id/clear`

```json
{ "keep_from_seq": 57 }
```

只有助手房可用。保留 `keep_from_seq`（含）之後的訊息，之前的查詢時跳過。發布商品後前端用它把對話清空，只留下「已上架」那一則。

### `DELETE /api/conversations/:id`

刪除一間對話。權限：參與者。

- **助手房**：任何時候都能刪；刪除該房訊息與 `context`。
- **交易房**：任何時候都能刪；一律移除 `conversations` 資料列與訊息。
  - 房內沒有 `CONFIRMED` 訂單：所有 `deals` 與訂單項目一併移除，交易紀錄不再顯示。
  - 房內有 `CONFIRMED` 訂單：保留已成交訂單、項目與評價；未成交（`DRAFT`／`PENDING_REVIEW`／`NEGOTIATING`／`CANCELLED`）訂單與項目移除。保留訂單的 `conversation_id` 指向已刪除房間，只是歷史參考。
  - 刪除後再交易會建立新房間；房間 ID 不重用。
- 回 200 `{ deleted: true, kept_orders: N }`；`kept_orders` 是保留的已成交訂單數。
- 錯誤：404 `CONVERSATION_NOT_FOUND`、403 `FORBIDDEN`。

## 6. 上傳

### `POST /api/uploads`

```json
{ "filename": "photo.jpg", "data": "data:image/jpeg;base64,..." }
```

- 只接受 `image/jpeg`、`image/png`、`image/webp`。
- 解碼後上限 5MB。
- 存成 `backend/uploads/{uuid}.{ext}`（不進版控，只存在該台機器）。
- 商品照片與個人頭像共用這個端點；上傳後把 URL 寫入商品或 `users.avatar_url`。
- 回 200：`{ "url": "/uploads/ab12cd34.jpg" }`（在 `data` 裡）。

種子示範圖片另外放在 `backend/seed-assets/`，會進版控，並由 `GET /uploads/*` 以唯讀靜態檔提供；`POST /api/uploads` 不會寫入該目錄。

錯誤：400 `MISSING_IMAGE`、`INVALID_IMAGE`、`UNSUPPORTED_TYPE`、`EMPTY_IMAGE`、413 `IMAGE_TOO_LARGE`。

## 7. 已移除端點

| 端點 | 現況 |
| --- | --- |
| `GET /api/fish/data` | 已移除；瀏覽頁改用 `GET /api/products` |
| `PUT /api/fish/data/:id` | 已移除；交易改走交易房 |

舊購物車與手動上架表單也已在 M1 移除。

## 8. 交易端點

> 2026-10-25：`initiate-channel`、訂單明細、項目 CRUD、`propose`、`respond`、`cancel` 與交易紀錄都已實作。

### 8.1 訂單

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| POST | `/api/deals/initiate-channel` | 登入 | ✅ 由商品建立／沿用交易房與草稿，加入項目 |
| POST | `/api/deals/initiate-room` | 登入 | ✅ 由個人資訊建立／沿用交易房；無商品時純聊天 |
| GET | `/api/deals/:id` | 參與者 | ✅ 訂單明細，項目附目前可售尾數 |
| POST | `/api/deals/items` | 登入（買家） | ✅ 加購同一釣客的其他商品 |
| POST | `/api/deals/items/batch` | 登入（買家） | ✅ 批次加購 |
| PATCH | `/api/deals/items/:itemId` | 登入（買家） | ✅ 改尾數；購物車使用 |
| DELETE | `/api/deals/items/:itemId` | 登入（買家） | ✅ 逐項移除；購物車使用，不留系統訊息 |
| DELETE | `/api/deals/items` | 登入（買家） | ✅ 清空項目（舊介面；UI 不提供） |
| POST | `/api/deals/propose` | 參與者 | ✅ 送協議，逐項檢查可售 |
| POST | `/api/deals/respond` | 參與者（非發起方） | ✅ 確認；退回為 legacy |
| POST | `/api/deals/cancel` | 參與者 | ✅ 取消並釋放（自由文字 note） |
| POST | `/api/deals/reinitiate` | 登入（買家） | ✅ 取消後重新發起 |
| GET | `/api/deals` | 登入 | ✅ 交易紀錄列表 |

**商品已下架／已刪除時的交易阻擋**：`initiate-channel`、`items`、`items/batch`、`PATCH items/:itemId` 與 `propose` 在商品已下架時回 409 `PRODUCT_DELISTED`（「『魚種』已下架，無法購買」或「無法送出協議」）；商品已刪除回 404 `PRODUCT_NOT_FOUND`。`GET /api/deals/:id` 與歷史訂單快照不受影響。

`POST /api/deals/initiate-channel`

```json
{ "product_id": "prd_...", "quantity": 2 }
```

回 200：`{ conversation, deal, product }`。行為：以 `product.seller_id` 找或建立交易房（唯一鍵 `buyer_id + seller_id`，只找現存房間）→ 找或建立草稿訂單 → 加入或累加項目 → 房間轉 `HUMAN` → 插入系統訊息（第一次開房時另有「已進入交易洽談」）。刪除交易房後再洽談會建立新房間。再次洽談同一位釣客的另一個商品時，一律加入或累加，不清空既有草稿；舊客戶端若帶 `replace_items` 也忽略。`conversation` 是對話摘要（含 `peer.username` 完整電話與 `order`），`deal` 是草稿訂單，項目為商品快照。

錯誤：404 `PRODUCT_NOT_FOUND`、400 `INVALID_QUANTITY`、400 `OWN_PRODUCT`（自己的商品）、409 `INSUFFICIENT_QUANTITY`（附 `product_id`、`available`、`in_draft`）。

`POST /api/deals/initiate-room`

```json
{ "seller_id": 1 }
```

回 200：`{ conversation, deal, has_products }`。目前使用者是買家，`seller_id` 是釣客；不能對自己開房（400 `OWN_PROFILE`）。

- 對方有公開商品：找或建立草稿，`deal` 為草稿、`has_products: true`；購物車為空。
- 對方沒有公開商品：不建立 `deal`，`deal: null`、`has_products: false`；純聊天房。
- 已有同方向房間時沿用；已有進行中訂單時回傳該訂單，不建立新草稿。
- 新房間系統訊息：有商品「已進入交易洽談」；無商品「已開啟對話」。
- `conversation.peer` 含電話與整體評價；交易房開啟後以 `GET /api/deals/:id` 的角色評分為準。

`GET /api/deals/:id`

回 200 `data` 是訂單：`items[]` 每項附 `available`（目前可售尾數），`items_total` 由 `unit_price × quantity` 重算；另附 `cancel_reason`、`cancelled_by`（取消原因與操作者，未取消為 `null`）、`has_products`（釣客目前是否有公開商品）、`peer`（對方的公開資料；依目前使用者的交易角色附角色評分 `rating_score`／`review_count`）、`role`（`buyer`／`seller`）、`my_reviewed` 與 `peer_reviewed`。非參與者 403 `FORBIDDEN`，不存在 404 `DEAL_NOT_FOUND`。

**副作用**：讀取前會先做逾期掃描，可能讓這筆訂單轉為 `CANCELLED` 並留下系統訊息。

`GET /api/deals`

回目前使用者參與的所有訂單，依「成交時間，未成交則建立時間」由新到舊（`confirmed_at || created_at`）。每筆含 `id`、`deal_status`、`created_at`、`confirmed_at`、`item_count`、`total_quantity`、`items_total`、`final_price`（有 `deal_terms` 用整單金額，否則用小計）、`review_status`、`role`、`my_reviewed`、`peer_reviewed`、`peer`。交易紀錄的 `peer` 維持整體評價；角色評價只用在交易房明細。讀取前同樣會做逾期掃描。

`POST /api/deals/items`

```json
{ "deal_id": "deal_...", "product_id": "prd_...", "quantity": 1 }
```

只有買家、只有 `DRAFT` 可以改。商品必須屬於同一釣客，否則 400 `WRONG_SELLER`。回 201 `{ deal }`，並插入系統訊息。錯誤：409 `INVALID_DEAL_STATUS`、409 `INSUFFICIENT_QUANTITY`（附 `product_id`、`available`、`in_draft`）。

`POST /api/deals/items/batch`

```json
{ "deal_id": "deal_...", "items": [
  { "product_id": "prd_a", "quantity": 2 },
  { "product_id": "prd_b", "quantity": 1 }
] }
```

一次加入／累加多個項目，只留一則系統訊息。驗證同釣客、每項可售量與草稿狀態；同一商品重複出現時先合併數量再檢查。錯誤：400 `MISSING_ITEMS`（空陣列）、400 `WRONG_SELLER`、404 `PRODUCT_NOT_FOUND`、409 `INVALID_DEAL_STATUS`、409 `INSUFFICIENT_QUANTITY`。

`PATCH /api/deals/items/:itemId`

```json
{ "deal_id": "deal_...", "quantity": 2 }
```

尾數必須 1 以上且不超過目前可售。錯誤：404 `ITEM_NOT_FOUND`、409 `INSUFFICIENT_QUANTITY`（附 `item_id`、`product_id`、`available`）。

`DELETE /api/deals/items/:itemId?deal_id=deal_...` 與 `DELETE /api/deals/items?deal_id=deal_...`

刪除單項或清空。項目存在是刪除單項的前提（404 `ITEM_NOT_FOUND`）；清空允許草稿變成 0 項。兩者都只允許買家在 `DRAFT` 時呼叫。逐項移除不留系統訊息；清空端點保留給舊資料／內部使用，UI 不提供「清空全部」。

`POST /api/deals/propose`

```json
{ "deal_id": "deal_...", "final_price": 4800,
  "meetup_location": "基隆火車站南站 7-11 門口",
  "meetup_time": "2026-10-25T17:30:00+08:00" }
```

逐項檢查 `quantity ≤ available`，不足回 409 `INSUFFICIENT_QUANTITY` 並附 `product_id`、`available`、`item_id`；訂單維持原狀態。成功後進入 `PENDING_REVIEW`、`lock_expires_at = now + 30 分`、`deal_terms` 寫入、發起方對應的 `buyer_confirmed` 或 `seller_confirmed` 為真，並插入協議卡與系統訊息。同一個交易房已有一筆 `PENDING_REVIEW`／`NEGOTIATING` 時回 409 `DEAL_IN_PROGRESS`。

`NEGOTIATING` 的訂單也可以送出：只有 `rejected_by` 本人（退回方）能重送，成功後重新進入 `PENDING_REVIEW`，發起方改為重送的人，另一方的簽核歸零。重送時逐項比對的可售會把這筆訂單自己的保留加回來，避免「整批都保留在這筆訂單」時被自己的保留卡住。

錯誤：400 `EMPTY_DEAL`（沒有項目）、400 `INVALID_PRICE`、400 `MISSING_TERMS`、400 `FIELD_TOO_LONG`、400 `INVALID_MEETUP_TIME`、403 `FORBIDDEN`（不是退回方）、409 `INVALID_DEAL_STATUS`、409 `INSUFFICIENT_QUANTITY`、409 `DEAL_IN_PROGRESS`。

協議卡內容：`{ type: "deal", deal_id, status: "pending", initiator_id, final_price, meetup_location, meetup_time, items_total, items: [{ fish_species, title, quantity, unit_price, price_per_taijin }] }`。

`POST /api/deals/respond`

```json
{ "deal_id": "deal_...", "action": "AGREE" }
```

- `AGREE`：非發起方 → `CONFIRMED`、各項目 `sold_quantity += quantity`、寫 `confirmed_at`、雙方 `completed_deals + 1`、最新協議卡改 `confirmed`、插入系統訊息與評價卡。
- `REJECT`：legacy；非發起方 → `NEGOTIATING`、`hold_expires_at = now + 15 分`、`rejected_by` 記下退回方、最新協議卡改 `rejected`。新介面不再提供此動作。若訂單中任一商品已下架或已刪除，`REJECT` 直接取消訂單（`cancel_reason = OTHER`，`cancel_note` 為「商品已下架」或「商品已刪除」），不進入 `NEGOTIATING`，並留下系統訊息「商品已下架／已刪除，協議已取消。」

發起方自己呼叫回 403 `FORBIDDEN`；不是 `PENDING_REVIEW` 回 409 `INVALID_DEAL_STATUS`；`action` 不是 `AGREE`／`REJECT` 回 400 `INVALID_ACTION`。

`POST /api/deals/cancel`

```json
{ "deal_id": "deal_...", "note": "臨時有事，改天再約" }
```

任一方皆可，`DRAFT`／`PENDING_REVIEW`／`NEGOTIATING` 都能取消。`note` 是自由文字，最多 200 字；前端必填，API 接受空白（存 `null`），超過 200 字回 400 `FIELD_TOO_LONG`。後端固定寫入 `cancel_reason: "OTHER"` 與 `cancel_note: note`。取消後保留尾數立即釋放、最新協議卡改 `cancelled`、交易房留下系統訊息，並新增一張 `{ type: "deal_cancelled", deal_id, note }` 卡片訊息。已成交或已取消回 409 `INVALID_DEAL_STATUS`。

`POST /api/deals/reinitiate`

```json
{ "deal_id": "deal_..." }
```

只有買家、只有 `CANCELLED` 且 `cancel_reason = OTHER` 的訂單可以重新發起。後端在同一間交易房建立新的 `DRAFT`，複製原項目快照與數量；每項數量上限為目前可售，可售 0 的項目略過並在系統訊息提示。回 200 `{ deal, skipped }`，`skipped` 是 `[{ product_id, title }]`。錯誤：403 `FORBIDDEN`（不是買家）、404 `DEAL_NOT_FOUND`、409 `INVALID_DEAL_STATUS`（不是已取消，或不是使用者自行取消的 `OTHER`）、409 `DRAFT_EXISTS`（已有草稿）、409 `NO_AVAILABLE_ITEMS`（全部商品可售 0）。

### 8.1.1 逾時

`GET /api/conversations` 與 `GET /api/deals/:id` 會先掃描進行中訂單：`PENDING_REVIEW` 超過 `lock_expires_at`、legacy `NEGOTIATING` 超過 `hold_expires_at` 就轉 `CANCELLED`（原因 `LOCK_EXPIRED`／`HOLD_EXPIRED`），最新協議卡改 `expired`，並插入系統訊息。寫入端點（`propose`、`respond`、`cancel`）也會先掃描，過期的協議不能靠舊畫面續命。重複讀取不會重複取消或重複留言。逾時取消不提供重新發起。

### 8.2 評價

| 方法 | 路徑 | 權限 |
| --- | --- | --- |
| POST | `/api/reviews/submit` | 登入（且為該訂單參與者） |
| GET | `/api/reviews?user_id=&role=&sort=&rating=&offset=&limit=` | 公開 |

```json
{ "deal_id": "deal_...", "rating": 5, "tags": ["準時守約"], "comment": "…" }
```

- `rating` 必須是 1–5 的整數。
- `tags` 最多 3 個，只接受「魚貨新鮮」「準時守約」「溝通良好」「臨時放鳥」。
- `comment` 最多 100 字。
- `reviewer_id`、`target_user_id`、`reviewer_role` 由訂單與 Token 推導，不接受 client 指定；買家評釣客、釣客評買家。
- 只有 `CONFIRMED` 的訂單能評價；重複評價回 409 `ALREADY_REVIEWED`。
- 回 201 `{ review, target }`。`target` 是評價對象更新後的公開資料。伺服器用該對象的全部評價重算 `rating_score`、`review_count`；含「臨時放鳥」的評價會讓 `no_show_count` +1，達 3 次時 `is_blacklisted = true`。未到次數只累加，不會因重算而減少。
- 最新的評價卡會同步雙方的 `buyer_reviewed`／`seller_reviewed`。

`GET /api/reviews?user_id=1&role=seller&sort=newest&offset=0&limit=6`（公開）回：

```jsonc
{ "user_id": 1, "role": "seller",
  "summary": { "score": 4.9, "count": 18,
    "distribution": { "5": 15, "4": 2, "3": 1, "2": 0, "1": 0 } },
  "total": 18,
  "reviews": [{ "id": "rev_...", "rating": 5, "tags": ["魚貨新鮮"],
    "comment": "…", "created_at": "...", "reviewer_id": 2,
    "reviewer_name": "小魚買家", "reviewer_avatar_url": "/uploads/b.jpg",
    "reviewer_role": "buyer",
    "products": [{ "title": "紅魽（3尾 / 放血冰鎮）",
      "fish_species": "紅魽", "photo_url": "/uploads/a.jpg" }] }],
  "has_more": true }
```

- `role=seller`：該使用者作為釣客的評價，篩 `reviewer_role = buyer`；`role=buyer`：作為買家的評價，篩 `reviewer_role = seller`。省略 `role` 回整體評價，保留舊行為。
- `sort`：`newest`（預設）／`highest`／`lowest`；同分時以 `created_at` 新到舊。`rating`：1–5，只影響列表，不影響 `summary`。
- `offset` 預設 0；`limit` 預設 20、最大 50；個人資訊頁傳 6。
- `summary` 是該 role 的全部評價；`total` 是 role＋rating 篩選後的筆數；`has_more = offset + reviews.length < total`。
- `products` 從 `reviews.deal_id` 對到 `deals.items` 快照，最多 3 筆；`product_count` 一律回傳該訂單的項目總數，讓前端顯示 `+N`。
- 評價者只回 `reviewer_name` 與 `reviewer_avatar_url`，不回電話、地址或其他會員欄位。找不到使用者回 404 `USER_NOT_FOUND`。
- 省略 `role` 時，回應可同時保留舊的 `rating_score`／`review_count` 別名，避免舊呼叫端壞掉。

### 8.3 行情

> 2026-10-29：行情全面改以官方代碼為鍵。`/api/market/prices` 只接受 `code`；`/api/market/quote` 接受名稱並完成查代碼與查價。每次價格查詢都重抓上游，成功後寫入 `db.json`；上游失敗且無本機資料才回 `found:false`。手動 CLI 仍使用快取，見 `npm run market:fetch`。

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| GET | `/api/market/codes?q=` | 公開 | 官方代碼字典；省略 `q` 回完整字典 |
| GET | `/api/market/quote?q=&region=&date=&include=history&days=7` | 公開 | 名稱→代碼→價格；多候選回 `AMBIGUOUS_SPECIES` |
| GET | `/api/market/prices?code=&region=&date=&include=history&days=7` | 公開 | 代碼查價；`include=history` 加回歷史；`days` 為最近 7 或 30 個日曆天 |
| GET | `/api/market/markets` | 公開 | 市場對照表（唯讀，21 筆） |

- `region` 省略 → 全國平均，回應 `region: null`、`scope: "national"`；`region` 無效 → 400 `INVALID_REGION`。縣市比對前把「臺」正規化為「台」。
- 縣市平均只納入 `market_locations.verified = true` 的市場；全國平均納入所有已抓到的市場，包含未確認市場。
- `date` 用 ISO `YYYY-MM-DD`，語意「該日或之前最近交易日」；省略取該魚種最近交易日。
- 代碼不是數字或缺少代碼 → 400 `INVALID_SPECIES`；字典查無此代碼 → 404 `SPECIES_NOT_FOUND`。
- 名稱對到多個代碼 → 409 `AMBIGUOUS_SPECIES`，附 `candidates`。
- 查無交易資料 → 200 `found:false, reason:"NO_TRADE_DATA"`。
- 上游失敗且無快取 → 200 `found:false, reason:"UPSTREAM_UNAVAILABLE"`；有快取就回快取。
- 行情 API 公開，不需 Token；字典快取與價格查詢是兩個不同快取層。

```jsonc
{ "success": true, "data": {
    "found": true, "species_code": 2141, "official_name": "土魠",
    "scope": "city", "region": "高雄市", "trade_date": "2026-10-22",
    "price_per_kg": 52.4, "price_per_taijin": 31.4,
    "is_aquaculture": false,
    "source": "農業部漁產品交易行情", "source_url": "...",
    "fetched_at": "...", "quality": "official",
    "history": [
      { "trade_date": "2026-10-16", "price_per_kg": 50.1, "price_per_taijin": 30.1 },
      { "trade_date": "2026-10-22", "price_per_kg": 52.4, "price_per_taijin": 31.4 }
    ] } }
```

- `price_per_kg`／`price_per_taijin` 都是平均價，不是範圍；四捨五入到小數 1 位。
- `found:false` 只回 `found`、`reason`、`species_code`、`official_name`、`is_aquaculture`，不得帶 `price_per_kg`／`price_per_taijin` 或任何價格數字。
- `scope = "national"` 時保留請求的 `region`，前端顯示「全國平均」。
- `include=history` 只回該次查詢的 `scope`（縣市或全國）每日平均價；`days` 是最近 N 個日曆天（7 或 30），回傳該範圍內所有有交易的日期（週末休市日不會補到 N 筆）；抓取時往回抓 N 個日曆天並多留 7 天緩衝，涵蓋休市日與資料落後。未帶 `include=history` 時省略 `history` 欄位。
- `is_aquaculture: true` 時，助手行情查詢成功一律回行情卡；卡片不顯示「養殖價格」標記。
- `summary` 端點已移除；走勢改用 `include=history`。

## 9. 錯誤碼總表

| code | HTTP | 出現位置 |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | 所有需登入端點 |
| `FORBIDDEN` | 403 | 對話、商品生命週期 |
| `NOT_FOUND` | 404 | 未定義路徑 |
| `PRODUCT_NOT_FOUND` | 404 | 商品查詢、交易、生命週期 |
| `PRODUCT_ALREADY_DELISTED` | 409 | 下架（已下架） |
| `PRODUCT_SOLD_OUT` | 409 | 下架（已售出，請直接刪除） |
| `PRODUCT_NOT_DELISTED` | 409 | 重新上架（商品未下架） |
| `PRODUCT_HAS_NO_STOCK` | 409 | 重新上架（已無未售尾數） |
| `PRODUCT_MUST_BE_DELISTED` | 409 | 刪除（上架中／洽談中須先下架） |
| `PRODUCT_DELISTED` | 409 | 交易流程（商品已下架） |
| `DEAL_NOT_FOUND` | 404 | 訂單 |
| `ITEM_NOT_FOUND` | 404 | 訂單項目 |
| `CONVERSATION_NOT_FOUND` | 404 | 對話 |
| `MISSING_FIELDS` | 400 | 註冊 |
| `MISSING_REGION` | 400 | 註冊（缺縣市） |
| `INVALID_REGION` | 400 | 註冊、個人檔案、行情（縣市不在清單） |
| `DUPLICATE_PHONE` | 409 | 註冊 |
| `PHONE_TAKEN` | 409 | 個人檔案（電話已被使用） |
| `INVALID_PHONE` | 400 | 個人檔案（電話格式錯誤） |
| `INVALID_AVATAR` | 400 | 個人檔案（頭像網址格式錯誤） |
| `INVALID_CREDENTIALS` | 401 | 登入 |
| `INVALID_NICKNAME` | 400 | 個人檔案 |
| `FIELD_TOO_LONG` | 400 | 個人檔案、上架（處理方式） |
| `NO_CHANGES` | 400 | 個人檔案、context |
| `MISSING_SPECIES` | 400 | 上架、行情整合查詢（缺名稱／代碼） |
| `INVALID_WEIGHT` | 400 | 上架 |
| `INVALID_QUANTITY` | 400 | 上架 |
| `MISSING_CONDITION` | 400 | 上架（處理方式空白） |
| `INVALID_CONDITION` | 400 | 上架（處理方式只有數字或單位） |
| `MISSING_PRICE` | 400 | 上架（整批與每台斤都沒填） |
| `INVALID_PRICE` | 400 | 上架（售價 ≤ 0） |
| `OWN_PRODUCT` | 400 | 開啟交易房（自己的商品） |
| `OWN_PROFILE` | 400 | 由個人資訊開交易房（自己） |
| `MISSING_PHOTO` | 400 | 上架 |
| `MISSING_CONVERSATION` | 400 | 訊息 |
| `MISSING_MESSAGE` | 400 | AI 回覆（缺少 `message_id`） |
| `MESSAGE_NOT_FOUND` | 404 | AI 回覆（訊息不屬於房間或目前使用者） |
| `INVALID_MESSAGE` | 400 | AI 回覆（非文字訊息） |
| `EMPTY_MESSAGE` | 400 | 訊息 |
| `MESSAGE_TOO_LONG` | 400 | 訊息 |
| `AI_NOT_ACTIVE` | 409 | 訊息 |
| `NOT_ASSISTANT_ROOM` | 409 | context、clear、訊息 |
| `INVALID_CONTEXT` | 400 | 訊息 |
| `MISSING_IMAGE` / `INVALID_IMAGE` / `UNSUPPORTED_TYPE` / `EMPTY_IMAGE` | 400 | 上傳 |
| `IMAGE_TOO_LARGE` | 413 | 上傳 |
| `INSUFFICIENT_QUANTITY` | 409 | 開啟交易房、訂單項目、提案 |
| `INVALID_DEAL_STATUS` | 409 | 訂單項目、提案 |
| `WRONG_SELLER` | 400 | 訂單項目（不同釣客） |
| `EMPTY_DEAL` | 400 | 提案（沒有項目） |
| `MISSING_TERMS` | 400 | 提案（缺面交地點） |
| `INVALID_MEETUP_TIME` | 400 | 提案（時間無效） |
| `DEAL_IN_PROGRESS` | 409 | 提案（房間已有進行中訂單） |
| `INVALID_ACTION` | 400 | 回應協議（不是 AGREE／REJECT） |
| `MISSING_ITEMS` | 400 | 批次加購（沒有項目） |
| `DRAFT_EXISTS` | 409 | 重新發起（已有草稿） |
| `NO_AVAILABLE_ITEMS` | 409 | 重新發起（全部商品可售 0） |
| `INVALID_RATING` | 400 | 評價（星等不是 1–5） |
| `INVALID_TAGS` | 400 | 評價（標籤格式或名稱無效） |
| `TOO_MANY_TAGS` | 400 | 評價（超過 3 個標籤） |
| `COMMENT_TOO_LONG` | 400 | 評價（評語超過 100 字） |
| `DEAL_NOT_CONFIRMED` | 409 | 評價（訂單未成交） |
| `ALREADY_REVIEWED` | 409 | 評價（重複送出） |
| `USER_NOT_FOUND` | 404 | 公開評價列表、公開個人資訊 |
| `INVALID_SPECIES` | 400 | 行情（缺少代碼或代碼不是數字） |
| `SPECIES_NOT_FOUND` | 404 | 行情（字典查無名稱或代碼） |
| `AMBIGUOUS_SPECIES` | 409 | 行情（名稱對到多個代碼） |
| `CATALOG_UNAVAILABLE` | 503 | 行情（字典尚未同步且沒有舊字典） |
| `INVALID_DATE` | 400 | 行情（日期格式錯誤） |
| `NO_TRADE_DATA` | 200 | 行情（查無交易資料，不是錯誤） |
| `UPSTREAM_UNAVAILABLE` | 200 | 行情（上游失敗且無快取） |
| `LLM_DISABLED` | 200 | AI 回覆（`LLM_ENABLED` 關閉，`data.error_code`） |
| `LLM_NOT_CONFIGURED` | 200 | AI 回覆（缺少 `GEMINI_API_KEY`） |
| `LLM_TIMEOUT` | 200 | AI 回覆（模型或行情上游逾時，靜默 fallback；國外天氣網路逾時改回「查不到」，在地天氣／海況／潮汐逾時回缺少資料說明） |
| `LLM_UPSTREAM_ERROR` | 200 | AI 回覆（模型或行情上游 5xx／連線失敗；國外天氣網路上游錯誤改回「查不到」） |
| `LLM_INVALID_OUTPUT` | 200 | AI 回覆（JSON、schema、長度不合格，或模型使用未提供的工具） |
| `LLM_GUARD_REJECTED` | 200 | AI 回覆（平台／在地數字、方向、日期或潮汐時間無依據，天氣回覆混入海況，釣魚建議用語不合格或工具呼叫超過上限） |
| `LLM_RATE_LIMITED` | 200 | AI 回覆（模型 429，`retryable:true`） |
| `SEARCH_RATE_LIMITED` | 200 | AI 回覆（Tavily 429，`retryable:true`） |
| `SEARCH_QUOTA_EXHAUSTED` | 200 | AI 回覆（Tavily 額度用完，`retryable:true`） |

## 10. 契約陷阱（前端容易踩）

| 陷阱 | 正確做法 |
| --- | --- |
| 註冊／登入的 `token`、`user` 在 `data` 裡，不是頂層 | 讀 `res.data.token` |
| 訊息增量參數是 `after_seq`，不是 ISO 時間 | 傳上次的 `seq` |
| 建立訂單以外，`user_id` 一律由 Token 決定 | 不要傳 `seller_id` / `reviewer_id` |
| 商品 `price` 是整批總價 | 不要乘尾數 |
| `GET /api/products` 只回公開狀態 | 需要已下架／已售出清單請用 `/api/products/mine` |
| 商品刪除是硬刪 | `GET /api/products/:id` 回 404；照片與訂單快照仍保留 |
| 重新上架會更新 `listed_at` | 公開列表會排到最前面 |
| `GET /api/products` 會順便釋放逾時訂單 | 不要假設它是純讀取 |
| `/api/fish/data` 已移除 | 瀏覽頁一律用 `/api/products` |
| `sender_type: "ai"` 不是身分證明 | 只有房間參與者能寫訊息；跨房寫入一律 403 |
| 交易房的 `peer.username` 是完整電話 | 交易房標題列直接顯示，加 `tel:` 連結；有訂單時 `peer` 用角色評分，純聊天房用對話摘要的整體評分 |
| 交易房訊息只走真人訊息 | 前端不得再呼叫規則引擎；後端也會擋 `sender_type: "ai"` |
| `item_id` 只在同一筆訂單內唯一 | 改尾數／刪項目要同時帶 `deal_id` |
| 草稿不保留庫存 | `available` 仍包含草稿中的尾數；同一草稿的累計不得超過 `available` |
| 協議卡 `status` 是小寫 `pending` 等 | 訂單本身是 `deal_status` 大寫 `PENDING_REVIEW` |
| 發起方不能同意自己的協議 | 只有對方能 `AGREE`／`REJECT`；任一方都能 `cancel` |
| 協議卡只有最新一張會跟著狀態更新 | 舊卡保留 `rejected` 等歷史狀態 |
| 舊文件寫的 `createFish()` / `deleteFish()` 已不存在 | 上架只用 `POST /api/products/create` |
| `price` 是上架整批售價，`price_per_taijin` 是每台斤售價，`unit_price` 是每尾均價 | 三個都要標清楚；不要把整批價乘以尾數 |
| `price_auto: true` 只會出現在舊資料 | 新商品一律 `false`；畫面不顯示「自動計算」 |
| 行情查詢回的是平均價數字，不是 low／avg／high 物件 | `data.price_per_kg`、`data.price_per_taijin` 直接是 number |
| 行情卡走勢要帶 `include=history`；沒有 `summary` 端點 | 用 `days=7` 或 `days=30`（最近 7／30 個日曆天） |
| `is_aquaculture: true` | 行情查詢成功時回行情卡；卡片不顯示「養殖價格」標記 |
| 助手房可以有多間 | 每間有自己的 `context` 與草稿；不要假設只有一間 |
| 交易房任何狀態都能刪 | 未成交訂單與訊息會移除；已成交訂單與評價保留，之後再交易開新房間 |
| 商品不保存行情 | 商品卡與推薦卡不顯示行情；上架行情卡才是行情顯示處 |
| 取消上架會刪除目前 AI 對話 | 前端要先確認，再呼叫 `DELETE /api/conversations/:id`；刪除成功後立即建立並開啟新的助手房 |
| `seller_terms_accepted_at` 有值就永久跳過法規告知 | 不要每次賣魚都重問或重送 consent |
| 法規告知卡按「取消」不記錄同意 | 取消後回 idle；下次賣魚再顯示 |
| 同意只由 `POST /api/users/seller-consent` 寫入 | `chat/message` 的 `legal_consent` 卡只是 UI，不是同意紀錄 |
| `weight_kg` 是選填／legacy | 不要因缺少重量而拒絕上架；商品卡、推薦卡、交易房都不顯示重量 |
| 公開個人資訊不可重用 `publicUser` | 只回公開白名單；電話、地址、銀行、`username` 一律不出現 |
| `GET /api/reviews?role=seller` 是「作為釣客的評價」 | 實際篩 `reviewer_role = buyer`；`role=buyer` 才是 `reviewer_role = seller` |
| 評價商品照片不是新欄位 | 從 `deals.items` 快照帶出，最多 3 筆；不要另外上傳評價照片 |
| 電話修改不改 token | 不要強制登出；更新本機會員資料與 nav 的電話即可 |
| `initiate-room` 的 `seller_id` 是個人資訊頁的擁有者 | 目前使用者是買家；不能傳自己 |
| 純聊天房沒有 `deal` | `deal: null`、`has_products: false`；不要顯示浮動購物車或 `發送交易` |
| 取消原因改成自由文字 `note` | 不要再傳 `reason`；後端固定寫 `cancel_reason: "OTHER"` 與 `cancel_note` |
| 批次加購只留一則系統訊息 | 用 `POST /api/deals/items/batch`，不要逐項呼叫 `POST /api/deals/items` |
| 重新發起只限 `CANCELLED` 且 `cancel_reason = OTHER` | 逾時取消不能重新發起；已有草稿回 409 `DRAFT_EXISTS` |
| 商品標題格式是 `{魚種}（{尾數}尾 / {處理}）` | 商品卡、推薦卡、交易房、協議卡只顯示 `fish_species`，不要解析長標題 |
| `POST /api/ai/reply` 不寫訊息、不改 context | 前端仍用 `POST /api/chat/message` 寫入 AI 文字；平台意圖只套用 slots 後走規則 |
| AI 回覆失敗也是 HTTP 200 | 讀 `data.handled` 與 `data.error_code`，不要用 HTTP 狀態判斷是否 fallback |
| AI 只在助手房 | 交易房不要呼叫 `/api/ai/reply`；後端也會擋 |
| `LLM_ENABLED` 預設關閉 | 本機沒設金鑰時助手仍走規則，不是故障 |
