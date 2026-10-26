# 04 資料模型

資料全部存在 `backend/db.json`（json-server 的 lowdb）。沒有資料庫、沒有遷移工具；改 schema 就是改 JSON。

## 1. 集合總覽

| 集合 | 筆數（2026-10-25） | 狀態 |
| --- | ---: | --- |
| `users` | 4 | ✅ |
| `products` | 5 | ✅ |
| `conversations` | 3 | ✅（助手房可多間；交易房由開啟交易房建立） |
| `messages` | 78 | ✅ |
| `deals` | 0 | ✅ 草稿由開啟交易房建立 |
| `reviews` | 0 | ✅ 成交後由 `POST /api/reviews/submit` 寫入 |
| `market_prices` | 0（第一次查詢後建立） | ✅ 只存平均價、交易量與養殖旗標 |
| `species_market_codes` | 28 | ✅ 每個系統魚種一個主要新鮮代碼 |
| `market_locations` | 21 | ✅ 21 個市場對照；未確認市場不參與縣市加權 |
| `market_fetch_state` | 0（第一次查詢後建立） | ✅ 每個官方代碼一筆快取狀態 |

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
| `city` / `district` / `address_line` | string | 地址三段；`city` 註冊時必填，區與詳細地址可後補 |
| `seller_terms_accepted_at` | string \| null | 第一次販賣確認時間；有值就永久跳過法規告知 |
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
| `condition` | string | 自由文字，最多 20 字 |
| `photo_url` | string | `/uploads/xxx.jpg` |
| `price` | number | **上架整批售價（元）**；訂單／協議使用 |
| `price_per_taijin` | number \| null | 上架每台斤售價（元）；可空 |
| `price_auto` | boolean | 整批售價是否由每台斤自動計算 |
| `market_snapshot` | object \| null | 發布時凍結的行情；見第 9 節 |
| `region` | string | 縣市 |
| `location` | string | 完整地點，預設為個人地址 |
| `catch_time` | string | ISO 時間 |
| `created_at` | string | ISO 時間 |

**衍生**（讀取時算，不落庫）：`reserved_quantity`、`available`、`unit_price`、`avg_weight_kg`、`status`。

