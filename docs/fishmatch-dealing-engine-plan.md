# FishMatch 對話式交易引擎 — 實作計畫

> 依據 `C:\workspace\chat bot\chat bot.md` 規格書，經與使用者逐項確認後的實作定案。
> 專案根目錄：`C:\workspace\fish`
> 版本：v3（修正：目錄改為 frontend / backend 標準結構）

---

## 0. 一句話總結

把現有「假的右下角小幫手 + 假的聊聊面板」改寫成**單一聊天視窗**，透過語意路由串接「上架 AI / 導購 AI / 真人賣家」，並以 `backend` 為真實來源完成**可拆批、可合併同賣家多商品、雙向簽核、面交、互評**的完整交易閉環。

---

## 1. 範圍

### 本輪要做

- 專案目錄重整為 `frontend/`、`backend/`、`docs/`
- `backend` 改為交易系統後端（products / conversations / messages / deals / reviews / uploads）
- 右下角 bot 全面改寫為對話式交易引擎
- 規則式 AI：意圖判斷、槽位填補、導購、回覆
- 雙軌交易：文字 + 電話、訂單、協議、鎖定、取消、評價
- 個人檔案可填寫地址，作為搜尋與推薦的預設地區
- 個人抽屜新增「交易紀錄」

### 本輪不做（已知限制）

- 真實金流、運費、訂金、發票
- 真正的 LLM（僅預留 adapter）
- 會員註冊流程改版
- 推播服務（僅站內紅點）
- 下一輪才移除購物車頁

---

## 2. 角色與名詞

| 名詞 | 定義 |
|---|---|
| 使用者 | 單一 `user` 角色，人人可買可賣 |
| 助手房 | 使用者與平台 AI 的對話，每人一間 |
| 交易房 | 買家與某位賣家的對話，每組（買家＋賣家）一間 |
| 訂單（deal） | 交易房內的一筆交易，可含**同賣家的多個商品** |
| 訂單項目 | 訂單內的一個商品與購買尾數 |
| 草案 | 上架流程中尚未發布的槽位資料，存在助手房 context |
| 訂單草稿 | `deal_status = DRAFT`，可自由加減商品，不鎖庫存 |
| 可售尾數 `available` | `quantity - sold_quantity - 進行中訂單保留尾數` |

---

## 3. 對話與房間模型

### 3.1 UI 上只有一個聊天視窗

```
┌──────────────────────────────────────────────┐
│ 🐟 一支釣小幫手        與 陳阿海 洽談中 ▾ ☰ ─ ✕│
├──────────────────────────────────────────────┤
│ 📞 0912-345-678  [立即通話]                  │
├──────────────────────────────────────────────┤
│ 訊息流（當前房間）                            │
│                                              │
├──────────────────────────────────────────────┤
│ 📎  輸入訊息…                          [送出] │
└──────────────────────────────────────────────┘
```

- 標題列狀態：`上架中` / `找魚中` / `與 {賣家} 洽談中` / `收件匣`
- `☰` 開啟收件匣（進行中 + 歷史）
- `▾` 快速切換進行中的交易房
- 未讀總數顯示在右下角圓形按鈕

### 3.2 資料上分成兩種房間

| 類型 | `conversation.type` | 參與者 | 唯一鍵 | 備註 |
|---|---|---|---|---|
| 助手房 | `assistant` | 使用者 + AI | 每位使用者 1 間 | 內含 `context.mode` |
| 交易房 | `deal` | 買家 + 賣家 | **`buyer_id + seller_id`** | 建立後 `mode = HUMAN` |

**為什麼交易房以「賣家」為單位而非「商品」**：
同一買家向同一位賣家買石斑與嘉鱲，應該在同一間房、同一筆訂單完成，避免出現兩間房、兩份協議、兩次面交。同一位賣家的不同商品，日後也可以在同一間房再開新訂單。

**隱私邊界**：不同賣家之間互不可見；賣家也看不到買家的導購 AI 對話。

### 3.3 助手房模式

```jsonc
// conversation.context
{
  "mode": "idle | listing | shopping",
  "draft": { "fish_species", "weight_kg", "quantity", "condition", "photo_url", "price" },
  "asked": ["fish_species", "weight_kg"],
  "last_cards": ["prd_001", "prd_002"]
}
```

- `listing`：有進行中的草稿時鎖定，直到發布或使用者取消
- `shopping`：最近一次查詢的商品清單，供「第 2 個」「這尾」指涉
- `idle`：每次訊息重新判斷意圖

### 3.4 訊息路由

```
訊息進來
├─ 當前房間是 deal？ ────────────→ 直接寫入，AI 不回覆
├─ 助手房 mode = listing 且有草稿？ → 只抽槽位，不重新判斷意圖
├─ 助手房 mode = shopping 且句子含指涉？ → 解析指涉（「這尾」「第 2 個」「2 尾」）
└─ 解析意圖
     ├─ SELL  → mode = listing，開始追問
     ├─ BUY   → mode = shopping，執行查詢並出商品卡
     ├─ 明確購買意願 → 加入訂單（見 5.4）
     ├─ 取消（「算了」「不要了」）→ 清空草稿，mode = idle
     └─ 無法判斷 → 反問一次，附「我要賣魚 / 我要找魚」按鈕
```

