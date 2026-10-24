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

## 2. 端點總表（現況）

| # | 方法 | 路徑 | 權限 | 狀態 |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/auth/register` | 公開 | ✅ |
| 2 | POST | `/api/auth/login` | 公開 | ✅ |
| 3 | POST | `/api/auth/signin` | 公開 | ✅（登入別名） |
| 4 | GET | `/api/auth/me` | 登入 | ✅ |
| 5 | PUT | `/api/users/profile` | 登入 | ✅ |
| 6 | GET | `/api/products` | 公開 | ✅ |
| 7 | GET | `/api/products/:id` | 公開 | ✅ |
| 8 | POST | `/api/products/create` | 登入 | ✅ |
| 9 | GET | `/api/species` | 公開 | ✅ |
| 10 | GET | `/api/conversations` | 登入 | ✅ |
| 11 | POST | `/api/conversations/assistant` | 登入 | ✅ |
| 12 | GET | `/api/conversations/:id/messages` | 參與者 | ✅ |
| 13 | POST | `/api/chat/message` | 參與者 | ✅ |
| 14 | PUT | `/api/conversations/:id/context` | 參與者（助手房） | ✅ |
| 15 | POST | `/api/conversations/:id/read` | 參與者 | ✅ |
| 16 | POST | `/api/conversations/:id/clear` | 參與者（助手房） | ✅ |
| 17 | POST | `/api/uploads` | 登入 | ✅ |
| 18 | GET | `/uploads/*` | 公開 | ✅ 靜態檔 |

## 3. 會員

### `POST /api/auth/register`

```json
{ "username": "0912345678", "password": "secret123", "display_name": "阿海", "role": "SELLER" }
```

回 201：`data = { token, user }`。`role` 只接受 `BUYER` / `SELLER`，其他值一律 `BUYER`。
錯誤：400 `MISSING_FIELDS`、409 `DUPLICATE_PHONE`。

### `POST /api/auth/login`

```json
{ "username": "0912345678", "password": "secret123" }
```

回 200：`data = { token, user }`。錯誤：401 `INVALID_CREDENTIALS`。

### `GET /api/auth/me`

回傳 `publicUser`：全部會員欄位，**移除** `password`、`bank_code`、`bank_account`、`bank_account_name`，**加上** `display_address`、`region`。

### `PUT /api/users/profile`

```json
{ "display_name": "阿海", "city": "新北市", "district": "瑞芳區",
  "address_line": "鼻頭路 1 號", "bank_code": "", "bank_account": "", "bank_account_name": "" }
```

可接受 `nickname` 作為 `display_name` 的別名。暱稱 2–20 字；`city`/`district` ≤ 20、`address_line` ≤ 100、銀行欄位有各自上限。
錯誤：400 `INVALID_NICKNAME`、400 `FIELD_TOO_LONG`、400 `NO_CHANGES`。

## 4. 商品

### `GET /api/products`

| 參數 | 說明 |
| --- | --- |
| `region` | 子字串比對 `region`（例：`新北`） |
| `species` | 子字串比對 `fish_species` 或 `species_id` |
| `seller_id` | 精確比對 |
| `status` | 精確比對衍生狀態 `ACTIVE` / `PARTIALLY_RESERVED` / `SOLD_OUT` |
| `limit` | 取前 N 筆 |

回傳 `data` 是商品陣列（含衍生欄位），依 `created_at` 由新到舊。

**副作用**：每次呼叫前會掃描逾時訂單並釋放保留（`sweepExpired`）。GET 有寫入副作用是刻意的（沒有排程），文件化即可。

### `GET /api/products/:id`

回傳單一商品＋衍生欄位。錯誤：404 `PRODUCT_NOT_FOUND`。

### `POST /api/products/create`

```json
{ "fish_species": "石斑", "species_id": "grouper", "weight_kg": 4.5, "quantity": 1,
  "condition": "放血冰鎮", "photo_url": "/uploads/ab12.jpg", "price": 2800,
  "region": "新北市", "location": "新北市瑞芳區鼻頭路 1 號",
  "catch_time": "2026-10-25T14:00:00+08:00" }
```

伺服器行為：

- `seller_id` 取自 Token，client 傳的值一律忽略。
- `species_id` 先以 id 比對魚種字典，比對不到再用名稱比對；都沒有則存 `null`。
- `title` 自動產生：`{魚種}（{總重}kg / {尾數}尾 / {處理}）`。
- `market_reference_price` = 字典行情 ×（總重 ÷ 0.6）；比對不到魚種時等於 `price`。
- `sold_quantity = 0`；**不寫入 `status`**。
- `region` 預設個人檔案的縣市；`location` 預設三段地址串接。
- 回 201，`data` 是含衍生欄位的商品。

錯誤：400 `MISSING_SPECIES`、`INVALID_WEIGHT`、`INVALID_QUANTITY`、`INVALID_CONDITION`、`INVALID_PRICE`、`MISSING_PHOTO`。

