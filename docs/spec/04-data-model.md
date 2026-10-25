# 04 資料模型

資料全部存在 `backend/db.json`（json-server 的 lowdb）。沒有資料庫、沒有遷移工具；改 schema 就是改 JSON。

## 1. 集合總覽

| 集合 | 筆數（2026-10-25） | 狀態 |
| --- | ---: | --- |
| `users` | 4 | ✅ |
| `products` | 5 | ✅ |
| `conversations` | 3 | ✅（助手房；交易房由開啟交易房建立） |
| `messages` | 78 | ✅ |
| `deals` | 0 | ✅ 草稿由開啟交易房建立 |
| `reviews` | 0 | ⬜ 無路由會寫入 |
| `market_prices` | 不存在 | ⬜ |
| `species_market_codes` | 不存在 | ⬜ |
| `market_locations` | 不存在 | ⬜ |
| `fetch_state` | 不存在 | ⬜ |

> `db.json` 是開發資料，筆數會隨測試變動；上表只是寫這份文件時的快照。

## 2. 識別碼與序號

| 對象 | 格式 | 規則 |
| --- | --- | --- |
| 使用者 | 整數 | 目前最大值 + 1 |
| 商品 | `prd_YYYYMMDD_NNN` | 以台灣時間取日期，當日流水號 |
| 對話 | `conv_YYYYMMDD_NNN` | 同上 |
| 訊息 | `msg_YYYYMMDD_NNN` + `seq` | `seq` 是**全域**單調遞增，不是每個房間各自編號 |
| 訂單 | `deal_YYYYMMDD_NNN` | 同上（草稿已實作） |
| 評價 | `rev_YYYYMMDD_NNN` | 同上（目標） |

`seq` 全域遞增是刻意的：輪詢用「大於上次序號」取增量，同毫秒的多則訊息也不會漏。

## 3. `users`

| 欄位 | 型態 | 說明 |
| --- | --- | --- |
| `id` | number | |
| `username` | string | 手機號碼，唯一 |
| `password` | string | **明文**（已知缺陷） |
| `display_name` | string | 暱稱 |
| `role` | `BUYER` \| `SELLER` | 顯示標籤，不影響權限 |
| `is_verified` | boolean | |
| `completed_orders` | number | 舊欄位，與 `completed_deals` 重複 |
| `completed_deals` | number | 成交筆數 |
| `rating_score` | number | 平均星等 |
| `review_count` | number | 評價數 |
| `no_show_count` | number | 臨時放鳥次數 |
| `is_blacklisted` | boolean | 未到 3 次後為真 |
| `city` / `district` / `address_line` | string | 地址三段 |
| `bank_code` / `bank_account` / `bank_account_name` | string | 不對外回傳 |

**回應時衍生**（不落庫）：`display_address` = 三段串接；`region` = `city`。密碼與三個銀行欄位一律移除。

## 4. `products`

| 欄位 | 型態 | 說明 |
| --- | --- | --- |
| `id` | string | |
| `seller_id` | number | 由 Token 決定，不由 client 傳 |
| `title` | string | 伺服器產生 |
| `fish_species` | string | 使用者說的魚種名稱（未知魚種也存這裡） |
| `species_id` | string \| null | 對到字典才有 |
| `species_latin` | string | |
| `weight_kg` | number | 整批總重（公斤，一位小數） |
| `quantity` | number | 總尾數 |
| `sold_quantity` | number | 已成交尾數，系統維護 |
| `condition` | string | 四種處理方式之一 |
| `photo_url` | string | `/uploads/xxx.jpg` |
| `price` | number | **整批總價（元）** |
| `market_reference_price` | number | 由魚種示意行情換算（暫時） |
| `region` | string | 縣市 |
| `location` | string | 完整地點，預設為個人地址 |
| `catch_time` | string | ISO 時間 |
| `created_at` | string | ISO 時間 |

**衍生**（讀取時算，不落庫）：`reserved_quantity`、`available`、`unit_price`、`avg_weight_kg`、`status`。

