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
| 32 | GET | `/api/reviews?user_id=&role=&sort=&rating=&offset=&limit=` | 公開 | 🟡 角色／分頁已完成；⬜ 排序／篩選／分布 |
| 33 | GET | `/api/market/quote` | 公開 | ✅ 名稱→代碼→價格整合查詢 |
| 34 | GET | `/api/market/markets` | 公開 | ✅ 市場對照 |
| 35 | GET | `/api/market/prices` | 公開 | ✅ 代碼查價（含 `include=history`） |
| 36 | GET | `/api/products/mine` | 登入 | ✅ 上架紀錄（所有未刪除商品） |
| 37 | POST | `/api/products/:id/delist` | 登入（擁有者） | ✅ 下架 |
| 38 | POST | `/api/products/:id/relist` | 登入（擁有者） | ✅ 重新上架 |
| 39 | DELETE | `/api/products/:id` | 登入（擁有者） | ✅ 硬刪 |

### 2.1 本版新增／變更的端點

交易房改版新增批次加購與重新發起；商品建立改為整批售價必填、重量選填；取消改為自由文字 `note`。

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公開 | 變更：新增 `city`（必填） |
| POST | `/api/users/seller-consent` | 登入 | 新增：記錄第一次販賣確認 |
| GET | `/api/users/:id` | 公開 | 新增：公開個人資訊與角色評分 |
| PUT | `/api/users/profile` | 登入 | 變更：接受 `phone`、`avatar_url`；電話唯一 |
| POST | `/api/deals/initiate-room` | 登入 | 新增：由個人資訊開交易房；無商品時純聊天 |
| POST | `/api/products/create` | 登入 | 變更：整批售價必填、每台斤選填、重量選填、不再自動計算；ID 使用 `nextProductCode()`、寫入 `listed_at` |
| GET | `/api/products` | 公開 | 變更：只回 `ACTIVE`／`PARTIALLY_RESERVED`，依 `listed_at` 排序 |
| GET | `/api/products/mine` | 登入 | 新增：目前釣客所有未刪除商品 |
| POST | `/api/products/:id/delist` | 登入（擁有者） | 新增：下架 |
| POST | `/api/products/:id/relist` | 登入（擁有者） | 新增：重新上架 |
| DELETE | `/api/products/:id` | 登入（擁有者） | 新增：刪除已下架或已售出商品 |
| POST | `/api/deals/items/batch` | 登入（買家） | 新增：一次加入多個商品，只留一則系統訊息 |
| POST | `/api/deals/reinitiate` | 登入（買家） | 新增：取消後複製最後一筆訂單為新草稿 |
| POST | `/api/deals/cancel` | 參與者 | 變更：接受自由文字 `note` |
| DELETE | `/api/conversations/:id` | 參與者 | 新增：刪除助手房、純聊天房或已取消交易房 |
| GET | `/api/reviews` | 公開 | 變更：支援 `role`、`sort`、`rating`、`offset`、`limit`；回角色摘要、分布與商品照片 |
| GET | `/api/market/codes` | 公開 | 新增：官方代碼字典與候選查詢 |
| GET | `/api/market/quote` | 公開 | 新增：名稱→代碼→價格整合查詢 |
| GET | `/api/market/prices` | 公開 | 變更：只接受 `code`，支援 `include=history` |
| GET | `/api/market/markets` | 公開 | 新增：市場對照表 |

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
  "price": 1000, "price_per_taijin": 200,
  "region": "新北市", "location": "新北市瑞芳區鼻頭路 1 號",
  "catch_time": "2026-10-25T14:00:00+08:00" }