驗證規則：重量 > 0；尾數 ≥ 1（無條件捨去小數）；處理方式必須是四種之一；售價 > 0；照片必填。

### 商品衍生欄位

```jsonc
{ "...商品欄位": "...",
  "reserved_quantity": 0, "available": 1, "unit_price": 2800,
  "avg_weight_kg": 4.5, "status": "ACTIVE" }
```

### `GET /api/species`

公開魚種清單，回傳 `data` 陣列。欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | 系統魚種識別碼 |
| `name`、`latin` | 正式名稱與學名 |
| `alias` | 別名陣列 |
| `category` | `fish`／`ceph`／`shellfish` |
| `texture`、`bones`、`cooking` | 料理屬性 |

行情 `market` 只在後端內部定價使用，不對外回傳。

## 5. 對話

### `GET /api/conversations`

回傳 `data`：目前使用者參與的所有房間摘要，依最後訊息時間由新到舊。

```jsonc
{ "id": "conv_...", "type": "assistant", "mode": "AI",
  "context": { "mode": "idle", "draft": null, "last_cards": [] },
  "peer": { "id": "ai", "display_name": "小幫手", "username": "" },
  "order": null,
  "last_message": { "...": "..." },
  "unread_count": 0,
  "created_at": "...", "last_message_at": "..." }
```

`order` 只在交易房有進行中訂單時才有值：`{ id, status, item_count, total_quantity, final_price }`。

### `POST /api/conversations/assistant`

找或建立目前使用者的助手房。首次建立時寫入一則招呼語並標記已讀。回傳同上摘要。

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

## 6. 上傳

### `POST /api/uploads`

```json
{ "filename": "photo.jpg", "data": "data:image/jpeg;base64,..." }
```

- 只接受 `image/jpeg`、`image/png`、`image/webp`。
- 解碼後上限 5MB。
- 存成 `backend/uploads/{uuid}.{ext}`。
- 回 200：`{ "url": "/uploads/ab12cd34.jpg" }`（在 `data` 裡）。

錯誤：400 `MISSING_IMAGE`、`INVALID_IMAGE`、`UNSUPPORTED_TYPE`、`EMPTY_IMAGE`、413 `IMAGE_TOO_LARGE`。

## 7. 已移除端點

| 端點 | 現況 |
| --- | --- |
| `GET /api/fish/data` | 已移除；瀏覽頁改用 `GET /api/products` |
| `PUT /api/fish/data/:id` | 已移除；交易改走交易房（尚未實作） |

舊購物車與手動上架表單也已在 M1 移除。

## 8. 目標端點

### 8.1 訂單

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| POST | `/api/deals/initiate-channel` | 登入 | 由商品建立／沿用交易房與草稿，加入項目 |
| POST | `/api/deals/items` | 登入 | 加購同一釣客的其他商品 |
| PATCH | `/api/deals/items/:itemId` | 登入 | 改尾數 |
| DELETE | `/api/deals/items/:itemId` | 登入 | 移除項目 |
| POST | `/api/deals/propose` | 登入 | 送協議，逐項檢查可售 |
| POST | `/api/deals/respond` | 登入 | `AGREE` / `REJECT` |
| POST | `/api/deals/cancel` | 登入 | 取消並釋放 |
| GET | `/api/deals` | 登入 | 交易紀錄列表 |
| GET | `/api/deals/:id` | 登入 | 訂單詳情（含快照） |

`POST /api/deals/initiate-channel`

```json
{ "product_id": "prd_...", "quantity": 2 }
```

回 `{ conversation, deal, product }`。行為：以 `product.seller_id` 找或建立交易房 → 找或建立草稿訂單 → 加入或累加項目 → 房間轉 HUMAN → 插入系統訊息。

`POST /api/deals/propose`

```json
{ "deal_id": "deal_...", "final_price": 4800,
  "meetup_location": "基隆火車站南站 7-11 門口",
  "meetup_time": "2026-10-25T17:30:00+08:00" }
```

逐項檢查 `quantity ≤ available`，不足回 409 `INSUFFICIENT_QUANTITY` 並附 `product_id`。成功後 `DRAFT → PENDING_REVIEW`、`lock_expires_at = now + 30 分`、發起方簽核為真、插入協議卡。

`POST /api/deals/respond`

```json
{ "deal_id": "deal_...", "action": "AGREE" }
```

- `AGREE`：非發起方 → `CONFIRMED`、各項目 `sold_quantity += quantity`、寫 `confirmed_at`、插入評價卡、雙方 `completed_deals + 1`。
- `REJECT`：→ `NEGOTIATING`、`hold_expires_at = now + 15 分`、協議卡狀態改 `rejected`、插入系統訊息。

`POST /api/deals/cancel`