**目標變更**：新增 `market_snapshot`（見第 8 節）；`market_reference_price` 改由快照換算或移除。

**索引需求**：`seller_id`、`region`、`species_id`、`created_at`（目前是線性掃描，資料量小可接受）。

## 5. `conversations`

| 欄位 | 型態 | 助手房 | 交易房 |
| --- | --- | --- | --- |
| `id` | string | ✓ | ✓ |
| `type` | `assistant` \| `deal` | `assistant` | `deal` |
| `user_ids` | number[] | `[userId]` | `[buyerId, sellerId]` |
| `buyer_id` | number \| null | `null` | 買家 |
| `seller_id` | number \| null | `null` | 釣客 |
| `mode` | `AI` \| `HUMAN` | `AI` | `HUMAN` |
| `context` | object \| null | ✓ | `null` |
| `read_at` | `{ [userId]: ISO }` | ✓ | ✓ |
| `cleared_before_seq` | number | ✓（可缺） | 不使用 |
| `archived` | boolean | ✓ | ✓ |
| `created_at` / `last_message_at` | string | ✓ | ✓ |

**助手房 `context`**

```jsonc
{
  "mode": "idle | listing | shopping",
  "draft": { "fish_species", "weight_kg", "quantity", "condition", "photo_url", "price" },
  "last_cards": ["prd_...", "prd_..."]
}
```

**唯一鍵**：助手房＝`type + user_ids[0]`；交易房＝`type + buyer_id + seller_id`。

**權限**：一律以 `user_ids` 判斷。`buyer_id` / `seller_id` 只作為語意標籤與查詢用，**必須與 `user_ids` 一致**（ADR 0001）。

**已知缺陷**：舊計畫書只用 `buyer_id` / `seller_id` 定義交易房，若照那個 schema 建房，雙方都會被 403。

## 6. `messages`

| 欄位 | 型態 | 說明 |
| --- | --- | --- |
| `id` | string | |
| `seq` | number | 全域遞增 |
| `conversation_id` | string | |
| `sender_id` | number \| `"ai"` \| `"system"` | |
| `type` | `text` \| `image` \| `system` \| `card` | |
| `text` | string | 上限 500 字 |
| `image_url` | string \| null | |
| `card` | object \| null | 見 `02-domain.md` 第 5 節 |
| `created_at` | string | |

**卡片內容**

```jsonc
{ "type": "product", "product_id": "prd_...", "title": "...", "price": 2800, "unit_price": 2800,
  "weight_kg": 4.5, "quantity": 1, "available": 1, "condition": "放血冰鎮",
  "region": "新北市", "location": "...", "catch_time": "...", "seller_id": 1 }

{ "type": "draft", "draft": { } }

{ "type": "deal", "deal_id": "deal_...", "status": "pending",
  "initiator_id": 2, "final_price": 4800,
  "meetup_location": "基隆火車站南站 7-11 門口", "meetup_time": "...",
  "items_total": 5000,
  "items": [{ "title": "...", "quantity": 1, "unit_price": 2800 }] }
{ "type": "order" }                                               // 目標
{ "type": "review" }                                              // 目標
```

**目標**：`deal` 卡狀態值統一為 `pending` / `rejected` / `confirmed` / `cancelled` / `expired`；目前提案會寫入 `pending`，逾時流程會寫 `expired`。

## 7. `deals`

`DRAFT` 由開啟交易房建立；送提案後是 `PENDING_REVIEW`，退回是 `NEGOTIATING`，同意是 `CONFIRMED`，取消或逾時是 `CANCELLED`。協議卡的 `status` 會跟著最新一張卡同步為 `pending`／`rejected`／`confirmed`／`cancelled`／`expired`。舊卡保留當時的狀態。