任何時候都保留手動切換按鈕，AI 誤判不會讓使用者卡住。

---

## 4. 狀態機

### 4.1 商品

狀態**由數量推導**：

```
available   = quantity - sold_quantity - Σ(進行中訂單項目的 quantity)
reserved    = Σ(進行中訂單項目的 quantity)

available <= 0                  → SOLD_OUT
available > 0 且 reserved > 0   → PARTIALLY_RESERVED
否則                            → ACTIVE
```

「進行中」指 `PENDING_REVIEW` 或 `NEGOTIATING` 的訂單。`DRAFT` 不計入保留。

### 4.2 訂單

```
[加入商品] → DRAFT ──提案──→ PENDING_REVIEW ──同意──→ CONFIRMED
               ↑                  │  ↑
               │               退回│  │重送（修改條件）
               │                  ↓  │
               └────────────── NEGOTIATING
                                  │
                         取消／逾時 → CANCELLED
```

| 狀態 | 庫存影響 | 可做的動作 |
|---|---|---|
| `DRAFT` | 不保留 | 加商品、改尾數、刪商品、清空、提案 |
| `PENDING_REVIEW` | 保留所有項目尾數，鎖 30 分 | 接收方同意／退回；任一方取消 |
| `NEGOTIATING` | 保留所有項目尾數，額外保留 15 分 | 退回方修改後重送；任一方取消 |
| `CONFIRMED` | 計入 `sold_quantity` | 雙方評價（非強制） |
| `CANCELLED` | 釋放所有項目尾數 | 唯讀 |

- **發起方送出即視為自己已簽**，接收方同意即 `CONFIRMED`。
- `CONFIRMED` 就是「交易完成」，交易紀錄同時成立。
- 同一交易房內，同時最多一筆草稿與一筆進行中訂單。

### 4.3 逾時處理（無排程）

每次 `GET /api/products`、`GET /api/deals`、`GET /api/conversations` 前執行 `sweepExpired()`：

1. `PENDING_REVIEW` 且 `lock_expires_at < now` → `CANCELLED`，釋放尾數，交易房補系統訊息
2. `NEGOTIATING` 且 `hold_expires_at < now` → `CANCELLED`，同上
3. 商品狀態自動重算

---

## 5. 訂單與拆批模型

### 5.1 商品欄位

```jsonc
// products
"quantity": 5,           // 上架總尾數
"weight_kg": 9.0,        // 總重
"price": 12000,          // 整批總價
"sold_quantity": 2,      // 已成交尾數（系統維護）

// 衍生（後端回傳時計算，不落庫）
"unit_price": 2400,      // round(price / quantity)
"avg_weight_kg": 1.8,    // weight_kg / quantity
"reserved_quantity": 2,
"available": 1
```

### 5.2 訂單結構

```jsonc
{
  "id": "deal_20261024_8891",
  "conversation_id": "conv_0002",
  "buyer_id": 2,
  "seller_id": 1,
  "initiator_id": 2,
  "items": [
    { "item_id": "itm_01", "product_id": "prd_001",
      "title": "石斑（4.5kg / 1尾 / 放血冰鎮）",
      "photo_url": "/uploads/a.jpg",
      "unit_price": 2800, "weight_kg": 4.5, "quantity": 1 },
    { "item_id": "itm_02", "product_id": "prd_002",
      "title": "嘉鱲（2.2kg / 2尾 / 三去處理）",
      "photo_url": "/uploads/b.jpg",
      "unit_price": 1100, "weight_kg": 2.2, "quantity": 2 }
  ],
  "items_total": 5000,          // Σ(unit_price × quantity)
  "deal_terms": {
    "final_price": 4800,        // 整單成交價（可議價），預設 = items_total
    "meetup_location": "基隆火車站南站 7-11 門口",
    "meetup_time": "2026-10-24T17:30:00+08:00"
  },
  "deal_status": "PENDING_REVIEW",
  "buyer_confirmed": true,
  "seller_confirmed": false,
  "lock_expires_at": "...",
  "hold_expires_at": null,
  "review_status": { "buyer_reviewed": false, "seller_reviewed": false },
  "cancelled_by": null,
  "cancel_reason": null,
  "created_at": "...",
  "confirmed_at": null
}
```

`items[]` 本身就是商品快照，商品日後被修改或下架都不影響歷史紀錄。

### 5.3 規則

- 同一商品可同時存在多筆 `PENDING_REVIEW`（不同買家、不同尾數），各自保留自己的數量
- 提案時逐項檢查 `quantity <= available`，不足回 `409 INSUFFICIENT_QUANTITY` 並附上不足的 `product_id`
- 取消／逾時釋放該訂單所有項目的尾數，不影響其他訂單
- 全部售完才 `SOLD_OUT`
- **議價以整單 `final_price` 為準**，不支援逐項改價（逐項 `unit_price` 僅作參考與紀錄）
- `DRAFT` 階段不檢查庫存，提案時才檢查