**變更（#24、#27）**：新增 `price_per_taijin`、`price_auto` 與 `market_snapshot`；移除 `market_reference_price`；`condition` 不再限定四種。`market_snapshot`、自由文字 `condition`、每台斤售價與自動計算已實作（#24、#26、#27）。只填每台斤時，後端在建立商品時計算 `price` 並設 `price_auto = true`；只填整批時 `price_per_taijin = null`；兩者都填時都保留，不檢查一致性。

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
  "draft": {
    "fish_species", "species_id", "weight_kg", "quantity", "condition", "photo_url",
    "price", "price_per_taijin", "price_auto"
  },
  "last_cards": ["prd_...", "prd_..."],
  "market_quoted": false,
  "choosing_edit": null,
  "pending_sale_text": null,
  "awaiting_consent": false
}
```

`pending_sale_text` 只在法規告知期間有值；`awaiting_consent` 標記等待法規確認。確認後用它進入 listing、兩者清空；取消後也清空。`seller_terms_accepted_at` 一旦寫入永久有效，不因法規文字更新重問。`market_quoted` 標記這份草稿已送過行情卡；魚種或重量改變時重設。`choosing_edit` 標記正在等待使用者選擇要修改的草稿欄位。

**唯一鍵**：助手房＝`id`（每位使用者可以有多間，不再用 `type + user_ids[0]`）；交易房＝`type + buyer_id + seller_id`。

**刪除**：

- 助手房任何時候都能刪；刪除時移除該房訊息與 context。
- 交易房必須沒有任何 `CONFIRMED` 訂單，且目前訂單 `CANCELLED`（或全部訂單皆 `CANCELLED`）時才能刪；刪除時一併移除訊息、`deals` 與 `deal_items`，交易紀錄不再顯示。有成交歷史或進行中（`DRAFT`／`PENDING_REVIEW`／`NEGOTIATING`）不可刪。

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
{ "type": "product", "product_id": "prd_...", "title": "...",
  "price": 2800, "price_per_taijin": 373.3, "price_auto": false, "unit_price": 2800,
  "weight_kg": 4.5, "quantity": 1, "available": 1, "condition": "放血冰鎮",
  "region": "新北市", "location": "...", "catch_time": "...", "seller_id": 1,
  "market_snapshot": { "scope": "city", "region": "新北市", "trade_date": "2026-10-22",
    "price_per_kg": 52.4, "price_per_taijin": 31.4, "is_aquaculture": false,
    "source": "農業部漁產品交易行情", "source_url": "...", "fetched_at": "...", "quality": "official" } }

{ "type": "draft", "draft": { "fish_species": "花枝", "weight_kg": 3, "quantity": 2,
  "condition": "放血冰鎮", "photo_url": "/uploads/a.jpg",
  "price": 1000, "price_per_taijin": 200, "price_auto": false } }

{ "type": "market_quote", "species_id": "cuttlefish", "species_name": "花枝",
  "scope": "city", "region": "高雄市", "trade_date": "2026-10-22",
  "price_per_kg": 52.4, "price_per_taijin": 31.4, "is_aquaculture": false,
  "source": "農業部漁產品交易行情", "source_url": "...", "fetched_at": "...",
  "weight_kg": 3, "weight_taijin": 5, "estimated_total": 157,
  "history": [{ "trade_date": "2026-10-16", "price_per_taijin": 30.1 },
              { "trade_date": "2026-10-22", "price_per_taijin": 31.4 }],
  "history_30": [{ "trade_date": "2026-09-01", "price_per_taijin": 29.8 }],
  "high": 31.4, "low": 30.1, "high_30": 31.4, "low_30": 29.8 }

{ "type": "legal_consent", "title": "販賣漁獲需具備合法證照",
  "text": "販賣魚貨（一支釣）需依照法規申請相關合法證照；未申請可依法開罰新臺幣三萬元以上三十萬元以下罰鍰。",
  "law_name": "漁業法", "law_url": "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=M0050001",
  "accept_label": "我已了解並確認", "decline_label": "取消" }

{ "type": "draft_cancel" }                                        // 取消上架確認卡

{ "type": "deal", "deal_id": "deal_...", "status": "pending",
  "initiator_id": 2, "final_price": 4800,
  "meetup_location": "基隆火車站南站 7-11 門口", "meetup_time": "...",
  "items_total": 5000,
  "items": [{ "title": "...", "quantity": 1, "unit_price": 2800 }] }
{ "type": "order" }                                               // 目標
{ "type": "review", "deal_id": "deal_...", "buyer_id": 2, "seller_id": 1,
  "buyer_reviewed": false, "seller_reviewed": false }
```

**卡片狀態**：`deal` 卡為 `pending` / `rejected` / `confirmed` / `cancelled` / `expired`。`review` 卡沒有狀態欄位，改用 `buyer_reviewed`／`seller_reviewed` 表示雙方是否已評價。

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
- `review_status` 由評價端點維護，成交後插入的評價卡會跟著更新。
- **刪除**：交易房刪除時，該房所有 `deals` 與其項目一起移除；房內須無 `CONFIRMED` 歷史，且目前訂單為 `CANCELLED`（或全部訂單皆 `CANCELLED`）才可刪。商品的可售／已售不受影響（取消時已釋放保留）。

## 8. `reviews`

```jsonc
{ "id": "rev_20261025_001", "deal_id": "deal_...",
  "reviewer_id": 2, "target_user_id": 1, "reviewer_role": "buyer",
  "rating": 5, "tags": ["準時守約"], "comment": "魚很新鮮，準時到",
  "created_at": "..." }
```

- 唯一鍵：`deal_id + reviewer_id`；重複評價回 409。
- `tags` 最多 3 個（送去重的前長度就必須 ≤ 3），必須是「準時守約／魚貨新鮮／溝通良好／包裝完善／臨時放鳥」之一。
- 送出後用該對象的全部評價重算 `rating_score` 與 `review_count`；含「臨時放鳥」時 `no_show_count` +1，達 3 次 `is_blacklisted = true`。

## 9. 行情資料表（已實作）

### `market_prices`

```jsonc
{ "id": "mkt_20261022_2201_岡山",
  "species_code": 2201, "species_id": "grouper", "species_name": "石斑魚",
  "market_name": "岡山",
  "trade_date": "2026-10-22",
  "price_per_kg_avg": 52.4,
  "volume_kg": 4286,
  "is_aquaculture": false,
  "source": "農業部漁產品交易行情", "source_url": "https://...",
  "fetched_at": "...", "quality": "official" }
```