```jsonc
{
  "id": "deal_20261025_001",
  "conversation_id": "conv_...",
  "buyer_id": 2,
  "seller_id": 1,
  "initiator_id": 2,
  "items": [
    { "item_id": "itm_01", "product_id": "prd_...",
      "title": "石斑（4.5kg / 1尾 / 放血冰鎮）",
      "photo_url": "/uploads/a.jpg",
      "unit_price": 2800, "weight_kg": 4.5, "quantity": 1 }
  ],
  "items_total": 5000,
  "deal_terms": {
    "final_price": 4800,
    "meetup_location": "基隆火車站南站 7-11 門口",
    "meetup_time": "2026-10-25T17:30:00+08:00"
  },
  "deal_status": "DRAFT",
  "buyer_confirmed": true,
  "seller_confirmed": false,
  "rejected_by": null,
  "lock_expires_at": null,
  "hold_expires_at": null,
  "review_status": { "buyer_reviewed": false, "seller_reviewed": false },
  "cancelled_by": null,
  "cancel_reason": null,
  "created_at": "...",
  "updated_at": "...",
  "confirmed_at": null
}
```

- `items[]` 是商品快照，不隨商品變動；`GET /api/deals/:id` 讀取時會為每項附上 `available`（不落庫）。
- `updated_at` 會在項目變動、提案、回應、取消或逾時時更新，供前端判斷是否重抓明細。
- `rejected_by` 記住最後一位按「退回」的人；只有這個人可以把 `NEGOTIATING` 的訂單重新送出。
- `deal_terms` 在 `DRAFT` 可以為 `null`。
- `cancel_reason`：`SELLER_OUT_OF_STOCK`、`BUYER_CHANGED_MIND`、`TERMS_MISMATCH`、`OTHER`、`LOCK_EXPIRED`、`HOLD_EXPIRED`。
- `cancelled_by` 是使用者 id；逾時取消時是 `"system"`。

## 8. `reviews`（目標）

```jsonc
{ "id": "rev_20261025_001", "deal_id": "deal_...",
  "reviewer_id": 2, "target_user_id": 1, "reviewer_role": "buyer",
  "rating": 5, "tags": ["準時守約"], "comment": "魚很新鮮，準時到",
  "created_at": "..." }
```

唯一鍵：`deal_id + reviewer_id`。

## 9. 行情資料表（目標）

### `market_prices`

```jsonc
{ "id": "mkt_20261022_1011_岡山",
  "species_code": 1011, "species_id": null, "species_name": "吳郭魚",
  "market_name": "岡山", "region": "高雄市",
  "trade_date": "2026-10-22",
  "price_per_kg_low": 36.3, "price_per_kg_mid": 53.2,
  "price_per_kg_high": 66.0, "price_per_kg_avg": 52.4,
  "volume": 4286, "volume_unit": "kg",
  "source": "農業部漁產品交易行情", "source_url": "https://...",
  "fetched_at": "...", "quality": "official" }
```

唯一鍵：`trade_date + species_code + market_name`。索引需求：`species_id + region + trade_date`、`trade_date`。

### `species_market_codes`

```jsonc
{ "code": 1011, "official_name": "吳郭魚", "species_id": null, "aliases": ["台灣鯛"] }
```

### `market_locations`

```jsonc
{ "market_name": "岡山", "region": "高雄市", "verified": true, "note": "" }
```

### `fetch_state`

```jsonc
{ "id": "market_fetch", "last_success_at": "...", "last_trade_date": "2026-10-22",
  "last_row_count": 1832, "last_error": null, "last_error_at": null }
```

## 10. 保留與備份

| 資料 | 保留 | 說明 |
| --- | --- | --- |
| 商品、對話、訂單、評價 | 永久 | 沒有刪除功能 |
| 行情 | 90 天 | 目標 |
| 行情原始檔 | 7 天 | 目標 |
| 上傳圖片 | 永久 | `backend/uploads/`，不進版控 |
| Token | 記憶體 | 重啟即失效 |

`db.json` 是唯一資料來源，**沒有任何備份機制**；開發時建議定期複製。
