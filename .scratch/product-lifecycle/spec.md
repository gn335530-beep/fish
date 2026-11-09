# 商品上架紀錄、下架、重新上架與刪除

Status: ready-for-agent
Date: 2026-11-08

## 1. 背景

目前商品一旦上架就沒有下架或刪除機制。`docs/spec/02-domain.md` 明文寫「商品沒有『下架』狀態；本版不提供刪除，商品一旦上架就留在清單上，直到售完」，`docs/spec/07-roadmap.md` 也把「商品是否可下架」列為本版不可。

這個 spec 定義新的商品生命週期：釣客可以從「上架紀錄」查看自己所有未刪除的商品，並依狀態下架、重新上架或刪除。公開列表只顯示仍可購買的商品。

**這份文件只定義設計，不含實作。**

## 2. 已定案決策

| 題目 | 決策 |
| --- | --- |
| 入口 | 導覽列三條線選單的「我的」新增「上架紀錄」；個人資訊抽屜也加入口 |
| 未登入 | 保留入口，點擊顯示登入引導 |
| 上架紀錄 tabs | 上架中／已下架／已售出；預設上架中；tabs 顯示數量 |
| 公開列表 | 只顯示 `ACTIVE` 與 `PARTIALLY_RESERVED` |
| 下架時機 | `ACTIVE`、`PARTIALLY_RESERVED` 隨時可下架，即使有進行中訂單 |
| 下架對訂單 | `PENDING_REVIEW` 照走；`NEGOTIATING` 自動取消；`DRAFT` 自動移除 |
| 重新上架 | 僅 `DELISTED` 且還有未售尾數；`listed_at = now`，回到公開列表最前面 |
| 刪除資格 | `SOLD_OUT` 直接刪；`DELISTED` 可刪；`ACTIVE`／`PARTIALLY_RESERVED` 必須先下架 |
| 刪除方式 | 硬刪 `products` 資料列；照片檔保留；隱藏數字計數器避免商品 ID 重用 |
| 刪除對訂單 | `PENDING_REVIEW` 照走；`NEGOTIATING` 自動取消；`DRAFT` 自動移除；`CONFIRMED`／`CANCELLED` 保留快照 |
| 退回協議 | 商品已下架或已刪除時，`PENDING_REVIEW` 退回直接取消，不進入 `NEGOTIATING` |
| 確認方式 | 單次 `window.confirm` |
| 錯誤訊息 | 「此商品已下架」 |

## 3. 名詞

- **上架紀錄**：目前登入的釣客所有未刪除商品的清單，依狀態分成上架中、已下架、已售出。
- **下架**：釣客停止販售商品剩餘尾數。商品從公開列表移除，但保留在上架紀錄；若還有未售尾數，可重新上架。
- **重新上架**：把已下架商品恢復販售。狀態依剩餘尾數與保留量重新推導。
- **刪除**：把商品從上架紀錄與資料庫永久移除。刪除前必須先下架，`SOLD_OUT` 例外。
- **取消上架**：既有名詞，只指助手房草稿階段放棄整筆草稿；**不是**已發布商品的下架。兩者不可混用。
- **可售尾數**：商品還沒被買走、也還沒被進行中訂單保留的尾數。已下架商品的可售尾數一律視為 0。

## 4. 狀態模型

### 4.1 狀態

| 狀態 | 畫面文字 | 說明 |
| --- | --- | --- |
| `ACTIVE` | 上架中 | 可購買 |
| `PARTIALLY_RESERVED` | 洽談中 | 有進行中訂單保留尾數 |
| `SOLD_OUT` | 已售出 | 可售 0 且沒有保留 |
| `DELISTED` | 已下架 | 釣客停止販售剩餘尾數 |

### 4.2 推導公式

```
保留 = Σ(進行中訂單中該商品的尾數)      // 進行中 = PENDING_REVIEW 或 NEGOTIATING
可售 = 已下架 ? 0 : max(0, 總尾數 − 已售 − 保留)

狀態 = 已下架     → DELISTED
       保留 > 0   → PARTIALLY_RESERVED
       可售 ≤ 0   → SOLD_OUT
       否則       → ACTIVE
```

- 狀態與可售尾數即時計算、不落庫（沿用 ADR 0002）。
- `DRAFT` 訂單不計入保留。
- 已下架優先於其他狀態：即使有保留量或已售完，只要 `delisted_at` 有值就是 `DELISTED`。
- `SOLD_OUT` 必須是「可售 0 且沒有保留」。