```json
{ "deal_id": "deal_...", "reason": "SELLER_OUT_OF_STOCK" }
```

任一方皆可；釋放尾數、插入系統訊息、協議卡改 `cancelled`。

### 8.2 評價

| 方法 | 路徑 | 權限 |
| --- | --- | --- |
| POST | `/api/reviews/submit` | 登入（且為該訂單參與者） |

```json
{ "deal_id": "deal_...", "rating": 5, "tags": ["準時守約"], "comment": "…" }
```

`reviewer_id`、`target_user_id`、`reviewer_role` 由訂單與 Token 推導，不接受 client 指定。重複評價回 409 `ALREADY_REVIEWED`。評價對象必須是已成交的訂單。

### 8.3 行情

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/api/market/prices?species_id=&region=&date=` | 單筆行情（含全國備援） |
| GET | `/api/market/prices/summary?species_id=&region=&days=` | 每日均價序列（預設 30、上限 90） |
| GET | `/api/market/markets` | 市場對照表與未對照清單 |
| GET | `/api/market/species-codes` | 魚種代碼對照與未對照清單 |

```jsonc
{ "success": true, "data": {
    "found": true, "scope": "city", "region": "基隆市", "trade_date": "2026-10-22",
    "price_per_kg": { "low": 1033, "avg": 1237, "high": 1433 },
    "price_per_taijin": { "low": 620, "avg": 742, "high": 860 },
    "source": "農業部漁產品交易行情", "source_url": "...",
    "fetched_at": "...", "quality": "official" } }
```

查無資料仍回 200：`{ "found": false, "reason": "NO_TRADE_DATA" }`。

## 9. 錯誤碼總表

| code | HTTP | 出現位置 |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | 所有需登入端點 |
| `FORBIDDEN` | 403 | 對話 |
| `NOT_FOUND` | 404 | 未定義路徑 |
| `PRODUCT_NOT_FOUND` | 404 | 商品詳情 |
| `CONVERSATION_NOT_FOUND` | 404 | 對話 |
| `MISSING_FIELDS` | 400 | 註冊 |
| `DUPLICATE_PHONE` | 409 | 註冊 |
| `INVALID_CREDENTIALS` | 401 | 登入 |
| `INVALID_NICKNAME` | 400 | 個人檔案 |
| `FIELD_TOO_LONG` | 400 | 個人檔案 |
| `NO_CHANGES` | 400 | 個人檔案、context |
| `MISSING_SPECIES` | 400 | 上架 |
| `INVALID_WEIGHT` | 400 | 上架 |
| `INVALID_QUANTITY` | 400 | 上架 |
| `INVALID_CONDITION` | 400 | 上架 |
| `INVALID_PRICE` | 400 | 上架 |
| `MISSING_PHOTO` | 400 | 上架 |
| `MISSING_CONVERSATION` | 400 | 訊息 |
| `EMPTY_MESSAGE` | 400 | 訊息 |
| `MESSAGE_TOO_LONG` | 400 | 訊息 |
| `AI_NOT_ACTIVE` | 409 | 訊息 |
| `NOT_ASSISTANT_ROOM` | 409 | context、clear、訊息 |
| `INVALID_CONTEXT` | 400 | 訊息 |
| `MISSING_IMAGE` / `INVALID_IMAGE` / `UNSUPPORTED_TYPE` / `EMPTY_IMAGE` | 400 | 上傳 |
| `IMAGE_TOO_LARGE` | 413 | 上傳 |
| `INSUFFICIENT_QUANTITY` | 409 | 目標：提案 |
| `ALREADY_REVIEWED` | 409 | 目標：評價 |
| `INVALID_SPECIES` | 400 | 目標：行情 |
| `INVALID_DATE` | 400 | 目標：行情 |
| `NO_TRADE_DATA` | 200 | 目標：行情（不是錯誤） |
| `UPSTREAM_ERROR` | 502 | 目標：行情抓取 job |

## 10. 契約陷阱（前端容易踩）

| 陷阱 | 正確做法 |
| --- | --- |
| 註冊／登入的 `token`、`user` 在 `data` 裡，不是頂層 | 讀 `res.data.token` |
| 訊息增量參數是 `after_seq`，不是 ISO 時間 | 傳上次的 `seq` |
| 建立訂單以外，`user_id` 一律由 Token 決定 | 不要傳 `seller_id` / `reviewer_id` |
| 商品 `price` 是整批總價 | 不要乘尾數 |
| `GET /api/products` 會順便釋放逾時訂單 | 不要假設它是純讀取 |
| `/api/fish/data` 已移除 | 瀏覽頁一律用 `/api/products` |
| `sender_type: "ai"` 不是身分證明 | 只有房間參與者能寫訊息；跨房寫入一律 403 |
| 舊文件寫的 `createFish()` / `deleteFish()` 已不存在 | 上架只用 `POST /api/products/create` |