### 5.4 買家如何把商品加進訂單

| 情境 | 行為 |
|---|---|
| 在助手房對商品按「洽談購買」 | 找出該商品賣家；若已有交易房就沿用，否則建立；加入一筆訂單草稿 |
| 已在交易房，按「＋ 加購」 | 列出該賣家其他 `ACTIVE` 商品，選尾數後加入同一訂單 |
| 在助手房說「我要 2 尾石斑」 | 解析尾數 → 找到商品 → 同上 |
| 同賣家、不同商品 | 進入同一交易房、同一訂單 |
| 不同賣家 | 建立另一間交易房、另一筆訂單 |
| 已有 `DRAFT` 訂單時再加購 | 直接加入該草稿 |
| 訂單已提案（`PENDING_REVIEW`） | 加購停用；需先取消或等對方回應 |
| 訂單已成交（`CONFIRMED`） | 再次購買時建立新的 `DRAFT` 訂單，同一房 |

---

## 6. AI 規則引擎

### 6.1 意圖

| 意圖 | 觸發詞（範例） |
|---|---|
| `SELL` | 賣、釣到、上岸、出售、多捕、剛釣、想賣 |
| `BUY` | 買、我要、找、有沒有、推薦、怎麼賣、面交、洽談 |
| `QUERY_REGION` | 今天有什麼、哪裡有、{地區} |
| `QUERY_COOKING` | 適合、煮湯、長輩、刺少、小孩 |
| `QUERY_PRICE` | 行情、多少錢、合理嗎 |
| `ADD_ITEM` | 再來、再加、順便、也要 |
| `CANCEL` | 算了、不要了、取消、重來 |

同時命中 `SELL` 與 `BUY` 時，反問一次並提供兩顆按鈕。

### 6.2 槽位抽取

| 槽位 | 規則 |
|---|---|
| `fish_species` | 比對魚種字典與別名；比對不到就保留原字串（上限 20 字） |
| `weight_kg` | `(\d+(?:\.\d+)?)\s*(公斤\|kg\|台斤\|斤)`；台斤 × 0.6；無單位視為公斤 |
| `quantity` | `(\d+)\s*(尾\|條\|隻\|份)` |
| `condition` | 同義詞表：活魚／蓄養→活體；放血／碎冰→放血冰鎮；三去／去鱗去鰓→三去處理；凍→冷凍 |
| `price` | `(\d+)\s*(元\|塊\|nt)?`，值 > 100 才視為價格 |
| `photo_url` | 只認上傳事件，不由文字推測 |

支援單句補完多槽位，例如「石斑 4.5 公斤 1 尾 放血冰鎮 2800」。

追問順序：魚種 → 重量 → 尾數 → 保鮮 → 照片 → 價格。
單次只問一個欄位，不列清單。

### 6.3 地區預設

個人檔案填寫的地址（縣市／區）作為：

- 助理房「附近有什麼魚」的預設地區
- 商品查詢未指定地區時的預設 `region`
- 上架時 `location` 的預設值（可修改）
- 商品列表頁地區篩選的初始值

**不用於**面交地點；面交地點一律由雙方在協議中填寫。

### 6.4 文案風格

- 繁體中文、白話、句子短
- **禁用模糊或行銷詞**：現流、野生、頂級、職人、大豐收、極鮮、超值
- 數字一定帶單位（公斤、尾、元）
- 商品標題格式：`{魚種}（{總重}kg / {總尾數}尾 / {處理方式}）`
  - 例：`石斑（4.5kg / 1尾 / 放血冰鎮）`
  - 例：`紅魽（5.8kg / 3尾 / 三去處理）`

### 6.5 魚種字典

`frontend/assets/js/demo/ai/species.js`，每筆：

```jsonc
{ "id": "grouper", "name": "石斑", "latin": "Epinephelus quoyanus",
  "alias": ["玳瑁石斑", "石斑魚"],
  "market": 1300,
  "texture": "肉質緊實、膠質多",
  "bones": "細刺少",
  "cooking": ["清蒸", "煮湯", "紅燒"] }
```

覆蓋現有圖片對應魚種：紅魽、嘉鱲、石斑、鮭魚、鱸魚、鯖魚、鮪魚、花枝、蝦、蚵。

### 6.6 LLM 介面預留

```js
// frontend/assets/js/demo/ai/service.js
export async function generateReply(context) {
  return ruleBasedReply(context);   // 現在
  // 未來：return fetch("/api/ai/reply", ...)
}
```

所有 AI 回覆都經過這一個函式，之後換 LLM 只改這裡。

---

## 7. 畫面與互動

### 7.1 面板

| 屬性 | 值 |
|---|---|
| 平時尺寸 | `400 × 520`（桌機）、全螢幕（手機） |
| 交易房尺寸 | `440 × min(760, 100vh - 100px)` |
| 位置 | 右下角 24px |
| 未讀 | 圓形按鈕上的紅色數字 |
| 收合 | 保留最後房間與捲動位置（localStorage） |

