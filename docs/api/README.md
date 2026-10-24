# 海人直送 API 規格

本文件整理前端 API 用戶端 `frontend/assets/js/api/` 對後端的呼叫契約，以及 `frontend/assets/js/app/08-api-init.js` 的載入與登入狀態同步流程。後端實際驗證規則與完整回應欄位仍以伺服器實作為準；本文列出的格式以目前前端程式使用的欄位為依據。

## 1. 基本設定

- 預設 API 位址為同源相對路徑，例如 `/api/fish/data`。
- 若要指定 API 主機，請在載入 `frontend/assets/js/api/client.js` 前設定 `window.HAISEN_API_BASE`。
- API 用戶端必須先於 `frontend/assets/js/app/08-api-init.js` 載入。
- 請求使用 JSON 格式；需要登入的端點會在請求標頭附加本機保存的存取憑證。
- 登入 Token 與會員資料分別儲存在 `localStorage` 的 `haisen_token_v1`、`haisen_user_v1`。
- 價格顯示單位為元／台斤；舊資料若只有元／公斤，前端依 `1 台斤 = 0.6 公斤` 換算。

## 2. REST 端點總覽

| 功能 | 方法 | 路徑 | 需要 Token |
| --- | --- | --- | --- |
| 註冊會員 | `POST` | `/api/auth/register` | 否 |
| 登入會員 | `POST` | `/api/auth/login` | 否 |
| 登入別名（後端支援） | `POST` | `/api/auth/signin` | 否 |
| 取得目前會員 | `GET` | `/api/auth/me` | 是 |
| 取得商品清單 | `GET` | `/api/products` | 否 |
| 取得單一商品 | `GET` | `/api/products/{id}` | 否 |
| 上架商品 | `POST` | `/api/products/create` | 是 |
| 上傳商品圖片 | `POST` | `/api/uploads` | 是 |
| 取得漁獲清單（相容層） | `GET` | `/api/fish/data` | 否 |
| 更新漁獲狀態（相容層，僅購物車使用） | `PUT` | `/api/fish/data/{id}` | 是 |
| 更新會員暱稱、地址與銀行資料 | `PUT` | `/api/users/profile` | 是 |

> `products` 是商品的唯一真實來源。`/api/fish/data` 為唯讀相容層，供尚未改寫的商品頁與購物車使用；購物車預計於下一輪移除。

`/api/auth/signin` 是後端登入別名；目前前端 `login()` 實際呼叫 `/api/auth/login`。

## 3. 會員端點

### `POST /api/auth/register` — 註冊

建立會員帳號。前端將電話、密碼、暱稱轉成後端欄位，預設角色為 `BUYER`。

請求本文：

```json
{
  "username": "電話號碼",
  "password": "密碼",
  "display_name": "暱稱",
  "role": "BUYER"
}
```

前端預期回應包含 `success`、`message`、`token`、`user`；成功後儲存 Token（若有）及正規化後的會員資料。程式註記預期成功狀態為 HTTP `201`。

### `POST /api/auth/login` — 登入

使用電話與密碼登入。

請求本文：

```json
{
  "username": "電話號碼",
  "password": "密碼"
}
```

前端預期回應包含 `success`、`message`、`token`、`user`。成功後儲存 Token（若有）及會員資料。

### `GET /api/auth/me` — 取得目前會員

以現有登入憑證取得會員資料，並同步更新本機會員狀態。前端讀取回應的 `data` 欄位。

預期回應形狀：

```json
{
  "success": true,
  "message": "訊息",
  "data": {}
}
```

會員欄位由後端 `User` 對應為前端格式：`display_name` → `nick`、`username` → `phone`、`role`、`is_verified` → `verified`、`completed_orders` → `orders`。

### `PUT /api/users/profile` — 更新會員銀行資料

以現有登入憑證更新會員的銀行資料。前端將傳入的物件原樣作為 JSON 請求本文。

前端使用欄位：

```json
{
  "bank_code": "銀行代碼",
  "bank_account": "銀行帳號",
  "bank_account_name": "戶名"
}
```

伺服器端應依後端規格處理及保護銀行資訊；前端程式註記資料庫欄位為 `users(bank_code, bank_account, bank_account_name)`。

## 4. 商品與相容層端點

### `GET /api/fish/data` — 取得漁獲清單（相容層）

從 `products` 轉出舊格式。前端預期回應的漁獲陣列位於 `data`：

```json
{
  "success": true,
  "message": "訊息",
  "data": []
}
```

呼叫端會將清單資料轉換成網站頁面使用的漁獲物件，並合併到 `frontend/assets/js/app/08-api-init.js` 的 `CATCH` 資料。

### `PUT /api/fish/data/{id}` — 更新漁獲狀態（相容層）

僅供舊購物車結帳使用。送出：

```json
{
  "status": "PENDING_PAYMENT",
  "buyer_id": 會員ID,
  "buyer_name": "收件人姓名"
}
```

