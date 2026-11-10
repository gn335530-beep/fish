# 後端（json-server）

此服務以 json-server 的 JSON 檔案儲存資料，並用自訂路由提供登入、會員、商品、官方魚種代碼字典、對話、交易房、評價、行情與上傳 API。不是正式後端，不能用於正式環境。

## 啟動

在專案根目錄執行：

```bash
npm install
npm run backend
```

預設位址為 `http://localhost:3001`，可用 `PORT` 環境變數更換連接埠。
前端頁面會將 API base 設為「目前主機的 HTTP 3001 埠」；若使用其他主機，需調整 `frontend/assets/js/config.js`。

執行時資料庫預設為 `backend/db.json`（不進版控）；第一次啟動時會從 `backend/db.seed.json` 複製建立，之後保留開發資料。**`db.json` 是執行時資料，修改種子後必須刪除 `backend/db.json` 再重新啟動**，否則會沿用舊的會員、訂單、評價與商品。可用 `FISHMATCH_DB` 指定其他路徑。

行情按需抓取（查詢 API 每次重抓，CLI 使用快取）可手動執行：

```bash
npm run market:fetch -- 2201
npm run market:fetch -- 土魠魚 --date 2026-10-22
npm run market:fetch -- --status
```

網站本身請以 `frontend/` 作為根目錄提供：

```bash
python -m http.server 8000 --directory frontend
```

## 目錄

```text
backend/
  server.js       啟動
  app.js          middleware、靜態目錄、路由掛載
  lib/            auth / store / db-file / messages / units / product-stock / product-pricing / timeouts / cards / quantities / deals / deal-items / deal-cancel / deal-transitions / deal-statuses / reviews / conversations / regions / market/ / http
  routes/         auth / users / products / chat / chat-messages / conversation-delete / deals / deal-items / deal-proposal / deal-response / reviews / market / market-catalog / uploads
  scripts/        market-fetch.js（行情 CLI）
  test/           node:test 整合測試（使用暫存資料庫）
  db.seed.json    可提交的種子資料
  seed-assets/    種子示範頭像（掛在 /uploads 下，不進執行時上傳目錄）
  db.json         執行時資料（不進版控，首次啟動從種子建立）
  uploads/        上傳圖片（不進版控）
```

## 模擬資料表

| 資料表 | 用途 |
| --- | --- |
| `users` | 會員、頭像、地址、信用評分 |
| `products` | 上架商品（唯一真實來源） |
| `conversations` | 助手房與交易房 |
| `messages` | 對話訊息與卡片 |
| `deals` | 訂單（`DRAFT`、`PENDING_REVIEW`、`CONFIRMED`、`CANCELLED`；`NEGOTIATING` 只保留舊資料） |
| `reviews` | 成交後的雙向評價；依 `reviewer_role` 分買家給的／釣客給的 |
| `market_prices` | 按需抓取的批發行情（平均價、交易量、養殖旗標）；以 `species_code` 為鍵 |
| `market_species_catalog` | 執行時同步的官方新鮮代碼字典 |
| `market_catalog_state` | 官方代碼字典的同步狀態與 24 小時快取 |
| `market_locations` | 21 個批發市場簡稱 → 縣市 |
| `market_fetch_state` | 每個官方代碼的抓取狀態與快取時間 |