### 7.2 視圖

| 視圖 | 內容 |
|---|---|
| `assistant` | 訊息流 + 輸入框 |
| `inbox` | 進行中交易、歷史交易（唯讀）、返回 |
| `deal` | 電話橫幅、訂單摘要、訊息流、輸入框 |

評價不是獨立視圖，是交易房裡的一張卡片。
訂單草稿是交易房上方可展開的摘要面板，不另開視圖。

### 7.3 訊息型別

```jsonc
{ "type": "text",   "sender_id": 2, "text": "你好" }
{ "type": "image",  "sender_id": 2, "image_url": "/uploads/x.jpg" }
{ "type": "system", "text": "已進入交易洽談" }
{ "type": "card",   "card": { ... } }
```

卡片種類：

| `card.type` | 內容 | 可執行動作 |
|---|---|---|
| `product` | 圖、標題、總價、單價、可售尾數、捕獲時間 | 深入諮詢、洽談購買（含尾數） |
| `draft` | 六個槽位摘要 | 修改、確認發布 |
| `order` | 訂單摘要（多品項、小計） | 展開明細、送出協議 |
| `deal` | 整單金額、地點、時間、狀態 | 同意、退回、取消 |
| `review` | 星等、標籤、評語 | 送出 |

卡片狀態寫在 `message.card.status`，輪詢時一併更新。

### 7.4 交易房

```
📞 0912-345-678   [立即通話]
────────────────────────────────
訂單 2 項 · 3 尾 · NT$5,000      [展開]
────────────────────────────────
訊息流
────────────────────────────────
📋 協商完畢，確認交易
```

- 電話**直接顯示完整號碼**，不做遮蔽，附 `tel:` 連結
- 「協商完畢」在訂單草稿至少 1 項且無進行中協議時才可按
- 訂單草稿展開後可調整尾數、刪除項目、清空

### 7.5 未登入

- 助手房可開，可導購、可看商品卡
- 按「洽談購買」或「我要賣魚」→ 顯示登入引導（連到 `pages/login.html`）
- 登入後回到原頁面，bot 自動恢復

---

## 8. API 規格

需登入的端點要求 `Authorization: Bearer {token}`。
錯誤格式：`{ "success": false, "code": "...", "message": "..." }`。

### 8.1 認證（沿用並擴充）

| 方法 | 路徑 | 說明 |
|---|---|---|
| `POST` | `/api/auth/login` | 沿用 |
| `POST` | `/api/auth/register` | 沿用 |
| `GET` | `/api/auth/me` | 沿用 |
| `PUT` | `/api/users/profile` | 擴充可更新 `nickname`、`city`、`district`、`address_line` |

```json
{ "nickname": "陳阿海", "city": "新北市", "district": "瑞芳區", "address_line": "鼻頭路 1 號" }
```

回傳含 `display_address`（三段串接）與 `region`（＝`city`，供篩選）。

### 8.2 商品

#### `GET /api/products`

查詢參數：`region`、`species`、`seller_id`、`status`、`limit`

#### `POST /api/products/create`（需登入）

```json
{
  "fish_species": "石斑",
  "species_id": "grouper",
  "weight_kg": 4.5,
  "quantity": 1,
  "condition": "放血冰鎮",
  "photo_url": "/uploads/xxx.jpg",
  "price": 2800,
  "location": "新北市瑞芳區鼻頭路 1 號",
  "region": "新北市",
  "catch_time": "2026-10-24T14:00:00+08:00"
}
```

伺服器行為：
- `seller_id` 由 token 決定
- 自動產生 `title`
- `market_reference_price` 由魚種參考表帶入
- `status = ACTIVE`、`sold_quantity = 0`

#### `GET /api/fish/data`（相容層，唯讀）

從 `products` 轉出舊格式，讓商品頁與購物車不用改：

| products | → fish_data |
|---|---|
| `available` | `quantity`（`AVAILABLE` 時） |
| `price` ÷ (`weight_kg` ÷ 0.6) | `price_per_taijin` |
| `condition` | `process` |
| `catch_time` | `caught_time` |
| `photo_url` | `images: [photo_url]` |
| `weight_kg ÷ quantity` | `weight`（台斤） |
| `ACTIVE` / `PARTIALLY_RESERVED` | `AVAILABLE` |
| `SOLD_OUT` | `SOLD_OUT` |
| `region` / `location` | 同名 |

> 已知限制：購物車仍可能下單到洽談中的尾數。購物車下一輪移除，本輪接受。

### 8.3 上傳

#### `POST /api/uploads`（需登入）

```json
{ "filename": "photo.jpg", "data": "data:image/jpeg;base64,..." }
```

解碼後寫入 `backend/uploads/{uuid}.jpg`，回傳 `{ "data": { "url": "/uploads/ab12cd34.jpg" } }`。
限制：解碼後 ≤ 5MB，只接受 jpeg / png / webp。

### 8.4 對話

#### `GET /api/conversations`（需登入）

