# 後端（json-server）

此服務以 json-server 的 JSON 檔案儲存資料，並用自訂路由提供登入、會員、商品、魚種、對話、交易房與上傳 API。訂單目前只會建立草稿，評價尚未提供路由。不是正式後端，不能用於正式環境。

## 啟動

在專案根目錄執行：

```bash
npm install
npm run backend
```

預設位址為 `http://localhost:3001`，可用 `PORT` 環境變數更換連接埠。
前端頁面會將 API base 設為「目前主機的 HTTP 3001 埠」；若使用其他主機，需調整 `frontend/assets/js/config.js`。

網站本身請以 `frontend/` 作為根目錄提供：

```bash
python -m http.server 8000 --directory frontend
```

## 目錄

```text
backend/
  server.js       啟動
  app.js          middleware、靜態目錄、路由掛載
  lib/            auth / store / orders / deals / deal-items / deal-status / conversations / species / http
  routes/         auth / products / species / chat / chat-messages / deals / deal-items / deal-proposal / deal-response / uploads
  test/           node:test 整合測試（使用暫存 db.json）
  db.json         模擬資料
  uploads/        上傳圖片（不進版控）
```

## 模擬資料表

| 資料表 | 用途 |
| --- | --- |
| `users` | 會員、地址、信用評分 |
| `products` | 上架商品（唯一真實來源） |
| `conversations` | 助手房與交易房 |
| `messages` | 對話訊息與卡片 |
| `deals` | 訂單（`DRAFT`、`PENDING_REVIEW`、`NEGOTIATING`、`CONFIRMED`、`CANCELLED`） |
| `reviews` | 雙向評價（尚未提供 API） |

## 支援端點

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 建立會員並回傳登入 Token |
| `POST` | `/api/auth/login`、`/api/auth/signin` | 登入 |
| `GET` | `/api/auth/me` | 取得目前會員；需登入 |
| `PUT` | `/api/users/profile` | 更新暱稱、地址與銀行資料；需登入 |
| `GET` | `/api/products` | 商品清單，支援 `region`、`species`、`seller_id`、`status`、`limit` |
| `GET` | `/api/products/{id}` | 單一商品 |
| `POST` | `/api/products/create` | 上架商品；需登入 |
| `GET` | `/api/species` | 魚種清單（名稱、別名、分類與料理屬性） |
| `GET` | `/api/conversations` | 目前會員的房間清單；需登入 |
| `POST` | `/api/conversations/assistant` | 取得或建立助手房；需登入 |
| `GET` | `/api/conversations/{id}/messages` | 房間訊息（`after_seq` 增量）；需參與者 |
| `POST` | `/api/chat/message` | 送出訊息；需參與者 |
| `PUT` | `/api/conversations/{id}/context` | 更新助手房 context；需參與者 |
| `POST` | `/api/conversations/{id}/read` | 標記已讀；需參與者 |
| `POST` | `/api/conversations/{id}/clear` | 清除助手房舊訊息；需參與者 |
| `POST` | `/api/deals/initiate-channel` | 由商品開啟或沿用交易房與草稿訂單；需登入 |
| `GET` | `/api/deals/{id}` | 訂單明細（項目附可售尾數）；需參與者 |
| `POST` | `/api/deals/items` | 加購同一釣客的商品；需買家 |
| `PATCH` | `/api/deals/items/{itemId}` | 改尾數；需買家 |
| `DELETE` | `/api/deals/items/{itemId}`、`/api/deals/items` | 刪除項目／清空；需買家 |
| `POST` | `/api/deals/propose` | 送出協議；需參與者 |
| `POST` | `/api/deals/respond` | 同意／退回；需非發起方 |
| `POST` | `/api/deals/cancel` | 取消並選原因；需參與者 |
| `POST` | `/api/uploads` | 上傳圖片（base64 data URL）；需登入 |

錯誤回應採用 `{ "success": false, "code": "代碼", "message": "錯誤說明" }`。

登入 Token 僅保存在伺服器記憶體中，重新啟動服務後需重新登入。

## 測試

```bash
npm test
```

以 `node:test` 跑 `backend/test/` 與 `frontend/test/`。後端測試會把 `FISHMATCH_DB` 指到暫存檔，不會動到 `db.json`。

## 測試帳號

| 身分 | 電話 | 密碼 |
| --- | --- | --- |
| 釣客 | `0912345678` | `seller123` |
| 買家 | `0987654321` | `buyer123` |
