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
| 19 | POST | `/api/deals/initiate-channel` | 登入 | ✅ 開啟／沿用交易房 |
| 20 | GET | `/api/deals/:id` | 參與者 | ✅ 訂單明細（含商品快照與可售） |
| 21 | POST | `/api/deals/items` | 登入（買家） | ✅ 加購同一釣客的商品 |
| 22 | PATCH | `/api/deals/items/:itemId` | 登入（買家） | ✅ 改尾數 |
| 23 | DELETE | `/api/deals/items/:itemId` | 登入（買家） | ✅ 刪除項目 |
| 24 | DELETE | `/api/deals/items` | 登入（買家） | ✅ 清空訂單 |
| 25 | POST | `/api/deals/propose` | 參與者 | ✅ 送出協議 |
| 26 | POST | `/api/deals/respond` | 參與者（非發起方） | ✅ 同意／退回 |
| 27 | POST | `/api/deals/cancel` | 參與者 | ✅ 取消並釋放 |
| 28 | GET | `/api/deals` | 登入 | ✅ 交易紀錄列表 |
| 29 | POST | `/api/reviews/submit` | 登入（參與者） | ✅ 送出評價 |
| 30 | GET | `/api/reviews?user_id=` | 公開 | ✅ 使用者的評價與平均 |
| 31 | GET | `/api/market/species-codes` | 公開 | ✅ 主要新鮮代碼對照 |
| 32 | GET | `/api/market/markets` | 公開 | ✅ 市場對照 |
| 33 | GET | `/api/market/prices` | 公開 | ✅ 行情（含 `include=history`） |

### 2.1 本版新增／變更的端點

行情三個端點已於 2026-10-27 實作（#21～#23）；其餘標記為目標的端點仍依 ticket 實作。

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公開 | 變更：新增 `city`（必填） |
| POST | `/api/users/seller-consent` | 登入 | 新增：記錄第一次販賣確認 |
| POST | `/api/products/create` | 登入 | 變更：每台斤／整批售價、處理方式自由文字 |
| DELETE | `/api/conversations/:id` | 參與者 | 新增：刪除助手房或已取消交易房 |
| GET | `/api/market/prices` | 公開 | 新增：行情（含 `include=history`） |
| GET | `/api/market/markets` | 公開 | 新增：市場對照表 |
| GET | `/api/market/species-codes` | 公開 | 新增：主要新鮮代碼對照表 |

## 3. 會員

### `POST /api/auth/register`

```json
{ "username": "0912345678", "password": "secret123", "display_name": "阿海",
  "city": "新北市", "role": "SELLER" }
```

回 201：`data = { token, user }`。`role` 只接受 `BUYER` / `SELLER`，其他值一律 `BUYER`。
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
{ "display_name": "阿海", "city": "新北市", "district": "瑞芳區",
  "address_line": "鼻頭路 1 號", "bank_code": "", "bank_account": "", "bank_account_name": "" }
```

可接受 `nickname` 作為 `display_name` 的別名。暱稱 2–20 字；`city`/`district` ≤ 20、`address_line` ≤ 100、銀行欄位有各自上限。`city` 若有值必須在縣市清單內，「臺」正規化為「台」。
錯誤：400 `INVALID_NICKNAME`、400 `INVALID_REGION`、400 `FIELD_TOO_LONG`、400 `NO_CHANGES`。

### `POST /api/users/seller-consent`

登入後記錄第一次販賣確認。伺服器設定 `seller_terms_accepted_at = now`，回 200 `{ user }`。已確認過則**不覆寫**原時間，仍回 200。這個同意永久有效，不因法規文字更新重問。
錯誤：401 `UNAUTHORIZED`。

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

> 2026-10-27：處理方式自由文字、每台斤／整批售價、自動計算與發布時行情快照已實作（#24、#26、#27）。

```json
{ "fish_species": "石斑", "species_id": "grouper", "weight_kg": 4.5, "quantity": 1,
  "condition": "放血冰鎮", "photo_url": "/uploads/ab12.jpg",
  "price": 1000, "price_per_taijin": 200,
  "region": "新北市", "location": "新北市瑞芳區鼻頭路 1 號",
  "catch_time": "2026-10-25T14:00:00+08:00" }