```json
{
  "data": [
    {
      "id": "conv_0002", "type": "deal", "mode": "HUMAN",
      "peer": { "id": 1, "display_name": "陳阿海" },
      "order": { "id": "deal_...", "status": "DRAFT", "item_count": 2, "total_quantity": 3, "final_price": 5000 },
      "last_message": { "text": "…", "created_at": "…" },
      "unread_count": 2
    }
  ]
}
```

#### `GET /api/conversations/:id/messages?after={iso}&limit=50`

回傳增量訊息，供 3 秒輪詢。

#### `POST /api/chat/message`（需登入）

```json
{ "conversation_id": "conv_...", "text": "還有貨嗎", "image_url": null }
```

助手房可額外帶：

```json
{ "sender_type": "ai", "context": { "mode": "listing", "draft": {} } }
```

規則：
- `sender_type = "ai"` 僅在 `conversation.mode === "AI"` 時接受
- 有 `context` 時一併寫回
- 交易房寫入後對方未讀數增加

> 簡化說明：AI 回覆由前端規則引擎產生後回寫。之後改伺服器端 LLM 時，API 契約不變。

#### `PUT /api/conversations/:id/context`（需登入）
#### `POST /api/conversations/:id/read`（需登入）

### 8.5 訂單

#### `POST /api/deals/initiate-channel`（需登入）

買家表達購買意願時呼叫。

```json
{ "product_id": "prd_...", "quantity": 2 }
```

行為：
- 由 `product.seller_id` 找或建立（`buyer_id + seller_id`）交易房
- 找或建立 `DRAFT` 訂單（同房最多一筆）
- 加入／累加該商品項目
- `mode = HUMAN`，插入系統訊息
- 回傳 `{ conversation, deal, product }`

不鎖定商品（提案時才鎖）。

#### `POST /api/deals/items`（需登入）

```json
{ "deal_id": "deal_...", "product_id": "prd_...", "quantity": 1 }
```

加購同一賣家的其他商品。僅 `DRAFT` 可呼叫；已存在同商品則累加尾數。

#### `PATCH /api/deals/items/:itemId`（需登入）

```json
{ "quantity": 3 }
```

#### `DELETE /api/deals/items/:itemId`（需登入）

移除項目；若訂單已無項目，訂單維持 `DRAFT` 空單。

#### `POST /api/deals/propose`（需登入）

```json
{
  "deal_id": "deal_...",
  "final_price": 4800,
  "meetup_location": "基隆火車站南站 7-11 門口",
  "meetup_time": "2026-10-24T17:30:00+08:00"
}
```

行為：
- 驗證參與者、訂單至少 1 項
- 逐項檢查 `quantity <= available`（`409 INSUFFICIENT_QUANTITY`，附 `product_id`）
- `DRAFT → PENDING_REVIEW`，`lock_expires_at = now + 30min`
- 發起方對應的 `buyer_confirmed` / `seller_confirmed` 設 `true`
- 插入 `deal_card` 訊息

#### `POST /api/deals/respond`（需登入）

```json
{ "deal_id": "deal_...", "action": "AGREE" }
```

- `AGREE`：非發起方 → `CONFIRMED`、各項目 `sold_quantity += quantity`、`confirmed_at = now`、插入 `review_card`、雙方 `completed_deals +1`
- `REJECT`：→ `NEGOTIATING`、`hold_expires_at = now + 15min`、卡片狀態 `rejected`、插入系統訊息

#### `POST /api/deals/cancel`（需登入）

```json
{ "deal_id": "deal_...", "reason": "SELLER_OUT_OF_STOCK" }
```

原因：`SELLER_OUT_OF_STOCK`、`BUYER_CHANGED_MIND`、`TERMS_MISMATCH`、`OTHER`。
任一方皆可；釋放所有項目尾數、插入系統訊息。

#### `GET /api/deals`
#### `GET /api/deals/:id`

交易紀錄與詳情（含 `items` 快照）。

### 8.6 評價

#### `POST /api/reviews/submit`（需登入）

```json
{ "deal_id": "deal_...", "rating": 5, "tags": ["準時守約"], "comment": "…" }
```

伺服器行為：
- 由訂單與 token 推導 `reviewer_id`、`target_user_id`、`role`
- 每筆訂單每人限評一次（`409 ALREADY_REVIEWED`）
- 重算對方 `rating_score`（簡單平均）、`review_count`
- 標籤含 `臨時放鳥` → `no_show_count +1`；達 3 次設 `is_blacklisted`
- 更新 `deal.review_status`

---

## 9. 資料表

### `users`（擴充）

```jsonc
{
  "id": 1, "username": "0912345678", "password": "seller123",
  "display_name": "陳阿海", "role": "SELLER",
  "is_verified": true, "completed_orders": 186,
  "city": "新北市", "district": "瑞芳區", "address_line": "鼻頭路 1 號",
  "rating_score": 4.9, "review_count": 18, "completed_deals": 18,
  "no_show_count": 0, "is_blacklisted": false,
  "bank_code": "", "bank_account": "", "bank_account_name": ""
}
```

`display_address` 由 `city + district + address_line` 於回應時組合，不落庫。