唯一鍵：`trade_date + species_code + market_name`。索引需求：`species_id + trade_date`、`trade_date`。**不落庫縣市**；查詢時用 `market_locations` 對照，避免對照變更後舊資料的縣市失準。

### `species_market_codes`

```jsonc
{ "code": 2201, "official_name": "石斑魚", "species_id": "grouper",
  "is_aquaculture": false, "category": "2", "aliases": ["石斑"] }
```

- 每個系統魚種只放一個主要新鮮代碼；`1xxx` 只允許海鱸（1073）、虱目魚（1041）、鰻魚（1031）。
- 排除 `3xxx` 凍結、`6xxx` 加工。
- `is_aquaculture = true`：上述三種魚，以及名稱有「養」的牡蠣（5012）、文蛤（5022）。香魚（2631）、白蝦（4015）依目前規則不標。
- `category` 記官方大分類，供檢查；查詢不靠代碼第一位猜測。
- 魚種清單仍只來自 `backend/lib/species.js`；本表只補官方代碼。後端啟動時由 `lib/market/mappings.js` 同步到 db。

### `market_locations`

```jsonc
{ "market_name": "岡山", "region": "高雄市", "verified": true, "note": "" }
```

21 個市場；`verified = false` 的市場不參與縣市加權，仍計入全國平均。`market_prices` 不落庫縣市，查詢時才用本表對照，避免對照變更後舊資料的縣市失準。

### `market_fetch_state`

```jsonc
{ "species_code": 2201, "species_id": "grouper",
  "last_checked_at": "...", "last_trade_date": "2026-10-22",
  "last_row_count": 8, "last_status": "ok",
  "last_error": null, "last_error_at": null,
  "last_range_from": "2026-08-16", "last_range_to": "2026-10-22",
  "last_latest_at": "2026-10-27T04:00:00.000Z" }
```

- 每個官方代碼一筆；`last_status`：`ok`／`no_data`／`error`。
- `last_range_from`／`last_range_to` 是內部快取提示：同一個過去日期範圍已抓過就不再打上游。
- `last_latest_at` 只記錄「最近交易日」查詢的成功或失敗時間；指定日期查詢不會刷新它，避免把舊日期誤當成最新交易日。
- 最新交易日只抓最近 14 個日曆日，足以跨過週末與連續休市；指定日期與歷史才抓各自範圍。
- 最新交易日快取 30 分鐘；過去日期不變；negative cache 30 分鐘。
- 上游失敗只更新檢查時間、狀態與錯誤，不清空既有行情，也不改最後交易日與筆數。
- 成功抓取後刪除 90 天以前的行情與狀態。
- 同一魚種同時查詢只發一次上游 request（in-flight dedup）。
- 手動 CLI：`npm run market:fetch -- <species_id> [--date YYYY-MM-DD] [--days 7|30]`；`--status` 看每個代碼的快取狀態。

### 商品 `market_snapshot`

```jsonc
{ "scope": "city", "region": "高雄市", "trade_date": "2026-10-22",
  "price_per_kg": 52.4, "price_per_taijin": 31.4,
  "is_aquaculture": false,
  "source": "農業部漁產品交易行情", "source_url": "...",
  "fetched_at": "...", "quality": "official" }
```

- 發布時寫入；之後行情更新或商品改價都不變。
- 不存走勢歷史；走勢只存在行情卡訊息裡。
- 查無或上游失敗時為 `null`；商品仍可發布，畫面顯示「暫無行情」。

## 10. 保留與備份

| 資料 | 保留 | 說明 |
| --- | --- | --- |
| 商品、成交訂單、評價 | 永久 | 商品不可刪；成交訂單不可刪 |
| AI 對話、已取消交易房 | 可刪除 | 助手房任何時候；交易房須無 `CONFIRMED` 歷史且目前訂單 `CANCELLED`；刪除交易房一併刪該房所有訂單與項目 |
| 行情 | 90 天 | 目標；只快取被查詢過的魚種與日期 |
| 行情原始檔 | 7 天 | 目標 |
| 上傳圖片 | 永久 | `backend/uploads/`，不進版控 |
| Token | 記憶體 | 重啟即失效 |

`db.json` 是唯一資料來源，**沒有任何備份機制**；開發時建議定期複製。
