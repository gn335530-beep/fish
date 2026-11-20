# 後端（json-server）

此服務以 json-server 的 JSON 檔案儲存資料，並用自訂路由提供登入、會員、商品、官方魚種代碼字典、對話、助手 AI 回覆（beta）、交易房、評價、行情與上傳 API。不是正式後端，不能用於正式環境。

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

## AI 助手（Beta）

助手房可選擇接上 Google AI Studio（Gemini Developer API）產生文字回覆。**預設關閉**；關閉或缺少金鑰時，助手完全走原本的規則引擎，不需要網路。

`npm run backend` 會自動載入 `backend/.env`；已存在的環境變數優先，因此 E2E 與測試不會被本機金鑰影響。

| 環境變數 | 預設 | 說明 |
| --- | --- | --- |
| `LLM_ENABLED` | `false` | `true`／`1` 才呼叫模型 |
| `GEMINI_API_KEY` | 空 | 啟用時必填；缺少時回 `LLM_NOT_CONFIGURED` |
| `LLM_MODEL` | `gemini-3.5-flash-lite` | 可換模型，不需改程式 |
| `LLM_TIMEOUT_MS` | `8000` | 一次回覆的總期限（含模型、工具與行情上游） |
| `LLM_WEB_SEARCH` | `false` | `true` 且設定 Tavily 金鑰才提供網路搜尋工具 |
| `TAVILY_API_KEY` | 空 | Tavily 金鑰；缺少時不提供 `web_search` |
| `LLM_SEARCH_TIMEOUT_MS` | `15000` | 該回合執行 `web_search` 後延長的總期限 |

在地天氣與海況使用 Open-Meteo Weather／Marine API，不需要金鑰；天氣與海況上游也受同一個回覆期限約束。地區暫存縣市只存在記憶體，重啟後遺失。

- `POST /api/ai/reply` 只接受助手房與該房參與者；不寫入訊息、不修改 `context`。歷史以 `message_id` 為錨點，含它在內的最近 10 則；較新的訊息不會進入模型。
- 後端只送最近對話與白名單 context；手機、市話（含 `+886` 國際碼、括號或分隔區碼、4 碼區碼）、Email、身分證與具行政區錨點的地址會先換成 `[已遮蔽]`，一般文字中的「路」「弄」「市區」不觸發遮蔽，不送頭像或個人檔案。地區問題只把縣市放進 prompt 與 Open-Meteo 查詢，不送區或地址。
- 模型失敗、格式錯誤或平台數字無依據時，端點回 HTTP 200 + `handled:false`；前端安靜回到規則引擎。
- 配額或 429 回 `retryable:true`；前端先跑規則，平台意圖能處理就照常完成，規則無法處理才顯示提示與重試。重試沿用同一個 `message_id`，不重寫使用者訊息，較新的訊息也不會進入該次歷史；不自動重試、不排隊、不快取搜尋結果。
- 平台意圖（賣魚、找魚、行情、取消、修改）只回 slots；AI 文字用於 `CHAT`／`WEB`，`PRODUCT_RECOMMEND` 另附商品卡。
- 唯讀工具：`get_market_price`（官方行情）、`search_products`（公開商品，最多 5 筆）、`get_local_conditions`（台灣縣市天氣或海域海況）、`web_search`（Tavily basic search）。每輪最多 2 次；模型不能寫入商品、訂單或評價。
- 第一輪依問題類型強制工具：在地天氣／海況 → `get_local_conditions`；國外地點天氣、時效性／新聞 → `web_search`；商品推薦／找魚 → `search_products`；平台意圖與一般知識不強制。工具結果回來後恢復自動輸出 JSON。
- 地區相關問題預設使用設定頁縣市，訊息中的明確縣市優先；非地區問題不送縣市。沒有有效縣市時直接問「你所在的縣市是哪裡？」，回答只暫存在該助手房 30 分鐘，不寫回個人設定，刪除對話時清除。海況優先使用明確海域，否則縣市主要海域；內陸縣市會問「你想問哪個海域？」。
- 天氣只回天氣，海況回浪況與海域天氣；數字只來自當輪 Open-Meteo 結果。上游逾時、無資料或格式錯誤時只說明缺少什麼，不產生數字。AI 文字氣泡保留換行。
- `search_products` 回空陣列時，後端把 `PRODUCT_RECOMMEND` 轉成 `CHAT`，只回目前沒有符合條件的商品，不產生商品卡。商品筆數 `N` 的依據是工具回傳的 `count`。
- `tool_results` 只由後端工具產生：`market` 是給行情卡的完整官方資料（含歷史），模型看到的行情結果只含平均價、交易日期與識別欄位；`products` 是公開商品；模型自行提供的內容一律忽略。
- `WEB` 的 `sources` 由 Tavily 結果產生，最多 3 個合法 URL；模型自稱 `CHAT` 但成功使用 `web_search` 時會升級為 `WEB`，`CHAT` 與平台答案永遠不帶來源。`LLM_WEB_SEARCH` 關閉時模型不提供此工具。
- log 只記 request id、使用者 id、intent、token 數、耗時、工具名稱／耗時／錯誤碼，不記訊息或工具結果。
- 目前是 **soft launch beta**：不強制邀請名單、不承諾 SLA；Gemini 免費層內容可能被 Google 用於改善產品，Tavily 也會收到該次查詢，免費層每月 1,000 credits 是硬限制。取捨與遷移路徑見 `docs/adr/0011-hybrid-llm-assistant.md`。