### `products`（新）

```jsonc
{
  "id": "prd_20261024_001",
  "seller_id": 1,
  "title": "石斑（4.5kg / 1尾 / 放血冰鎮）",
  "fish_species": "石斑", "species_id": "grouper",
  "species_latin": "Epinephelus quoyanus",
  "weight_kg": 4.5, "quantity": 1, "sold_quantity": 0,
  "condition": "放血冰鎮",
  "photo_url": "/uploads/ab12cd34.jpg",
  "price": 2800, "market_reference_price": 2700,
  "region": "新北市", "location": "新北市瑞芳區鼻頭路 1 號",
  "catch_time": "2026-10-24T14:00:00+08:00",
  "created_at": "2026-10-24T14:10:00+08:00"
}
```

### `conversations`（新）

```jsonc
{
  "id": "conv_0002",
  "type": "deal",
  "buyer_id": 2,
  "seller_id": 1,
  "mode": "HUMAN",
  "context": null,
  "archived": false,
  "read_at": { "1": "...", "2": "..." },
  "created_at": "...", "last_message_at": "..."
}
```

助手房：`type: "assistant"`、`user_ids: [id]`、`mode: "AI"`、含 `context`。

### `messages`（新）

```jsonc
{
  "id": "msg_0001",
  "conversation_id": "conv_0002",
  "sender_id": 2,
  "type": "card",
  "text": "",
  "image_url": null,
  "card": { "type": "deal", "deal_id": "deal_0001", "status": "pending" },
  "created_at": "..."
}
```

### `deals`（新）

見 5.2。`DRAFT` 訂單的 `deal_terms` 可為 `null`。

### `reviews`（新）

```jsonc
{
  "id": "rev_0001", "deal_id": "deal_0001",
  "reviewer_id": 2, "target_user_id": 1, "reviewer_role": "buyer",
  "rating": 5, "tags": ["準時守約"], "comment": "魚很新鮮，準時到",
  "created_at": "..."
}
```

---

## 10. 專案目錄結構與行數預算

### 10.1 目錄結構

```
C:\workspace\fish\
├─ frontend/
│  ├─ index.html                 入口，導向 pages/index.html
│  ├─ pages/                     index / products / product-detail / cart
│  │                             login / seller / report
│  └─ assets/
│     ├─ css/                    既有樣式 + 新增 deal-bot.css
│     ├─ images/
│     └─ js/
│        ├─ config.js
│        ├─ api/                 client / auth / fish / fish-mapper
│        ├─ app/                 01~08 共用模組
│        ├─ pages/               各頁專屬腳本
│        └─ demo/                對話式交易引擎（新）
│           ├─ main.js
│           ├─ api.js  poll.js  store.js  order.js  upload.js
│           ├─ ai/
│           │  ├─ rules.js  slots.js  species.js  service.js
│           │  └─ …
│           └─ views/
│              ├─ panel.js  assistant.js  inbox.js
│              ├─ deal.js  order.js  cards.js  review.js
├─ backend/
│  ├─ server.js
│  ├─ app.js
│  ├─ lib/                       auth / store / orders / species / http
│  ├─ routes/                    auth / fish / products / uploads
│  │                             chat / deals / deal-actions / reviews
│  ├─ db.json
│  ├─ uploads/                   上傳圖片（不進版控）
│  └─ README.md
├─ docs/
│  ├─ api/README.md
│  └─ fishmatch-dealing-engine-plan.md
├─ package.json
├─ README.md
├─ agent.md
└─ .gitignore
```

### 10.2 搬移時的連帶調整

| 項目 | 調整 |
|---|---|
| `pages/`、`assets/` | 直接搬入 `frontend/`，**相對路徑 `../assets/...` 不需修改** |
| 根目錄 `index.html` | 改為 `frontend/index.html`（內容仍導向 `pages/index.html`），刪除根目錄版本 |
| `mock-api/` | 改名 `backend/`，`package.json` 腳本改為 `node backend/server.js` |
| `mock-api/uploads/` | 改為 `backend/uploads/`，加入 `.gitignore` |
| `fish-mapper.js` | `"../assets/" + img` 前綴不變（`frontend/pages` 與 `frontend/assets` 同層） |
| `config.js` | API base 仍為 `http://{hostname}:3001`，不需修改 |
| `docs/api/README.md` | 路徑字串由 `assets/...` 改為 `frontend/assets/...` |
| `README.md` | 目錄說明與啟動指令更新 |
| 靜態伺服 | 網站根目錄改為 `frontend/`：`python -m http.server 8000 --directory frontend` |

### 10.3 後端檔案