```

伺服器行為：

- `seller_id` 取自 Token，client 傳的值一律忽略。
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
- 回 201，`data` 是含衍生欄位的商品。

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

`order` 只在交易房有進行中訂單時才有值：`{ id, status, cancel_reason, item_count, total_quantity, final_price, review_status, updated_at }`；`cancel_reason` 讓前端區分逾時與主動取消。`last_order` 是最新一筆訂單的摘要，不限狀態；`orders` 是這間房所有訂單摘要（新到舊），供評價卡等歷史卡片更新。沒有訂單的助手房三者皆為 `null` 或空陣列。`updated_at` 在每次加購、改量、刪除、清空、提案、回應、取消、逾時或評價時更新，前端用來判斷何時重抓明細；`last_order` 的 `id`、`status` 或 `updated_at` 改變時，前端會重取 `GET /api/deals/:id`。

交易房的 `peer` 使用 `publicUser`，因此含 `id`、`display_name`、`username`（完整電話）、`rating_score`、`review_count` 等公開欄位；前端用 `rating_score`／`review_count` 顯示標題列星星，用 `username` 顯示 `tel:` 電話。交易房開啟後，`GET /api/deals/:id` 的 `peer` 會依目前使用者的交易角色提供角色評分；對話摘要的 `peer` 仍是整體評分。助手房的 `peer` 固定是 `{ id: "ai", display_name: "小幫手", username: "" }`。

交易房方向固定：`buyer_id` 是按「聊聊」或「洽談購買」的人，`seller_id` 是被看／商品擁有者；反向交易是另一間房。由個人資訊開啟且對方沒有商品時，房間沒有任何 `deals`，是純聊天房；`order`、`last_order`、`orders` 皆為 `null` 或空陣列。

未讀數不含自己送出的訊息。助手房的系統訊息不算未讀；交易房的系統訊息（開房、加購通知）算未讀。`deletable` 表示這間房目前是否可刪（助手房恆為 true；沒有任何訂單的純聊天房為 true；有訂單的交易房需全部訂單皆已取消）。

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

> **設計限制**：AI 回覆目前由前端規則引擎產生後回寫，伺服器無法分辨「真助手」與「使用者代寫」。伺服器保證的是**不得跨房間寫入**；使用者在自己的助手房裡代寫 AI 訊息只會騙到自己。接上伺服器端 LLM 後應改為 `POST /api/ai/reply`，由後端寫入（M6）。

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
- **交易房**：只有在房內沒有任何 `CONFIRMED` 訂單，且目前訂單 `deal_status = "CANCELLED"`（或全部訂單皆 `CANCELLED`）時才能刪；刪除時一併移除訊息、該房所有 `deals` 與訂單項目，交易紀錄不再顯示。有成交歷史或進行中（`DRAFT`／`PENDING_REVIEW`／`NEGOTIATING`）訂單時，回 409 `DEAL_NOT_DELETABLE`。
- 回 200 `{ deleted: true }`。
- 錯誤：404 `CONVERSATION_NOT_FOUND`、403 `FORBIDDEN`、409 `DEAL_NOT_DELETABLE`。

## 6. 上傳

### `POST /api/uploads`

```json
{ "filename": "photo.jpg", "data": "data:image/jpeg;base64,..." }
```

- 只接受 `image/jpeg`、`image/png`、`image/webp`。
- 解碼後上限 5MB。
- 存成 `backend/uploads/{uuid}.{ext}`。
- 商品照片與個人頭像共用這個端點；上傳後把 URL 寫入商品或 `users.avatar_url`。
- 回 200：`{ "url": "/uploads/ab12cd34.jpg" }`（在 `data` 裡）。

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
| POST | `/api/deals/initiate-room` | 登入 | ⬜ 由個人資訊建立／沿用交易房；無商品時純聊天 |
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

回 200：`{ conversation, deal, product }`。行為：以 `product.seller_id` 找或建立交易房（唯一鍵 `buyer_id + seller_id`）→ 找或建立草稿訂單 → 加入或累加項目 → 房間轉 `HUMAN` → 插入系統訊息（第一次開房時另有「已進入交易洽談」）。再次洽談同一位釣客的另一個商品時，一律加入或累加，不清空既有草稿；舊客戶端若帶 `replace_items` 也忽略。`conversation` 是對話摘要（含 `peer.username` 完整電話與 `order`），`deal` 是草稿訂單，項目為商品快照。

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

回 200 `data` 是訂單：`items[]` 每項附 `available`（目前可售尾數），`items_total` 由 `unit_price × quantity` 重算；另附 `cancel_reason`、`cancelled_by`（取消原因與操作者，未取消為 `null`）、`peer`（對方的公開資料；依目前使用者的交易角色附角色評分 `rating_score`／`review_count`）、`role`（`buyer`／`seller`）、`my_reviewed` 與 `peer_reviewed`。非參與者 403 `FORBIDDEN`，不存在 404 `DEAL_NOT_FOUND`。

**副作用**：讀取前會先做逾期掃描，可能讓這筆訂單轉為 `CANCELLED` 並留下系統訊息。

`GET /api/deals`

回目前使用者參與的所有訂單，依「成交時間，未成交則建立時間」由新到舊（`confirmed_at || created_at`）。每筆含 `id`、`deal_status`、`created_at`、`confirmed_at`、`item_count`、`total_quantity`、`items_total`、`final_price`（有 `deal_terms` 用整單金額，否則用小計）、`review_status`、`role`、`my_reviewed`、`peer_reviewed`、`peer`。讀取前同樣會做逾期掃描。

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

一次加入／累加多個項目，只留一則系統訊息。驗證同賣家、每項可售量與草稿狀態；同一商品重複出現時先合併數量再檢查。錯誤：400 `MISSING_ITEMS`（空陣列）、400 `WRONG_SELLER`、404 `PRODUCT_NOT_FOUND`、409 `INVALID_DEAL_STATUS`、409 `INSUFFICIENT_QUANTITY`。

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
- `products` 從 `reviews.deal_id` 對到 `deals.items` 快照，最多 3 筆；超過時另回 `product_count`。
- 評價者只回 `reviewer_name` 與 `reviewer_avatar_url`，不回電話、地址或其他會員欄位。找不到使用者回 404 `USER_NOT_FOUND`。
- 省略 `role` 時，回應可同時保留舊的 `rating_score`／`review_count` 別名，避免舊呼叫端壞掉。

### 8.3 行情

> 2026-10-29：行情全面改以官方代碼為鍵。`/api/market/prices` 只接受 `code`；`/api/market/quote` 接受名稱並完成查代碼與查價。每次價格查詢都重抓上游，成功後寫入 `db.json`；上游失敗且無本機資料才回 `found:false`。手動 CLI 仍使用快取，見 `npm run market:fetch`。

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| GET | `/api/market/codes?q=` | 公開 | 官方代碼字典；省略 `q` 回完整字典 |
| GET | `/api/market/quote?q=&region=&date=&include=history&days=7` | 公開 | 名稱→代碼→價格；多候選回 `AMBIGUOUS_SPECIES` |
| GET | `/api/market/prices?code=&region=&date=&include=history&days=7` | 公開 | 代碼查價；`include=history` 加回歷史；`days` 為最近 7 或 30 個交易日 |
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
- `include=history` 只回該次查詢的 `scope`（縣市或全國）每日平均價；`days` 是最近 N 個交易日（7 或 30），回傳最多 N 筆有交易的日期；抓取時需涵蓋足夠日曆日。未帶 `include=history` 時省略 `history` 欄位。
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
| `EMPTY_MESSAGE` | 400 | 訊息 |
| `MESSAGE_TOO_LONG` | 400 | 訊息 |
| `AI_NOT_ACTIVE` | 409 | 訊息 |
| `NOT_ASSISTANT_ROOM` | 409 | context、clear、訊息 |
| `DEAL_NOT_DELETABLE` | 409 | 刪除交易房（有成交歷史或非 CANCELLED） |
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
| 行情卡走勢要帶 `include=history`；沒有 `summary` 端點 | 用 `days=7` 或 `days=30`（最近 7／30 個交易日） |
| `is_aquaculture: true` | 行情查詢成功時回行情卡；卡片不顯示「養殖價格」標記 |
| 助手房可以有多間 | 每間有自己的 `context` 與草稿；不要假設只有一間 |
| 交易房只有 `CANCELLED` 能刪 | 房內必須沒有 `CONFIRMED` 歷史；刪除會一併移除該房所有訂單與項目 |
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