### 4.3 生命週期

```
ACTIVE / PARTIALLY_RESERVED ──下架──> DELISTED ──重新上架──> 狀態重算
ACTIVE / PARTIALLY_RESERVED ──下架──> DELISTED ──刪除──> 消失
SOLD_OUT ──刪除──> 消失
```

- `SOLD_OUT` 不能下架，只能直接刪除。
- `DELISTED` 若還有未售尾數可重新上架；沒有未售尾數只能刪除。

## 5. 公開可見性

- `GET /api/products` 只回傳 `ACTIVE` 與 `PARTIALLY_RESERVED`。
- `SOLD_OUT`、`DELISTED`、已刪除商品都不出現在首頁「今日漁獲」、漁獲列表、助手推薦卡與加購清單。
- `PARTIALLY_RESERVED` 即使可售 0 尾，仍留在公開列表，顯示「洽談中，暫無法購買」。
- `GET /api/products/:id` 仍可讀取單筆商品（供舊卡片與交易房使用）：
  - 已刪除：404 `PRODUCT_NOT_FOUND`。
  - `SOLD_OUT`／`DELISTED`：200，回傳狀態。
- `GET /api/products/mine` 回傳目前登入釣客所有未刪除商品，包含四種狀態。

## 6. 上架紀錄 UI

### 6.1 入口

- 導覽列三條線選單的「我的」區塊，順序為：個人資訊、交易紀錄、上架紀錄。
- 個人資訊抽屜上方也加一個「上架紀錄」入口。
- 未登入時仍顯示入口；點擊後抽屜顯示「請先登入」引導。

### 6.2 抽屜視圖

- 標題：「上架紀錄」；左上角「← 個人資訊」返回。
- 三個 tabs：上架中、已下架、已售出。
- 預設 tab：上架中。
- 每個 tab 顯示商品數量。
- 載入中顯示「載入中…」；載入失敗顯示錯誤與「重新載入」按鈕。
- 各 tab 空狀態：
  - 上架中：「目前沒有上架中的商品。」
  - 已下架：「目前沒有已下架的商品。」
  - 已售出：「目前沒有已售出的商品。」

### 6.3 商品列

每列顯示：

- 商品縮圖。
- 魚種＋處理方式。
- 狀態徽章（上架中／洽談中／已售出／已下架）。
- `共 N 尾 · 已售 M 尾`；`保留 R 尾` 只在 R > 0 時顯示。
- `整批 NT$X`；有 `price_per_taijin` 時另顯示 `NT$Y／台斤`。
- `上架：MM/DD HH:mm`，使用 `listed_at`。
- `下架：MM/DD HH:mm`，只在 `DELISTED` 時顯示，使用 `delisted_at`。
- 動作按鈕依 tab 顯示。

### 6.4 Tabs 與動作

| Tab | 包含狀態 | 動作 |
| --- | --- | --- |
| 上架中 | `ACTIVE`、`PARTIALLY_RESERVED` | 下架 |
| 已下架 | `DELISTED` | 重新上架（有未售尾數時）、刪除 |
| 已售出 | `SOLD_OUT` | 刪除 |

- 已下架但沒有未售尾數：只顯示刪除。
- 動作成功後重新載入 `/api/products/mine`，更新 tabs 與列表。
- 動作成功後觸發 `haisen:products-changed`，讓首頁與漁獲列表重載。

### 6.5 確認與回饋

**下架**：點擊後使用 `window.confirm` 確認。

> 確定下架？下架後買家將看不到此商品。等待確認的訂單仍會繼續；洽談中的訂單會自動取消。

**刪除**：點擊後使用 `window.confirm` 確認。

> 確定刪除？刪除後商品與上架紀錄將永久消失，已成交訂單仍保留。等待確認的訂單仍會繼續；洽談中的訂單會自動取消。

**重新上架**：不跳確認，直接執行。

成功 toast：

- 下架：「已下架」
- 重新上架：「已重新上架」
- 刪除：「已刪除」

失敗時顯示後端錯誤訊息；若商品狀態已改變，重新載入列表。

## 7. 動作規則

### 7.1 下架

**資格**：`ACTIVE` 或 `PARTIALLY_RESERVED`。

**行為**：

- 設定 `delisted_at = now`。
- 可售尾數視為 0，狀態變 `DELISTED`。
- 從公開列表移除。
- 商品仍保留在上架紀錄的「已下架」tab。

**既有訂單處理**：