| 檔案 | 行數 | 職責 |
|---|---|---|
| `backend/server.js` | ~20 | 啟動 |
| `backend/app.js` | ~80 | middleware、靜態目錄、掛載路由 |
| `backend/lib/auth.js` | ~70 | token、`requireUser`、`publicUser` |
| `backend/lib/store.js` | ~90 | `nextId`、查詢工具 |
| `backend/lib/orders.js` | ~120 | 可售尾數計算、狀態推導、`sweepExpired` |
| `backend/lib/species.js` | ~60 | 魚種參考價與學名 |
| `backend/lib/http.js` | ~40 | `ok` / `fail` / 錯誤碼 |
| `backend/routes/auth.js` | ~100 | 登入、註冊、me、profile |
| `backend/routes/fish.js` | ~70 | `/api/fish/data` 相容層（唯讀） |
| `backend/routes/products.js` | ~110 | 列表、詳情、建立 |
| `backend/routes/uploads.js` | ~70 | base64 解碼存檔 |
| `backend/routes/chat.js` | ~150 | conversations、messages、已讀、context |
| `backend/routes/deals.js` | ~170 | initiate、items CRUD、propose |
| `backend/routes/deal-actions.js` | ~130 | respond、cancel、列表、詳情 |
| `backend/routes/reviews.js` | ~100 | 評價、rating 重算、黑名單 |

### 10.4 前端檔案

| 檔案 | 行數 | 職責 |
|---|---|---|
| `frontend/assets/js/demo/main.js` | ~70 | 入口、掛載、事件匯流排 |
| `…/demo/api.js` | ~160 | API 呼叫與錯誤處理 |
| `…/demo/poll.js` | ~80 | 3 秒輪詢、未讀 |
| `…/demo/store.js` | ~90 | 當前房間、訊息快取、localStorage |
| `…/demo/ai/rules.js` | ~120 | 意圖判斷 |
| `…/demo/ai/slots.js` | ~150 | 槽位抽取與追問 |
| `…/demo/ai/species.js` | ~120 | 魚種字典 |
| `…/demo/ai/service.js` | ~120 | `generateReply()`、回覆模板 |
| `…/demo/upload.js` | ~80 | 壓縮與上傳 |
| `…/demo/order.js` | ~120 | 訂單草稿操作、金額計算、按鈕可用性 |
| `…/demo/views/panel.js` | ~160 | 外殼、標題列、尺寸、未讀 |
| `…/demo/views/assistant.js` | ~180 | 助手房渲染 |
| `…/demo/views/inbox.js` | ~120 | 收件匣 |
| `…/demo/views/deal.js` | ~170 | 交易房渲染 |
| `…/demo/views/order.js` | ~140 | 訂單摘要與加購面板 |
| `…/demo/views/cards.js` | ~160 | 五種卡片 HTML |
| `…/demo/views/review.js` | ~110 | 評價卡 |
| `frontend/assets/css/deal-bot.css` | ~190 | 面板樣式 |

### 10.5 HTML 變更

每個頁面：
- 移除 `04-chat.js` 中 `ensureAssistantBot` 與舊 `openChat` / `openBuyerChat` / `ensureChatPanel`
- 頁尾加 `<script type="module" src="../assets/js/demo/main.js"></script>`

---

## 11. 分階段任務

### P0 目錄重整與後端基礎

- [ ] 建立 `frontend/`、`backend/`、`docs/`，搬移 `pages/`、`assets/`、`mock-api/`
- [ ] 根 `index.html` 改為 `frontend/index.html`
- [ ] 更新 `package.json` 腳本、`README.md`、`docs/api/README.md`
- [ ] `.gitignore` 加入 `backend/uploads/`
- [ ] 拆 `backend/server.js` 為 `app.js` + `lib/` + `routes/`
- [ ] 新增 `products`、`conversations`、`messages`、`deals`、`reviews` 空集合
- [ ] 遷移 `fish_data` 3 筆到 `products`，名稱去除行銷詞
- [ ] `GET /api/fish/data` 改為 products 相容層
- [ ] `PUT /api/users/profile` 支援 `nickname`、`city`、`district`、`address_line`
- [ ] `GET /api/products`、`POST /api/products/create`
- [ ] `POST /api/uploads` + 靜態目錄

**驗收**：以 `frontend/` 為網站根目錄啟動，首頁、商品頁、詳情頁、購物車皆正常；圖片可上傳；profile 可存地址。

### P1 Bot 外殼

- [ ] 移除舊 `#chat-panel`、`openChat`、`ensureAssistantBot`
- [ ] 建立 `demo/main.js` 與模組骨架
- [ ] 面板外殼、狀態列、收件匣按鈕、縮小、關閉、未讀紅點
- [ ] 尺寸切換（小 → 交易房放大）
- [ ] 助手房建立與載入
- [ ] 商品頁「與賣家聊聊」→ 開啟該賣家的交易房

**驗收**：任一頁可開關面板，登入後建立助手房，重整後仍在。

### P2 上架 AI

- [ ] `SELL` 意圖與六槽位
- [ ] 圖片壓縮上傳
- [ ] 草稿卡、修改、發布
- [ ] `POST /api/products/create`
- [ ] 發布後軟清除與狀態復位
- [ ] 上架時 `location` 預設帶入個人檔案地址

**驗收**：「剛釣到石斑 4.5 公斤 1 尾 放血冰鎮 2800」→ 補照片 → 草稿卡 → 發布 → 列表可見。

### P3 導購 AI

