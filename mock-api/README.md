# Mock API（json-server）

此服務依照 `docs/api/README.md` 提供前端開發用的模擬 API。它以 json-server 的 JSON 檔案儲存資料，並用少量自訂路由模擬登入、會員資料回應格式及漁獲 API。不是正式後端，不能用於正式環境。

## 啟動

在專案根目錄執行：

```bash
npm install
npm run mock-api
```

預設 API 位址為 `http://localhost:3001`。可用 `PORT` 環境變數更換連接埠。專案頁面會在載入 `assets/js/api/client.js` 前，將 API base 設為「目前主機的 HTTP 3001 埠」。若使用其他 API 主機，需調整頁面的設定：

```html
<script>window.HAISEN_API_BASE = "http://localhost:3001";</script>
<script src="../assets/js/api/client.js"></script>
<script src="../assets/js/api/auth.js"></script>
<script src="../assets/js/api/fish.js"></script>
<script src="../assets/js/api/fish-mapper.js"></script>
```

這個設定適用於 HTTP 開發環境，例如用 `python3 -m http.server 8000 --bind 0.0.0.0` 提供網站。若網站本身使用 HTTPS，瀏覽器會阻擋它呼叫 HTTP API（Mixed Content）；需以 HTTPS 反向代理將 `/api` 轉發至 mock API，並將 API base 設成同源位址。`docs/api/README.md` 說明了同源設定方式。

## 模擬資料表

資料存於 [db.json](./db.json)，每個頂層陣列代表一張模擬資料表：

### `users` — 會員與銀行資料

| 欄位 | 用途 |
| --- | --- |
| `id` | 會員主鍵 |
| `username` | 登入電話號碼 |
| `password` | 模擬登入密碼；僅供本機測試 |
| `display_name` | 顯示暱稱 |
| `role` | `BUYER` 或 `SELLER` |
| `is_verified` | 是否已驗證 |
| `completed_orders` | 完成訂單數 |
| `bank_code`, `bank_account`, `bank_account_name` | 模擬銀行資料，更新介面為 `PUT /api/users/profile` |

### `fish_data` — 漁獲上架資料

| 欄位 | 用途 |
| --- | --- |
| `id`, `seller_id` | 漁獲主鍵及賣家會員 ID |
| `fish_type`, `species_id`, `species_latin` | 魚種名稱與識別資訊 |
| `quantity`, `weight`, `tail_weights`, `weight_mode` | 尾數、平均重量、逐尾重量及重量模式 |
| `price_per_taijin`, `price_per_kg` | 元／台斤及元／公斤售價 |
| `region`, `sea`, `location`, `caught_time`, `created_at` | 漁獲地點與捕獲資訊 |
| `status` | 漁獲狀態，例如 `AVAILABLE`、`PENDING_PAYMENT` |
| `process`, `process_note` | 處理方式及說明 |
| `shipping`, `payment`, `deposit_on`, `deposit_amount` | 配送、付款及訂金設定 |
| `images`, `tags` | 圖片路徑及標籤 |
| `seller` | 清單回應用的賣家顯示資料 |
| `buyer_id`, `buyer_name` | 下單時由前端更新的買家資訊 |

登入 Token 僅保存在伺服器記憶體中，不是資料表；重新啟動服務後需重新登入。

## 測試帳號

| 身分 | 電話 | 密碼 |
| --- | --- | --- |
| 賣家 | `0912345678` | `seller123` |
| 買家 | `0987654321` | `buyer123` |

## 支援端點

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 建立會員並回傳登入 Token |
| `POST` | `/api/auth/login`、`/api/auth/signin` | 登入 |
| `GET` | `/api/auth/me` | 取得目前會員；需登入 |
| `PUT` | `/api/users/profile` | 更新銀行資料；需登入 |
| `GET` | `/api/fish/data` | 取得漁獲清單 |
| `POST` | `/api/fish/data` | 新增漁獲；需登入 |
| `PUT` | `/api/fish/data/{id}` | 部分更新漁獲；需登入 |
| `DELETE` | `/api/fish/data/{id}` | 刪除漁獲；需登入 |

錯誤回應採用 `{ "success": false, "message": "錯誤說明" }`。這個 mock server 僅提供前端串接所需的基本驗證與資料持久化，不實作正式的密碼雜湊、角色授權或訂單交易機制。