## 目錄

```text
backend/
  server.js       啟動
  app.js          middleware、靜態目錄、路由掛載
  lib/            auth / store / db-file / messages / units / product-stock / product-pricing / timeouts / cards / quantities / deals / deal-items / deal-cancel / deal-transitions / deal-statuses / profile-room / reviews / conversations / regions / conditions/ (Open-Meteo 與地點對照) / ai/ (含 tools/) / market/ / http
  routes/         auth / users / products / chat / chat-messages / ai / conversation-delete / deals / deal-items / deal-proposal / deal-response / reviews / market / market-catalog / uploads
  scripts/        market-fetch.js（行情 CLI）
  test/           node:test 整合測試（使用暫存資料庫）
  db.seed.json    可提交的種子資料
  seed-assets/    種子示範圖片（頭像、商品與訂單照片；進版控，掛在 /uploads 下）
  db.json         執行時資料（不進版控，首次啟動從種子建立）
  uploads/        使用者上傳圖片（不進版控）
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
| `POST` | `/api/products/create` | 上架商品；整批售價必填、每台斤與重量選填；可帶可選 `species_code` 與 `client_request_id`；同釣客同識別碼重送回同一商品；需登入 |
| `GET` | `/api/conversations` | 目前會員的房間清單；需登入 |
| `POST` | `/api/conversations/assistant` | 每次建立一間新的助手房；需登入 |
| `DELETE` | `/api/conversations/{id}` | 刪除任何房間；交易房保留已成交訂單與評價；需參與者 |
| `GET` | `/api/conversations/{id}/messages` | 房間訊息（`after_seq` 增量）；需參與者 |
| `POST` | `/api/chat/message` | 送出訊息；需參與者 |
| `POST` | `/api/ai/reply` | 助手房 AI 回覆（beta）；驗證房間與訊息，失敗回 200 + `handled:false`；需參與者 |
| `PUT` | `/api/conversations/{id}/context` | 更新助手房 context；需參與者 |
| `POST` | `/api/conversations/{id}/read` | 標記已讀；需參與者 |
| `POST` | `/api/conversations/{id}/clear` | 清除助手房舊訊息；需參與者 |
| `POST` | `/api/deals/initiate-channel` | 由商品開啟或沿用交易房與草稿訂單；需登入 |
| `POST` | `/api/deals/initiate-room` | 由個人資訊開啟或沿用交易房；無商品時純聊天；需登入 |
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
| `GET` | `/api/reviews?user_id=&role=&sort=&rating=&offset=&limit=` | 公開角色別評價、摘要、分布與商品照片；支援最新／最高／最低與星等篩選 |
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