- [ ] `BUY` / `QUERY_REGION` / `QUERY_COOKING` / `QUERY_PRICE`
- [ ] 查詢 products 並產生商品卡
- [ ] 深入諮詢（肉質、刺、料理建議）
- [ ] 指涉解析與多筆結果
- [ ] 未指定地區時使用個人檔案地區

**驗收**：「附近有什麼魚」→ 依個人地址地區推薦；「適合長輩煮湯」→ 說明原因。

### P4 交易房與訂單草稿

- [ ] 購買意願與尾數抽取
- [ ] `POST /api/deals/initiate-channel`
- [ ] 交易房渲染：電話橫幅（全號 + `tel:`）、訊息流、輸入框
- [ ] 訂單摘要面板：項目、尾數、小計、刪除、清空
- [ ] 加購同一賣家其他商品（`POST /api/deals/items`）
- [ ] 3 秒輪詢、未讀、`POST /read`
- [ ] 收件匣與房間切換
- [ ] 商品頁進入交易房

**驗收**：Chrome 買家對同賣家兩項商品加購 → 同一房、同一訂單、小計正確；Edge 賣家 3 秒內看到訊息。

### P5 協議

- [ ] 協議表單（整單金額、地點、時間）
- [ ] `POST /api/deals/propose` + 逐項可售檢查
- [ ] `deal_card` 渲染與同意／退回／取消
- [ ] `respond` / `cancel`
- [ ] 30 分鎖定、15 分保留、`sweepExpired`
- [ ] 商品剩餘尾數與狀態即時更新

**驗收**：提案 → 賣家同意 → 各商品 `sold_quantity` 正確；退回 → 協商中 → 重送；取消 → 立即釋放。

### P6 評價與交易紀錄

- [ ] `review_card` 與送出
- [ ] `POST /api/reviews/submit`、rating、黑名單
- [ ] 個人抽屜：`聊聊` 分頁改為 `交易紀錄`
- [ ] 交易紀錄列表與詳情（多品項、快照、評價）
- [ ] 個人資訊新增地址欄位（縣市 / 區 / 詳細地址）

**驗收**：完成交易後抽屜可見多品項紀錄；評價後對方 rating 更新。

### P7 收尾

- [ ] 移除 `05-listings.js` 聊天彙整、`07-drawer-panels.js` 聊聊分頁
- [ ] 更新 `docs/api/README.md`、`backend/README.md`
- [ ] 兩瀏覽器完整流程走一次（第 12 節）
- [ ] 所有檔案行數 ≤ 200

---

## 12. 驗收腳本（兩個瀏覽器）

準備：Chrome 登入 `0912345678 / seller123`（阿海）；Edge 無痕登入 `0987654321 / buyer123`（小魚）。

1. 賣家在 bot 說「剛釣到石斑 4.5 公斤 1 尾 放血冰鎮」→ 回「2800」→ 上傳照片 → 發布
2. 再上架一筆「嘉鱲 2.2 公斤 2 尾 三去處理 2200」
3. 商品列表出現兩筆，標題為描述式、無行銷詞
4. 買家在個人檔案填「新北市 / 瑞芳區 / 鼻頭路 1 號」
5. 買家說「附近有什麼魚」→ 依新北市推薦
6. 點石斑「洽談購買」1 尾 → 進入交易房
7. 在交易房按「＋ 加購」→ 選嘉鱲 2 尾 → 訂單顯示 2 項、小計 5000
8. 按「協商完畢」→ 整單 4800 / 基隆火車站南站 / 今日 17:30
9. 賣家 3 秒內收到紅點 → 協議卡顯示 2 個品項
10. 賣家按「退回」→ 改成 4900 → 重送
11. 買家按「同意」→ 兩項商品 `sold_quantity` 正確，狀態更新
12. 雙方各評 5 星 → 對方 rating 更新
13. 買家抽屜「交易紀錄」→ 可見 2 個品項的快照與成交金額
14. 重新整理兩個瀏覽器 → 訊息、訂單、評價全部還在

---

## 13. 待確認事項（若無指示，採下列預設）

| 項目 | 預設 |
|---|---|
| 交易房唯一鍵 | `buyer_id + seller_id` |
| 同一房同時訂單數 | 1 筆草稿 + 1 筆進行中 |
| 議價方式 | 整單 `final_price`，逐項單價僅參考 |
| 鎖定時間 | 30 分鐘 |
| 退回保留 | 15 分鐘 |
| 圖片上限 | 5MB，壓縮長邊 1280 / JPEG 0.75 |
| 輪詢間隔 | 3 秒，分頁隱藏時暫停 |
| 評語長度 | 100 字 |
| 標籤數量 | 單邊最多 3 個 |
| 黑名單門檻 | 累計 3 次「臨時放鳥」 |
| 電話可見時機 | 交易房建立後 |
| 未登入 | 可導購，交易需登入 |
| 購物車 | 本輪保留，下一輪移除 |
| 網站根目錄 | `frontend/` |
| 上架 `location` | 預設帶入個人檔案地址，可修改 |