- `PENDING_REVIEW`（等待確認）：不變。買家仍可確認，賣家仍須履約。
- `NEGOTIATING`（洽談中）：自動取消。設定 `deal_status = CANCELLED`、`cancel_reason = OTHER`、`cancel_note = "商品已下架"`，同步協議卡，並在交易房留下系統訊息「商品已下架，協議已取消。」
- `DRAFT`（草稿）：從所有包含該商品的草稿訂單移除該項目，重算 `items_total`，並在交易房留下系統訊息「『魚種』已下架，已從訂單草稿移除。」
- `CONFIRMED`／`CANCELLED`：不變。

### 7.2 重新上架

**資格**：`DELISTED` 且 `總尾數 − 已售 > 0`。

**行為**：

- 清空 `delisted_at`。
- 設定 `listed_at = now`。
- 狀態依公式重新推導（`ACTIVE` 或 `PARTIALLY_RESERVED`）。
- 回到公開列表，依 `listed_at` 排序，會出現在最前面。

**限制**：

- 已無未售尾數的已下架商品不顯示「重新上架」，只能刪除。
- `SOLD_OUT` 不能重新上架。

### 7.3 刪除

**資格**：

- `SOLD_OUT`：可直接刪除，不用先下架。
- `DELISTED`：可刪除。
- `ACTIVE`／`PARTIALLY_RESERVED`：不可刪除，必須先下架。

**行為**：

- 硬刪 `products` 資料列。
- 商品從上架紀錄與所有公開列表消失。
- 照片檔保留，因為舊訂單快照仍可能使用。
- 隱藏數字計數器保留，確保商品 ID 不重用。

**既有訂單處理**：

- `PENDING_REVIEW`：不變。買家仍可確認，賣家仍須履約；成交後訂單照常成立。
- `NEGOTIATING`：自動取消，規則同下架。
- `DRAFT`：自動移除該商品，規則同下架。
- `CONFIRMED`／`CANCELLED`：不變。訂單項目的商品快照（名稱、照片、金額、尾數）與評價都保留。
- 舊對話中的商品卡是歷史訊息，不會因刪除而消失；若商品已不存在，點擊相關動作會得到「這筆商品已不存在」。

### 7.4 退回協議的邊界

若商品已下架或已刪除，買家在 `PENDING_REVIEW` 按退回時：

- 不進入 `NEGOTIATING`。
- 直接取消訂單，`cancel_note` 為「商品已下架」或「商品已刪除」。
- 交易房留下系統訊息「商品已下架／已刪除，協議已取消。」

## 8. 資料模型

### 8.1 `products` 新增欄位

| 欄位 | 型態 | 說明 |
| --- | --- | --- |
| `listed_at` | string | 最近一次上架時間。建立時等於 `created_at`；重新上架時更新為 now。既有商品啟動時回填為 `created_at`。 |
| `delisted_at` | string \| null | 下架時間。重新上架時清空。未下架為 `null`。 |

- 不新增 `deleted_at`；刪除是硬刪資料列。
- 刪除後 `products` 不再有該商品。

### 8.2 商品 ID 計數器

為避免硬刪後 ID 重用，新增 `counters` 集合：

```json
{ "id": "products_20261108", "value": 3 }
```

`nextProductCode()` 規則：

1. `base = "prd_" + YYYYMMDD + "_"`（台灣時間）。
2. 取當日現有商品 ID 的最大流水號 `existingMax`。
3. 取 `counters` 中 `products_YYYYMMDD` 的 `value`（沒有則 0）。
4. `next = max(existingMax, value) + 1`。
5. 寫回 `counters`。
6. 回傳 `base + pad3(next)`。

- 只存數字，不保留任何商品內容。
- 其他集合（messages、conversations、deals、reviews）維持原本 `nextCode`。

### 8.3 照片檔

- 商品刪除時不刪除 `backend/uploads/` 的照片檔。
- 原因：舊訂單快照與舊對話卡片仍可能顯示該照片。

## 9. API

### 9.1 `GET /api/products/mine`

- 登入：必要。
- 回傳目前登入釣客所有未刪除商品，包含 `ACTIVE`、`PARTIALLY_RESERVED`、`SOLD_OUT`、`DELISTED`。
- 依 `listed_at` 由新到舊排序。
- 每筆含衍生欄位：`reserved_quantity`、`available`、`unit_price`、`avg_weight_kg`、`status`。
- 不回傳已刪除商品。
- 200 範例：