## 支援端點

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 建立會員並回傳登入 Token |
| `POST` | `/api/auth/login`、`/api/auth/signin` | 登入 |
| `GET` | `/api/auth/me` | 取得目前會員；需登入 |
| `GET` | `/api/users/{id}` | 公開個人資訊與角色評分；不回電話、地址 |
| `PUT` | `/api/users/profile` | 更新暱稱、電話、頭像、地址與銀行資料；需登入；電話需唯一 |
| `POST` | `/api/users/seller-consent` | 記錄第一次販賣確認，重複呼叫不覆寫時間；需登入 |
| `GET` | `/api/products` | 商品清單，只回傳可購買的上架中／洽談中商品；支援 `region`、`species`、`seller_id`、`status`、`limit` |
| `GET` | `/api/products/mine` | 目前登入釣客所有未刪除商品（含已下架與已售出），依 `listed_at` 由新到舊；需登入 |
| `GET` | `/api/products/{id}` | 單一商品（含已下架與已售出） |
| `POST` | `/api/products/{id}/delist` | 下架自己的商品；需登入 |
| `POST` | `/api/products/{id}/relist` | 重新上架自己的已下架商品；需登入 |
| `DELETE` | `/api/products/{id}` | 刪除已下架或已售出商品；需登入 |
| `POST` | `/api/products/create` | 上架商品；整批售價必填、每台斤與重量選填；可帶可選 `species_code`；需登入 |
| `GET` | `/api/conversations` | 目前會員的房間清單；需登入 |
| `POST` | `/api/conversations/assistant` | 每次建立一間新的助手房；需登入 |
| `DELETE` | `/api/conversations/{id}` | 刪除助手房或可刪的交易房；需參與者 |
| `GET` | `/api/conversations/{id}/messages` | 房間訊息（`after_seq` 增量）；需參與者 |
| `POST` | `/api/chat/message` | 送出訊息；需參與者 |
| `PUT` | `/api/conversations/{id}/context` | 更新助手房 context；需參與者 |
| `POST` | `/api/conversations/{id}/read` | 標記已讀；需參與者 |
| `POST` | `/api/conversations/{id}/clear` | 清除助手房舊訊息；需參與者 |
| `POST` | `/api/deals/initiate-channel` | 由商品開啟或沿用交易房與草稿訂單；需登入 |
| `POST` | `/api/deals/initiate-room` | ⬜ 由個人資訊開啟或沿用交易房；無商品時純聊天；需登入 |
| `GET` | `/api/deals/{id}` | 訂單明細（項目附可售尾數與角色評分 peer）；需參與者 |
| `POST` | `/api/deals/items` | 加購同一釣客的商品；需買家 |
| `POST` | `/api/deals/items/batch` | 批次加購多個商品；需買家 |
| `PATCH` | `/api/deals/items/{itemId}` | 改尾數；需買家 |
| `DELETE` | `/api/deals/items/{itemId}`、`/api/deals/items` | 刪除項目／清空（舊介面）；需買家 |
| `POST` | `/api/deals/propose` | 送出協議；需參與者 |
| `POST` | `/api/deals/respond` | 確認協議；退回為 legacy；需非發起方 |
| `POST` | `/api/deals/cancel` | 取消並帶自由文字 `note`；需參與者 |
| `POST` | `/api/deals/reinitiate` | 取消後重新發起協議；需買家 |
| `GET` | `/api/deals` | 目前使用者的交易紀錄 |
| `POST` | `/api/reviews/submit` | 成交後評價對方；需參與者 |
| `GET` | `/api/reviews?user_id=&role=&sort=&rating=&offset=&limit=` | 公開角色別評價、摘要、分布與商品照片（角色／分頁 ⬜） |
| `GET` | `/api/market/codes` | 公開官方代碼字典；`q` 可查名稱、別名或代碼 |
| `GET` | `/api/market/quote` | 公開整合行情；一次完成名稱→代碼→價格 |
| `GET` | `/api/market/prices` | 公開行情；每次請求重抓上游，支援 `code`、`region`、`date`、`include=history`、`days` |
| `GET` | `/api/market/markets` | 公開市場對照 |
| `POST` | `/api/uploads` | 上傳圖片（base64 data URL；商品照片與頭像共用）；需登入 |

錯誤回應採用 `{ "success": false, "code": "代碼", "message": "錯誤說明" }`。

登入 Token 僅保存在伺服器記憶體中，重新啟動服務後需重新登入。

## 測試

```bash
npm test
```

以 `node:test` 跑 `backend/test/` 與 `frontend/test/`。後端測試會把 `FISHMATCH_DB` 指到各自的暫存檔，不會讀寫 `db.json`。

## 測試帳號

| 身分 | 電話 | 密碼 |
| --- | --- | --- |
| 釣客 | `0912345678` | `seller123` |
| 買家 | `0987654321` | `buyer123` |