```

伺服器行為：

- `seller_id` 取自 Token，client 傳的值一律忽略。
- `species_id` 先以 id 比對魚種字典，比對不到再用名稱比對；都沒有則存 `null`。
- `title` 自動產生：`{魚種}（{總重}kg / {尾數}尾 / {處理}）`。
- `condition` 是自由文字：trim、非空、最多 20 字。
- 售價：
  - 只填 `price` → `price_per_taijin = null`、`price_auto = false`。
  - 只填 `price_per_taijin` → `price = round(price_per_taijin × weight_kg ÷ 0.6)`、`price_auto = true`。
  - 兩者都填 → 都保留、`price_auto = false`，**不檢查一致性**（整批可為折扣）。
  - 至少要有一個 > 0。
- 發布時查行情並寫入 `market_snapshot`；查無或上游失敗則為 `null`，商品仍建立。
- `sold_quantity = 0`；**不寫入 `status`**。
- `region` 預設個人檔案的縣市；`location` 預設三段地址串接。
- 回 201，`data` 是含衍生欄位的商品。

錯誤：400 `MISSING_SPECIES`、`INVALID_WEIGHT`、`INVALID_QUANTITY`、`MISSING_CONDITION`、`FIELD_TOO_LONG`、`MISSING_PRICE`、`INVALID_PRICE`、`MISSING_PHOTO`。

驗證規則：重量 > 0；尾數 ≥ 1（無條件捨去小數）；處理方式非空且 ≤ 20 字；整批與每台斤至少一個 > 0；照片必填。

### 商品衍生欄位

```jsonc
{ "...商品欄位": "...",
  "price": 1000, "price_per_taijin": 200, "price_auto": false,
  "unit_price": 1000, "market_snapshot": { "...": "..." },
  "reserved_quantity": 0, "available": 1,
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

魚種字典不再提供示意行情；行情對照與養殖標記見 `/api/market/species-codes`。

## 5. 對話

### `GET /api/conversations`

回傳 `data`：目前使用者參與的所有房間摘要，依最後訊息時間由新到舊。助手房可以有多筆，每筆有自己的 `context` 與草稿。

```jsonc
{ "id": "conv_...", "type": "assistant", "mode": "AI",
  "context": { "mode": "idle", "draft": null, "last_cards": [] },
  "peer": { "id": "ai", "display_name": "小幫手", "username": "" },
  "order": null,
  "last_message": { "...": "..." },
  "unread_count": 0,
  "created_at": "...", "last_message_at": "..." }
```

`order` 只在交易房有進行中訂單時才有值：`{ id, status, item_count, total_quantity, final_price, updated_at }`。`updated_at` 在每次加購、改量、刪除、清空、提案、回應、取消或逾時時更新，前端用來判斷何時重抓明細。

未讀數不含自己送出的訊息。助手房的系統訊息不算未讀；交易房的系統訊息（開房、加購通知）算未讀。

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
| GET | `/api/deals/:id` | 參與者 | ✅ 訂單明細，項目附目前可售尾數 |
| POST | `/api/deals/items` | 登入（買家） | ✅ 加購同一釣客的其他商品 |
| PATCH | `/api/deals/items/:itemId` | 登入（買家） | ✅ 改尾數 |
| DELETE | `/api/deals/items/:itemId` | 登入（買家） | ✅ 移除項目 |
| DELETE | `/api/deals/items` | 登入（買家） | ✅ 清空項目 |
| POST | `/api/deals/propose` | 參與者 | ✅ 送協議，逐項檢查可售 |
| POST | `/api/deals/respond` | 參與者（非發起方） | ✅ 同意／退回 |
| POST | `/api/deals/cancel` | 參與者 | ✅ 取消並釋放 |
| GET | `/api/deals` | 登入 | ✅ 交易紀錄列表 |

`POST /api/deals/initiate-channel`

```json
{ "product_id": "prd_...", "quantity": 2 }
```

回 200：`{ conversation, deal, product }`。行為：以 `product.seller_id` 找或建立交易房（唯一鍵 `buyer_id + seller_id`）→ 找或建立草稿訂單 → 加入或累加項目 → 房間轉 `HUMAN` → 插入系統訊息（第一次開房時另有「已進入交易洽談」）。`conversation` 是對話摘要（含 `peer.username` 完整電話與 `order`），`deal` 是草稿訂單，項目為商品快照。

錯誤：404 `PRODUCT_NOT_FOUND`、400 `INVALID_QUANTITY`、400 `OWN_PRODUCT`（自己的商品）、409 `INSUFFICIENT_QUANTITY`（附 `product_id`、`available`、`in_draft`）。

`GET /api/deals/:id`

回 200 `data` 是訂單：`items[]` 每項附 `available`（目前可售尾數），`items_total` 由 `unit_price × quantity` 重算；另附 `peer`（對方 `{ id, display_name }`）、`role`（`buyer`／`seller`）、`my_reviewed` 與 `peer_reviewed`。非參與者 403 `FORBIDDEN`，不存在 404 `DEAL_NOT_FOUND`。

**副作用**：讀取前會先做逾期掃描，可能讓這筆訂單轉為 `CANCELLED` 並留下系統訊息。

`GET /api/deals`

回目前使用者參與的所有訂單，依「成交時間，未成交則建立時間」由新到舊（`confirmed_at || created_at`）。每筆含 `id`、`deal_status`、`created_at`、`confirmed_at`、`item_count`、`total_quantity`、`items_total`、`final_price`（有 `deal_terms` 用整單金額，否則用小計）、`review_status`、`role`、`my_reviewed`、`peer_reviewed`、`peer`。讀取前同樣會做逾期掃描。

`POST /api/deals/items`

```json
{ "deal_id": "deal_...", "product_id": "prd_...", "quantity": 1 }
```

只有買家、只有 `DRAFT` 可以改。商品必須屬於同一釣客，否則 400 `WRONG_SELLER`。回 201 `{ deal }`，並插入系統訊息。錯誤：409 `INVALID_DEAL_STATUS`、409 `INSUFFICIENT_QUANTITY`（附 `product_id`、`available`、`in_draft`）。

`PATCH /api/deals/items/:itemId`

```json
{ "deal_id": "deal_...", "quantity": 2 }
```

尾數必須 1 以上且不超過目前可售。錯誤：404 `ITEM_NOT_FOUND`、409 `INSUFFICIENT_QUANTITY`（附 `item_id`、`product_id`、`available`）。

`DELETE /api/deals/items/:itemId?deal_id=deal_...` 與 `DELETE /api/deals/items?deal_id=deal_...`

刪除單項或清空。項目存在是刪除單項的前提（404 `ITEM_NOT_FOUND`）；清空允許草稿變成 0 項。兩者都只允許買家在 `DRAFT` 時呼叫。

`POST /api/deals/propose`

```json
{ "deal_id": "deal_...", "final_price": 4800,
  "meetup_location": "基隆火車站南站 7-11 門口",
  "meetup_time": "2026-10-25T17:30:00+08:00" }
```

逐項檢查 `quantity ≤ available`，不足回 409 `INSUFFICIENT_QUANTITY` 並附 `product_id`、`available`、`item_id`；訂單維持原狀態。成功後進入 `PENDING_REVIEW`、`lock_expires_at = now + 30 分`、`deal_terms` 寫入、發起方對應的 `buyer_confirmed` 或 `seller_confirmed` 為真，並插入協議卡與系統訊息。同一個交易房已有一筆 `PENDING_REVIEW`／`NEGOTIATING` 時回 409 `DEAL_IN_PROGRESS`。

`NEGOTIATING` 的訂單也可以送出：只有 `rejected_by` 本人（退回方）能重送，成功後重新進入 `PENDING_REVIEW`，發起方改為重送的人，另一方的簽核歸零。重送時逐項比對的可售會把這筆訂單自己的保留加回來，避免「整批都保留在這筆訂單」時被自己的保留卡住。

錯誤：400 `EMPTY_DEAL`（沒有項目）、400 `INVALID_PRICE`、400 `MISSING_TERMS`、400 `FIELD_TOO_LONG`、400 `INVALID_MEETUP_TIME`、403 `FORBIDDEN`（不是退回方）、409 `INVALID_DEAL_STATUS`、409 `INSUFFICIENT_QUANTITY`、409 `DEAL_IN_PROGRESS`。

協議卡內容：`{ type: "deal", deal_id, status: "pending", initiator_id, final_price, meetup_location, meetup_time, items_total, items: [{ title, quantity, unit_price }] }`。

`POST /api/deals/respond`

```json
{ "deal_id": "deal_...", "action": "AGREE" }
```

- `AGREE`：非發起方 → `CONFIRMED`、各項目 `sold_quantity += quantity`、寫 `confirmed_at`、雙方 `completed_deals + 1`、最新協議卡改 `confirmed`、插入系統訊息。評價卡尚未實作。
- `REJECT`：非發起方 → `NEGOTIATING`、`hold_expires_at = now + 15 分`、`rejected_by` 記下退回方、最新協議卡改 `rejected`、插入系統訊息。之後只有退回方能重送。

發起方自己呼叫回 403 `FORBIDDEN`；不是 `PENDING_REVIEW` 回 409 `INVALID_DEAL_STATUS`；`action` 不是 `AGREE`／`REJECT` 回 400 `INVALID_ACTION`。

`POST /api/deals/cancel`

```json
{ "deal_id": "deal_...", "reason": "SELLER_OUT_OF_STOCK" }
```

任一方皆可，`DRAFT`／`PENDING_REVIEW`／`NEGOTIATING` 都能取消。`reason` 只接受 `SELLER_OUT_OF_STOCK`、`BUYER_CHANGED_MIND`、`TERMS_MISMATCH`、`OTHER`；缺少或無效回 400 `INVALID_CANCEL_REASON`。取消後保留尾數立即釋放、最新協議卡改 `cancelled`、交易房留下含原因的系統訊息。已成交或已取消回 409 `INVALID_DEAL_STATUS`。

### 8.1.1 逾時

`GET /api/conversations` 與 `GET /api/deals/:id` 會先掃描進行中訂單：`PENDING_REVIEW` 超過 `lock_expires_at`、`NEGOTIATING` 超過 `hold_expires_at` 就轉 `CANCELLED`（原因 `LOCK_EXPIRED`／`HOLD_EXPIRED`），最新協議卡改 `expired`，並插入系統訊息。寫入端點（`propose`、`respond`、`cancel`）也會先掃描，過期的協議不能靠舊畫面續命。重複讀取不會重複取消或重複留言。

### 8.2 評價

| 方法 | 路徑 | 權限 |
| --- | --- | --- |
| POST | `/api/reviews/submit` | 登入（且為該訂單參與者） |
| GET | `/api/reviews?user_id=&limit=` | 公開 |

```json
{ "deal_id": "deal_...", "rating": 5, "tags": ["準時守約"], "comment": "…" }
```

- `rating` 必須是 1–5 的整數。
- `tags` 最多 3 個，只接受「準時守約」「魚貨新鮮」「溝通良好」「包裝完善」「臨時放鳥」。
- `comment` 最多 100 字。
- `reviewer_id`、`target_user_id`、`reviewer_role` 由訂單與 Token 推導，不接受 client 指定；買家評釣客、釣客評買家。
- 只有 `CONFIRMED` 的訂單能評價；重複評價回 409 `ALREADY_REVIEWED`。
- 回 201 `{ review, target }`。`target` 是評價對象更新後的公開資料。伺服器用該對象的全部評價重算 `rating_score`、`review_count`；含「臨時放鳥」的評價會讓 `no_show_count` +1，達 3 次時 `is_blacklisted = true`。未到次數只累加，不會因重算而減少。
- 最新的評價卡會同步雙方的 `buyer_reviewed`／`seller_reviewed`。

`GET /api/reviews?user_id=1&limit=6`（公開）回：

```jsonc
{ "user_id": 1, "rating_score": 4.8, "review_count": 18,
  "reviews": [{ "id": "rev_...", "rating": 5, "tags": ["準時守約"],
    "comment": "…", "created_at": "...", "reviewer_name": "買家乙" }] }
```

`rating_score` 與 `review_count` 由 `reviews` 實際資料計算，不採信會員表上的舊數字；`reviews` 只回最近 `limit` 筆。只回傳評價者的顯示名稱，不回傳電話或其他會員欄位。找不到使用者回 404 `USER_NOT_FOUND`。

### 8.3 行情

> 2026-10-27：三個行情端點、按需抓取與快取已實作。沒有每日全量 job；第一次查某魚種會打上游，之後依 TTL 使用 `db.json` 快取。手動 CLI 見 `npm run market:fetch`。

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| GET | `/api/market/prices?species_id=&region=&date=&include=history&days=7` | 公開 | 單筆行情；`include=history` 加回歷史；`days` 為最近 7 或 30 個交易日 |
| GET | `/api/market/markets` | 公開 | 市場對照表（唯讀，21 筆） |
| GET | `/api/market/species-codes` | 公開 | 主要新鮮代碼對照與養殖旗標（唯讀，28 筆） |

- `region` 省略 → 全國平均，回應 `region: null`、`scope: "national"`；`region` 無效 → 400 `INVALID_REGION`。縣市比對前把「臺」正規化為「台」。
- 縣市平均只納入 `market_locations.verified = true` 的市場；全國平均納入所有已抓到的市場，包含未確認市場。
- `date` 用 ISO `YYYY-MM-DD`，語意「該日或之前最近交易日」；省略取該魚種最近交易日。
- `species_id` 不存在於系統 28 種 → 400 `INVALID_SPECIES`；有魚種但沒有官方代碼 → 200 `found:false, reason:"NO_MAPPING"`。
- 查無交易資料 → 200 `found:false, reason:"NO_TRADE_DATA"`。
- 上游失敗且無快取 → 200 `found:false, reason:"UPSTREAM_UNAVAILABLE"`；有快取就回快取。
- 行情 API 公開，不需 Token。

```jsonc
{ "success": true, "data": {
    "found": true, "scope": "city", "region": "高雄市", "trade_date": "2026-10-22",
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
- `found:false` 只回 `found`、`reason`、`species_id`，不得帶 `price_per_kg`／`price_per_taijin` 或任何價格數字。
- `scope = "national"` 時保留請求的 `region`，前端顯示「全國平均」。
- `include=history` 只回該次查詢的 `scope`（縣市或全國）每日平均價；`days` 是最近 N 個交易日（7 或 30），回傳最多 N 筆有交易的日期；抓取時需涵蓋足夠日曆日。未帶 `include=history` 時省略 `history` 欄位。
- `is_aquaculture: true` 時，畫面與助手回覆標「養殖價格」。
- `summary` 端點已移除；走勢改用 `include=history`。

## 9. 錯誤碼總表

| code | HTTP | 出現位置 |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | 所有需登入端點 |
| `FORBIDDEN` | 403 | 對話 |
| `NOT_FOUND` | 404 | 未定義路徑 |
| `PRODUCT_NOT_FOUND` | 404 | 商品詳情、交易 |
| `DEAL_NOT_FOUND` | 404 | 訂單 |
| `ITEM_NOT_FOUND` | 404 | 訂單項目 |
| `CONVERSATION_NOT_FOUND` | 404 | 對話 |
| `MISSING_FIELDS` | 400 | 註冊 |
| `MISSING_REGION` | 400 | 註冊（缺縣市） |
| `INVALID_REGION` | 400 | 註冊、個人檔案、行情（縣市不在清單） |
| `DUPLICATE_PHONE` | 409 | 註冊 |
| `INVALID_CREDENTIALS` | 401 | 登入 |
| `INVALID_NICKNAME` | 400 | 個人檔案 |
| `FIELD_TOO_LONG` | 400 | 個人檔案、上架（處理方式） |
| `NO_CHANGES` | 400 | 個人檔案、context |
| `MISSING_SPECIES` | 400 | 上架 |
| `INVALID_WEIGHT` | 400 | 上架 |
| `INVALID_QUANTITY` | 400 | 上架 |
| `MISSING_CONDITION` | 400 | 上架（處理方式空白） |
| `MISSING_PRICE` | 400 | 上架（整批與每台斤都沒填） |
| `INVALID_PRICE` | 400 | 上架（售價 ≤ 0） |
| `OWN_PRODUCT` | 400 | 開啟交易房（自己的商品） |
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
| `INVALID_CANCEL_REASON` | 400 | 取消（缺原因或原因無效） |
| `INVALID_RATING` | 400 | 評價（星等不是 1–5） |
| `INVALID_TAGS` | 400 | 評價（標籤格式或名稱無效） |
| `TOO_MANY_TAGS` | 400 | 評價（超過 3 個標籤） |
| `COMMENT_TOO_LONG` | 400 | 評價（評語超過 100 字） |
| `DEAL_NOT_CONFIRMED` | 409 | 評價（訂單未成交） |
| `ALREADY_REVIEWED` | 409 | 評價（重複送出） |
| `USER_NOT_FOUND` | 404 | 公開評價列表 |
| `INVALID_SPECIES` | 400 | 行情（species_id 不在系統 28 種） |
| `INVALID_DATE` | 400 | 行情（日期格式錯誤） |
| `NO_TRADE_DATA` | 200 | 行情（查無交易資料，不是錯誤） |
| `NO_MAPPING` | 200 | 行情（魚種存在但沒有官方代碼） |
| `UPSTREAM_UNAVAILABLE` | 200 | 行情（上游失敗且無快取） |

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
| 交易房的 `peer.username` 是完整電話 | 電話橫幅直接顯示，加 `tel:` 連結 |
| 交易房訊息只走真人訊息 | 前端不得再呼叫規則引擎；後端也會擋 `sender_type: "ai"` |
| `item_id` 只在同一筆訂單內唯一 | 改尾數／刪項目要同時帶 `deal_id` |
| 草稿不保留庫存 | `available` 仍包含草稿中的尾數；同一草稿的累計不得超過 `available` |
| 協議卡 `status` 是小寫 `pending` 等 | 訂單本身是 `deal_status` 大寫 `PENDING_REVIEW` |
| 發起方不能同意自己的協議 | 只有對方能 `AGREE`／`REJECT`；任一方都能 `cancel` |
| 協議卡只有最新一張會跟著狀態更新 | 舊卡保留 `rejected` 等歷史狀態 |
| 舊文件寫的 `createFish()` / `deleteFish()` 已不存在 | 上架只用 `POST /api/products/create` |
| `price` 是上架整批售價，`price_per_taijin` 是每台斤售價，`unit_price` 是每尾均價 | 三個都要標清楚；不要把整批價乘以尾數 |
| `price_auto: true` 代表整批價由每台斤自動計算 | 畫面標「自動計算」；只填整批時 `price_per_taijin` 為 `null` |
| 行情查詢回的是平均價數字，不是 low／avg／high 物件 | `data.price_per_kg`、`data.price_per_taijin` 直接是 number |
| 行情卡走勢要帶 `include=history`；沒有 `summary` 端點 | 用 `days=7` 或 `days=30`（最近 7／30 個交易日） |
| `is_aquaculture: true` | 商品卡、行情卡、助手回覆都要標「養殖價格」 |
| 助手房可以有多間 | 每間有自己的 `context` 與草稿；不要假設只有一間 |
| 交易房只有 `CANCELLED` 能刪 | 房內必須沒有 `CONFIRMED` 歷史；刪除會一併移除該房所有訂單與項目 |
| 商品發布時寫入行情快照 | 小卡是對話訊息，快照才是商品的一部分 |
| 取消上架會刪除目前 AI 對話 | 前端要先確認，再呼叫 `DELETE /api/conversations/:id` |
| `seller_terms_accepted_at` 有值就永久跳過法規告知 | 不要每次賣魚都重問或重送 consent |
| 法規告知卡按「取消」不記錄同意 | 取消後回 idle；下次賣魚再顯示 |
| 同意只由 `POST /api/users/seller-consent` 寫入 | `chat/message` 的 `legal_consent` 卡只是 UI，不是同意紀錄 |