後端會把該商品的 `sold_quantity` 設為總尾數，商品即轉為 `SOLD_OUT`。此端點不建立訂單，是購物車移除前的過渡行為。

新增與刪除漁獲已不再提供。上架請改用 `POST /api/products/create`，商品資料一律以 `products` 為唯一來源。

### 商品欄位

| 欄位 | 說明 |
| --- | --- |
| `fish_species` | 魚種名稱 |
| `species_id`, `species_latin` | 魚種識別碼與拉丁學名 |
| `weight_kg` | 整批總重（公斤） |
| `quantity` | 總尾數 |
| `condition` | `活體`、`放血冰鎮`、`三去處理`、`冷凍` |
| `photo_url` | 圖片路徑或 `/uploads/...` |
| `price` | 整批總價（元） |
| `region`, `location` | 縣市與完整地點 |
| `catch_time` | 捕獲時間 |
| `market_reference_price` | 依魚種行情換算的整批參考價 |

`GET /api/products` 會額外回傳 `available`（可售尾數）、`reserved_quantity`（洽談中保留尾數）、`unit_price`（單尾均價）、`avg_weight_kg`（單尾平均重量）與 `status`。

## 5. 前端公開函式（`window.HaisenAPI`）

| 函式 | 用途 |
| --- | --- |
| `getToken()` | 讀取本機登入 Token；沒有或無法讀取時回傳空字串。 |
| `getUser()` | 讀取本機會員資料；沒有或資料無法解析時回傳 `null`。 |
| `setUser(user)` | 將會員資料存入本機；傳入空值時移除該會員資料。 |
| `register({ phone, password, nick, role })` | 呼叫註冊端點，轉換欄位、保存登入狀態並回傳前端會員資料。 |
| `login({ phone, password })` | 呼叫登入端點，保存登入狀態並回傳前端會員資料。 |
| `me()` | 以 Token 取得會員資料、更新本機狀態並回傳會員資料；回應沒有 `data` 時回傳 `null`。 |
| `logout()` | 清除本機 Token 與會員資料；不呼叫伺服器登出端點。 |
| `updateProfile(bank)` | 呼叫更新銀行資料端點並回傳伺服器回應。 |
| `listFish()` | 取得漁獲清單，回傳回應中的 `data` 陣列；若沒有 `data` 則回傳空陣列。 |
| `createFish(listing)` | 建立漁獲並回傳伺服器回應。 |
| `updateFish(id, patch)` | 更新指定漁獲並回傳伺服器回應。 |
| `deleteFish(id)` | 刪除指定漁獲並回傳伺服器回應。 |
| `rowToCatch(row, speciesList)` | 將單筆後端漁獲轉為頁面使用的 `{ key, entry }` 格式。 |
| `rowsToCatch(rows, speciesList)` | 批次轉換漁獲，回傳可合併到 `CATCH` 的物件。 |
| `matchSpeciesId(fishType, speciesList)` | 以魚種名稱比對魚種清單，回傳對應 ID；無法比對時回傳 `null`。 |

### 漁獲資料轉換說明

- 新格式有 `price_per_taijin` 時，價格及 `weight` 依台斤處理；舊格式則以 `price_per_kg` 與公斤重量換算。
- 有 `tail_weights` 時以各尾重量建立 `tails`；否則依 `quantity` 與平均重量補出各尾資料。
- 漁獲鍵值優先採用 `species_id`，沒有時採用 `f{id}`。
- 漁獲狀態為 `AVAILABLE` 時，`remaining` 設為數量；其他狀態設為 `0`。
- 圖片、運送方式、付款方式及標籤若無有效陣列，會使用用戶端預設值。

## 6. `frontend/assets/js/app/08-api-init.js` API 整合函式

### `loadCatchFromApi()`

頁面初始化時呼叫 `HaisenAPI.listFish()` 取得漁獲，再透過 `rowsToCatch()` 轉換並合併至 `CATCH`。既有漁獲鍵會被後端資料覆蓋，新鍵會加入 `CATCH_ORDER` 前方。API 模組未載入或請求失敗時保留頁面內的示意漁獲；完成時會派送 `haisen:catch-ready` 事件。

### `syncSessionFromApi()`

頁面初始化時檢查 API 模組和本機 Token；有 Token 才呼叫 `HaisenAPI.me()`，成功後更新導覽列登入狀態。若取得會員資料失敗，會登出（清除本機 Token 與會員資料）並以未登入狀態重新繪製導覽列。

## 7. 錯誤處理

- 網路連線失敗時，用戶端會拋出「無法連線到伺服器，請確認後端已啟動」錯誤，並將 `status` 設為 `0`。
- HTTP 回應非成功，或 JSON 回應包含 `success: false` 時，用戶端會拋出錯誤；訊息依序取回應的 `message`、`error`，否則使用 `HTTP <狀態碼>`。
- `loadCatchFromApi()` 會記錄載入錯誤並保留示意資料；`syncSessionFromApi()` 遇到錯誤會清除本機登入狀態。