```json
{
  "success": true,
  "data": [
    {
      "id": "prd_20261108_001",
      "seller_id": 1,
      "fish_species": "石斑",
      "quantity": 3,
      "sold_quantity": 1,
      "price": 2800,
      "price_per_taijin": 373,
      "listed_at": "2026-11-08T05:00:00.000Z",
      "delisted_at": null,
      "reserved_quantity": 0,
      "available": 2,
      "status": "ACTIVE"
    }
  ],
  "message": "取得上架紀錄成功"
}
```

### 9.2 `POST /api/products/:id/delist`

- 登入：必要；只能操作自己的商品。
- 錯誤：
  - 404 `PRODUCT_NOT_FOUND`：商品不存在或已刪除。
  - 403 `FORBIDDEN`：不是商品擁有者。
  - 409 `PRODUCT_ALREADY_DELISTED`：已經下架。
  - 409 `PRODUCT_SOLD_OUT`：已售出商品請直接刪除。
- 成功 200：

```json
{
  "success": true,
  "data": {
    "product": { "id": "prd_20261108_001", "status": "DELISTED", "available": 0 },
    "cancelled_deals": 1,
    "removed_drafts": 2
  },
  "message": "商品已下架"
}
```

- 副作用：
  - 設定 `delisted_at = now`。
  - 移除所有草稿訂單中的該商品。
  - 取消所有 `NEGOTIATING` 訂單。
  - `PENDING_REVIEW` 不動。

### 9.3 `POST /api/products/:id/relist`

- 登入：必要；只能操作自己的商品。
- 錯誤：
  - 404 `PRODUCT_NOT_FOUND`：商品不存在或已刪除。
  - 403 `FORBIDDEN`：不是商品擁有者。
  - 409 `PRODUCT_NOT_DELISTED`：商品未下架。
  - 409 `PRODUCT_HAS_NO_STOCK`：已無未售尾數，無法重新上架。
- 成功 200：回傳更新後的商品，`status` 依公式重算。
- 副作用：`delisted_at = null`、`listed_at = now`。

### 9.4 `DELETE /api/products/:id`

- 登入：必要；只能操作自己的商品。
- 錯誤：
  - 404 `PRODUCT_NOT_FOUND`：商品不存在或已刪除。
  - 403 `FORBIDDEN`：不是商品擁有者。
  - 409 `PRODUCT_MUST_BE_DELISTED`：`ACTIVE`／`PARTIALLY_RESERVED` 必須先下架。
- 成功 200：

```json
{
  "success": true,
  "data": {
    "product_id": "prd_20261108_001",
    "cancelled_deals": 1,
    "removed_drafts": 2
  },
  "message": "商品已刪除"
}
```

- 副作用：
  - 移除所有草稿訂單中的該商品。
  - 取消所有 `NEGOTIATING` 訂單。
  - `PENDING_REVIEW` 不動。
  - 硬刪商品資料列。
  - 不刪照片檔。

### 9.5 `GET /api/products`

- 公開端點，只回傳 `ACTIVE` 與 `PARTIALLY_RESERVED`。
- `status` 參數仍存在，但只會在公開狀態內過濾；查 `SOLD_OUT`／`DELISTED` 會得到空陣列。
- `seller_id` 參數仍存在，但只回傳該釣客的公開商品；釣客自己的完整清單請用 `/api/products/mine`。
- 依 `listed_at` 由新到舊排序。
- 每次呼叫前仍執行 `sweepExpired()`。

### 9.6 `GET /api/products/:id`

- 已刪除：404 `PRODUCT_NOT_FOUND`。
- 其他狀態：200，回傳商品與衍生欄位（含 `DELISTED`／`SOLD_OUT`）。

### 9.7 `POST /api/products/create`

- 建立商品時設定 `listed_at = now`。
- 商品 ID 改用 `nextProductCode()`，不再使用 `nextCode("products", "prd")`。

### 9.8 交易流程的阻擋

以下端點在商品已下架時回 409 `PRODUCT_DELISTED`，訊息「『魚種』已下架，無法購買」或「『魚種』已下架，無法送出協議」：

- `POST /api/deals/initiate-channel`
- `POST /api/deals/items`
- `POST /api/deals/items/batch`
- `PATCH /api/deals/items/:itemId`
- `POST /api/deals/propose`

商品已刪除時回 404 `PRODUCT_NOT_FOUND`。

`POST /api/deals/respond` 的 `REJECT` 需套用第 7.4 節：商品已下架或已刪除時直接取消，不進入 `NEGOTIATING`。

## 10. 後端實作範圍

| 檔案 | 工作 |
| --- | --- |
| `backend/lib/store.js` | 新增 `nextProductCode()`；其他集合維持 `nextCode()` |
| `backend/lib/product-stock.js` | `decorateProduct()` 計算 `delisted`；已下架 `available = 0`；`statusOf()` 支援 `DELISTED` |
| `backend/lib/product-data.js` | 啟動時回填 `listed_at = created_at` |
| `backend/routes/products.js` | 新增 `GET /api/products/mine`；公開列表過濾；建立商品設定 `listed_at` 與新 ID |
| `backend/routes/product-lifecycle.js` | 新增 `delist`、`relist`、`DELETE` 三個端點 |
| `backend/lib/product-deals.js` | 草稿移除、`NEGOTIATING` 取消、系統訊息 |
| `backend/app.js` | 掛載 `product-lifecycle` 路由 |
| `backend/lib/deal-items.js` | `requireAddableQuantity()` 對已下架商品回 `PRODUCT_DELISTED` |
| `backend/routes/deal-proposal.js` | 送出協議前檢查已下架／已刪除商品 |
| `backend/routes/deal-response.js` | `REJECT` 對已下架／已刪除商品直接取消 |
| `backend/README.md` | 補上新端點 |

- 單一檔案不得超過 200 行；若 `product-lifecycle.js` 過長，拆成 `lib/product-deletion.js` 等模組。
- 所有新端點都要有擁有者檢查與狀態檢查。

## 11. 前端實作範圍

| 檔案 | 工作 |
| --- | --- |
| `frontend/assets/js/app/11-listing-history.js` | 新增上架紀錄抽屜視圖、tabs、列表、動作與確認 |
| `frontend/assets/js/api/products.js` | 新增 `listMyProducts()`、`delistProduct()`、`relistProduct()`、`deleteProduct()` |
| `frontend/assets/js/app/02-account.js` | 選單「我的」新增上架紀錄；綁定 `data-open-listings` |
| `frontend/assets/js/app/06-drawer.js` | `drawerView === "listings"` 分支；登出時重置列表 |
| `frontend/assets/js/app/07-drawer-panels.js` | 個人資訊頁新增上架紀錄入口與綁定 |
| `frontend/assets/css/account.css` | 上架紀錄列表、tabs、狀態徽章、動作按鈕樣式 |
| `frontend/pages/index.html` | 載入 `11-listing-history.js` |
| `frontend/pages/products.html` | 載入 `11-listing-history.js` |
| `frontend/pages/login.html` | 載入 `11-listing-history.js` |
| `frontend/assets/js/app/05-product-view.js` | 商品卡遇到 `DELISTED` 顯示「已下架」 |
| `frontend/assets/js/demo/views/product-card.js` | 推薦卡遇到 `DELISTED` 顯示「已下架」 |
| `frontend/assets/js/demo/ai/service.js` | 指涉到已刪除商品顯示「這筆商品已不存在」；已下架顯示「此商品已下架」 |

- `11-listing-history.js` 的格式函式用延遲取值（`window.HaisenFormat`），不依賴載入順序。
- 抽屜狀態建議：

```js
let listingHistory = { loading: false, error: "", rows: [], tab: "active" };
```

- 動作完成後重新抓 `/api/products/mine`，不自行猜測狀態。
- 刪除或下架後若目前 tab 已無資料，顯示該 tab 的空狀態，不自動切 tab。
- 行動版選單：正式頁目前 `.nav__right` 是 `position:relative`，會把 `navigation.css` 的 mobile `left/right` 選單壓成窄欄；實作時要修正（例如 mobile 時 `.nav__right{position:static}`）。

## 12. 測試

### 12.1 後端

新增 `backend/test/product-lifecycle.test.js`，至少涵蓋：

- 下架 `ACTIVE` 商品：狀態變 `DELISTED`、`available = 0`、公開列表消失、`/mine` 仍看得到。
- 下架 `PARTIALLY_RESERVED` 商品：`PENDING_REVIEW` 保留，買家可確認。
- 下架時 `NEGOTIATING` 自動取消，交易房有系統訊息。
- 下架時草稿訂單移除該商品，`items_total` 重算。
- 重新上架：`delisted_at` 清空、`listed_at` 更新、公開列表回到最前面。
- 重新上架已無未售尾數：409 `PRODUCT_HAS_NO_STOCK`。
- `SOLD_OUT` 直接刪除成功。
- `ACTIVE` 未下架直接刪除：409 `PRODUCT_MUST_BE_DELISTED`。
- 刪除 `DELISTED` 商品：`/mine` 不再有、`GET /api/products/:id` 404、已成交訂單與照片快照仍存在。
- 刪除時 `PENDING_REVIEW` 照走；買家確認後訂單成立。
- 刪除時 `NEGOTIATING` 自動取消。
- 商品已下架／刪除時，買家退回協議直接取消，不進入 `NEGOTIATING`。
- 非擁有者不能下架、重新上架、刪除。
- 未登入回 401。
- 商品 ID 不重用：刪除當日最大流水號商品後，新商品拿到不同 ID。
- 公開列表不含 `SOLD_OUT`／`DELISTED`。
- `/api/products/mine` 只回自己的未刪除商品。

### 12.2 前端

新增 `frontend/test/listing-history.test.js`，至少涵蓋：

- 三個 tabs 的篩選與數量。
- 空狀態文字。
- 上架中列顯示「下架」。
- 已下架列顯示「重新上架」「刪除」；無未售尾數只顯示「刪除」。
- 已售出列顯示「刪除」。
- 狀態徽章與尾數、價格文字。
- 載入失敗顯示重試。
- 動作呼叫對應 API，成功後重新載入並觸發 `haisen:products-changed`。
- 未登入顯示登入引導。

## 13. 文件更新

實作時同步更新：

- `GLOSSARY.md`：新增「上架紀錄」「下架」「重新上架」「刪除商品」；更新「可售尾數」為已下架視為 0；保留「取消上架」的草稿定義。
- `docs/spec/02-domain.md`：改寫 3.3 生命週期，移除「商品沒有下架狀態」。
- `docs/spec/04-data-model.md`：新增 `listed_at`、`delisted_at`、`counters`；說明硬刪與照片保留。
- `docs/spec/05-api.md`：新增 `/api/products/mine`、`delist`、`relist`、`DELETE`；更新 `GET /api/products` 與交易流程阻擋。
- `docs/spec/06-ui.md`：新增上架紀錄抽屜、tabs、按鈕、確認文案、空狀態；更新商品卡對 `SOLD_OUT`／`DELISTED` 的顯示規則。
- `docs/spec/07-roadmap.md`：把「商品是否可下架」從「本版不可」改為已支援。
- `docs/adr/0009-product-delist-and-delete.md`：記錄「下架可逆、刪除不可逆、刪除前必須先下架、硬刪＋隱藏計數器、既有訂單使用快照」的決策與替代方案。
- `backend/README.md`：補上新端點。

## 14. 驗收條件

- [x] 導覽列「我的」與個人資訊抽屜都有「上架紀錄」入口。
- [x] 上架紀錄抽屜有三個 tabs、數量、預設上架中、各自的空狀態。
- [x] 公開列表只顯示 `ACTIVE` 與 `PARTIALLY_RESERVED`。
- [x] `SOLD_OUT` 不出現在今日漁獲與已下架 tab。
- [x] `ACTIVE`／`PARTIALLY_RESERVED` 可下架；下架後公開消失、上架紀錄保留。
- [x] 下架時 `PENDING_REVIEW` 照走、`NEGOTIATING` 取消、`DRAFT` 移除。
- [x] `DELISTED` 有未售尾數可重新上架，`listed_at` 更新並回到公開列表最前面。
- [x] `SOLD_OUT` 可直接刪除。
- [x] `ACTIVE`／`PARTIALLY_RESERVED` 未下架直接刪除會被擋下。
- [x] `DELISTED` 可刪除；刪除後上架紀錄消失，已成交訂單與照片快照仍存在。
- [x] 刪除時 `PENDING_REVIEW` 照走、`NEGOTIATING` 取消、`DRAFT` 移除。
- [x] 商品已下架／刪除時，買家退回協議直接取消。
- [x] 商品 ID 不重用。
- [x] 非擁有者不能操作；未登入回 401。
- [x] 後端與前端測試通過。
- [x] 文件與 ADR 已更新。

## 15. 不在範圍

- 商品編輯（改魚種、尾數、價格、照片等）。
- 逐次上下架的事件稽核紀錄。
- 主動通知買家（只在交易房留系統訊息）。
- 刪除照片檔。
- 已售出商品重新上架。
- 分頁、搜尋、狀態以外的進階篩選。
- 管理員或客服代為下架／刪除。
- 商品詳情頁。
