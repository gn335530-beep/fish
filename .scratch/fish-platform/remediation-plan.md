# 程式碼審查修復計畫

- 審查固定點：`origin/master`（38e20ec）→ `HEAD`（d2548a5），21 個 commit、281 個檔案
- 審查軸線：標準（後端／前端）、規格（票 01–34）
- 本檔只列計畫，**尚未修改任何程式碼**
- 既有但非本次引入的問題不列入：`今日漁獲`、`買家或賣家`（`origin/master` 已存在，隨搬移出現）

## 決議（2026-10-27）

1. **票 10 的重量與價格判定**：不採固定門檻，改為**依上下文消去，判不出來才問**：
   - 明確標記優先：`3公斤`、`5 kg`、`2台斤`（×0.6）、`2尾`、`9000元`、`整批 9000`、`價格 9000`、`每台斤 300`。
   - 只剩一個數字欄位缺（重量或數量）→ 裸數字直接補該欄位。
   - 重量與數量同時缺 → 有單位的一方定錨，另一個裸數字以消去法補位；消去法只套用到**三位數以內（≤ 999）**。
   - 裸數字無線索 → 問「X 是指重量（公斤），還是數量（尾）？」，**不問價格**。
   - 四位數以上且無標記（且不是正在問的那個欄位）→ 不自動補任何欄位，留到行情卡後的價格步驟，或使用者明確寫「價格 9000」。
   - 價格只在行情卡後的價格步驟、編輯價格，或上述明確標記時寫入；**裸數字永不寫入價格**。
   - 無單位小數維持現行行為（視為公斤），不在本次調整範圍。
2. **`users.role`（BUYER/SELLER）**：採 **完整移除**（欄位定義、寫入、輸出、種子資料與文件一併移除）。此決定同時涵蓋 R10 的 `completed_orders` 死欄位。
3. **單位維持現行規格，不改**：重量顯示與 API 為公斤、輸入可用台斤換算（×0.6）、單價元／台斤、總價元。不進行「使用者面重量改台斤」的重構。
4. 以上都不影響交易中的 buyer／seller 身分（`deals.js:26`、`reviews.js:60`），該部分維持不動。

## 批次 1：規格 — 行為錯誤（優先）

### S1 協議／評價卡對非操作方不刷新（票 17、18、19）

- 現象：對方同意／拒絕／逾時後，提案方仍看到「等待確認」，重開房間才更新。
- 證據：`backend/lib/orders.js:64-74`、`backend/lib/reviews.js:53-66` 就地改卡片；`frontend/assets/js/demo/poll.js:17-28` 只追加 `lastSeq` 之後的訊息；`poll.js:50-53` 與 `backend/lib/conversations.js:29-33` 在訂單離開進行中狀態後就不再取訂單。
- 建議修法（擇一）：
  - A（推薦）：`conversations.summary` 增加 `last_order`（不限狀態的最新訂單摘要），`poll.js` 依 `last_order.id/status` 變化重取 `GET /api/deals/:id`。
  - B：`poll.js` 只要 `state.deal` 存在，就定期重取 `GET /api/deals/:id`，不依賴 `fresh.order`。
- 驗收：兩個瀏覽器分飾買賣方，一方同意／拒絕／等逾時，另一方 3 秒內看到卡片與摘要更新；`docs/api/README.md`、`docs/spec/03-flows.md` 同步。

### S2 已成交／已取消的卡片仍顯示取消控制項（票 17）

- 證據：`frontend/assets/js/demo/views/deal-cards.js:28` 只用 `isLiveCard` 判斷；`frontend/assets/js/demo/deal-state.js:3-8` 把 `CONFIRMED`／`CANCELLED` 映成 live。
- 修法：在 `deal-state.js` 另加 `isActionable(deal)`（僅 `PENDING_REVIEW`／`NEGOTIATING`），`dealCardActions` 改用它；卡片本體照常顯示狀態。
- 驗收：成交與已取消卡只看得到狀態，沒有原因選單與「取消協議」；不再出現 409。

### S3 `date=` 在冷快取不回補最近交易日（票 23 第 4 點）

- 證據：`backend/lib/market/fetch.js:105-112` 只抓指定日；`backend/lib/market/query.js:81-84` 只查既有快取。
- 修法：`ensureDate` 在「該日無資料」時改抓一段回溯區間（例如 `addDays(date, -7)`～`date`），查詢仍取 `<= date` 的最近一筆；注意 `hasPricesForDate` 與 `inFlight` 去重不可繞過。
- 驗收：冷資料庫查星期日回上一個交易日並帶實際 `trade_date`；新增測試（不可先塞舊資料）；CLI `--date` 同樣生效。

## 批次 2：規格 — 對話流程與計價

### S4 票 28：缺尾數、後續仍一次問全部

- 證據：`frontend/assets/js/demo/ai/prompts.js:36` 的 `DETAIL_ORDER` 沒有 `quantity`；`frontend/assets/js/demo/ai/listing.js:51-53` 後續缺口仍呼叫 `batchFollowupPrompt`。
- 修法：`DETAIL_ORDER` 補 `quantity`（首次批次提示會列出重量、尾數、處理方式、照片）；`advance()` 改用「單一缺口」提示，僅在第一次（魚種剛確定）使用批次提示。若需要狀態，於 context 加 `detail_asked` 之類旗標，並在 `normalize()` 保留。
- 驗收：說「我要賣花枝」→ 一次列出四項；只回部分後 → 一次只問一項。

### S5 票 33：「取消上架」在編輯模式被吞掉

- 證據：`frontend/assets/js/demo/ai/service.js:105` 先跑 `editText`；`frontend/assets/js/demo/ai/editing.js:101-106` 把所有 CANCEL 詞都當成「取消欄位修改」。
- 修法：`editText` 先判斷是否為「取消上架」語意（例如「取消上架／取消販售／不賣了」），是則回傳 `null` 讓流程落到 `continueListing` → `requestCancel`（`listing.js:105-108`）；其餘 CANCEL 詞維持取消本次修改。
- 驗收：編輯重量時說「取消上架」→ 出現確認卡與刪房流程；說「取消」→ 只取消本次修改。

### S6 票 10：重量與價格改為上下文判定（取消固定門檻）

- 證據：`frontend/assets/js/demo/ai/slots.js:64-72` 目前把「有尾數時 ≤ 20 的整數」當重量；`:82` 的 `priceMatch` 單位選填，任何 2–6 位數字都可能變成價格，且不受「價格最後才問」約束。後果：`石斑 25 2尾` 變成價格 25，價格提問被跳過。
- 修法：
  - `slots.js`：
    - 明確金額 pattern：`數字 + 元/塊`、`整批/總價/價格/售價 + 數字`、`每台斤/一台斤 + 數字`（`price_per_taijin` 既有 pattern 維持）。
    - 裸數字只在 `assumeSlot === "price"` 時寫入價格。
    - 抽出 `resolveNumbers()`：先套明確標記；只剩一個數字欄位缺時直接補；重量與數量同時缺時，用有單位的一方定錨、另一方消去（限三位數以內）；其餘放進 `details.ambiguous`（可能多個）。
    - `extractSlots(text, assumeSlot, details)`：第三參數選填，不改回傳形狀；既有呼叫端與測試不受影響。
    - `slots.js:56-62` 的無單位小數維持視為公斤。
  - `listing.js`：`startListing` / `continueListing` 收到 `ambiguous` 時設定 `context.pending_number`，回覆「X 是指重量（公斤），還是數量（尾）？」；`continueListing` 開頭處理確認（是 → 補重量或數量後接 `advance()`；不是 → 清除後照常補欄位）。
  - `docs/spec/03-flows.md:59` 改寫為上述判定順序；票 10 的 `## Comments` 追加本次決議。票 28 的「一次問重量、處理方式與照片」與尾數追問不動。
- 測試（`frontend/test/price.test.js`、`listing-batch.test.js` 或新檔）：
  - `25 2尾` → 重量 25、數量 2、價格未填。
  - `3公斤 2` → 重量 3、數量 2。
  - `250 2尾` → 重量 250、數量 2。
  - `25` → 回問句、`pending_number = 25`，不寫入任何欄位。
  - `2尾 9000` → 9000 不寫入任何欄位。
  - `9000`（價格步驟）→ 價格 9000；`價格 9000`（任何時候）→ 價格 9000。
  - `2台斤` → 1.2 kg；`4.5` → 4.5 kg（小數維持）。
  - `每台斤 200，整批 1000`（`price.test.js:77`）維持通過。
- 驗收：裸數字不再變成價格；價格提問不會被誤跳過；判不出來時只問重量／數量。

### S7 票 26：處理方式只留白名單詞

- 證據：`frontend/assets/js/demo/ai/slots.js:52-53` → `conditions.js:3-8,17-19` 回傳第一個白名單詞。
- 修法：`extractCondition` 回傳使用者原句片段（去頭尾語助詞），白名單只作為分類／顯示提示，不用來截斷字串。
- 驗收：「3公斤 2尾 放血後冰鎮」→ `condition` 為「放血後冰鎮」。

### S8 票 27：整批價被四捨五入、自動價用進位後的重量

- 證據：`backend/routes/products.js:66` 對使用者輸入的 `price` 做 `Math.round`；`:149` 傳入 `round1(weightKg)` 給 `readPricing`。
- 修法：使用者明確給的 `price` 原樣保留；自動計算改用原始 `weight_kg`，只在顯示層四捨五入。
- 驗收：`price: 999.5` 存回 999.5；自動價以未進位重量計算；補測試。

## 批次 3：標準 — 明確違規與文件同步

### D1 完整移除 `users.role`（會員類型）

- 證據：`backend/routes/auth.js:17`、`backend/db.json:8,28,48,68`、`frontend/assets/js/api/client.js:62,70`、`api/auth.js:18`、`pages/login.js:127`；GLOSSARY.md:7-9 明確列 `_Avoid_: 會員類型`。
- 現況查證（支持直接移除）：
  - 前端沒有任何地方讀 `user.role`，只有兩處把它寫死成 `"BUYER"` 送出。
  - 註冊表單沒有角色選項（`pages/login.js:113-131`），正常流程不可能產生 `SELLER`，`SELLER` 只會來自舊種子資料。
  - `deals.js:26`、`reviews.js:60` 的 buyer／seller 是交易中的身分，與 `users.role` 無關，**不要動**。
- **階段 1（程式與文件，一個 PR）**
  1. `backend/routes/auth.js:17`：`newUser()` 不再寫入 `role`。
  2. `backend/lib/auth.js:10`：`publicUser()` 明確 `delete safe.role`，讓舊資料也不再外洩（不必等資料清理）。
  3. `frontend/assets/js/api/client.js:70`、`api/auth.js:18`：停止送出 `role`；同步 `client.js:62`、`auth.js:8`、`pages/login.js:127` 的註解。
  4. `backend/test/users-bootstrap.test.js:16`：fixture 移除 `role`；已確認沒有其他測試斷言回應含 `role`。
  5. 文件同步：`docs/spec/01-overview.md:20`（表格列）、`02-domain.md:24`（角色規則）、`04-data-model.md:43`（欄位表）、`05-api.md:95,98`（範例與契約）、`docs/api/README.md:81`（register 簽名）。移除後這些段落不能再提「`role` 是顯示標籤」。
  6. 決策記錄：`docs/spec/02-domain.md:24` 要求角色相關決策留 ADR，新增 `docs/adr/0005-remove-user-role.md`，記錄「使用者是單一帳號型態，買方／釣客由交易推導」。
- **階段 2（資料清理，等 `db.json` 未提交變更處理完再做）**
  - 移除 `backend/db.json` 種子 `users` 的 `role` 欄位，重跑 seed／bootstrap 確認新使用者不再產生該欄位。
  - 目前工作區的 `backend/db.json` 有未提交變更，**先不要動**，避免覆蓋使用者本機資料。
- 相容性：`register` 會默默忽略傳入的 `role`（現行本來就不驗證未知欄位，不會回 400）；本機 localStorage 舊 `user` 物件多一個 `role` 欄位無害，登入後會被覆寫。
- 驗收：`GET /api/auth/me`、login、register 回應都不含 `role`（舊種子使用者亦同）；`grep -rn "role" backend frontend` 只剩交易／評價身分與 ARIA `role`；`npm test` 全綠；文件不再把 `role` 描述成顯示標籤。

### D2 詞彙對齊

- `frontend/assets/js/demo/rooms.js:87`「確定刪除聊天室？」、`demo/views/inbox.js:20`「刪除聊天室」→ 依 `room.type` 顯示「助手房」或「交易房」。
- `frontend/assets/js/demo/views/cards.js:67`「商品草稿」→「上架草稿」。
- `backend/routes/market.js:1,14`、`backend/test/market-mappings.test.js:13`「魚種代碼」→「主要新鮮代碼」。
- 驗收：`grep -rn "聊天室\|商品草稿\|魚種代碼" frontend backend` 無使用者可見字串。

### D3 縣市「臺／台」不一致

- 證據：`backend/db.json:31` `臺北市`；`frontend/assets/js/pages/login.js:76` 直接渲染 API 值；同頁 `frontend/pages/login.html:86` 用台北市。
- 修法：顯示層套 `normalizeCityName`（`frontend/assets/js/app/04-regions.js:14`）。**不要直接改 `db.json`**，工作區已有未提交的資料變更，避免覆蓋。
- 驗收：登入彈窗顯示台北市；`npm test` 不受影響。

### D4 `backend/README.md` 端點表過期

- 證據：`backend/README.md:60-93`、`:38` 缺 `POST /api/users/seller-consent`（`routes/auth.js:123`）與 `DELETE /api/conversations/:id`（`routes/conversation-delete.js:14`）；`:73` 把 `POST /api/conversations/assistant` 寫成「取得或建立」，實際每次建新房間（`routes/chat.js:24`）。
- 修法：補兩列、修正敘述，與 `docs/api/README.md` 對齊。
- 驗收：`backend/README.md` 的端點表同時含 `POST /api/users/seller-consent` 與 `DELETE /api/conversations/:id`；`:73` 敘述改為「每次建立新的助手房」，與 `docs/api/README.md:28` 一致；`npm test` 全綠。

### D5 ADR-0003 對話文案

- 證據：`frontend/assets/js/demo/ai/market.js:24,28,32`、`ai/listing-market.js:58-60` 未用「暫無行情」。
- 修法：查無資料一律「暫無行情」，含無法取得時的措辭；卡片版已符合（`demo/views/market.js:18`）。
- 驗收：`grep -rn "沒有今天的\|暫時無法取得" frontend/assets/js/demo/ai` 無結果；查無資料／上游失敗的對話回覆都含「暫無行情」；`frontend/test/market-chat.test.js`、`listing-market.test.js` 更新後通過。

### D6 `demo/api.js` 歸位

- 證據：`frontend/assets/js/demo/api.js:54,59,63,68` 的 products／market 請求與 `frontend/assets/js/api/products.js` 重複；README 規定 `assets/js/api/` 負責 API 請求。
- 修法：搬到 `api/products.js`、新增 `api/market.js`，`demo/api.js` 只保留對話專用呼叫或改為 re-export；同步更新 import。
- 驗收：`demo/api.js` 不再有 products／market 的實作（只剩 re-export 或對話專用函式）；`grep -rn "listProducts\|getProduct\|createProduct\|getMarketPrice" frontend/assets/js` 的呼叫端都指向 `assets/js/api/`；`npm test` 全綠。

### D7 票 02 殘留死 CSS

- 證據：`frontend/assets/css/features.css:50-67` 的 `.chat-trigger`、`.seller-card`（含 `__av`）全站無引用。
- 修法：刪除；必要時把仍使用的樣式搬回對應 CSS。
- 驗收：`grep -rn "chat-trigger\|seller-card" frontend` 無結果；首頁、商品列表、登入頁的人工檢查外觀不變；`npm test` 全綠。

## 批次 4：重構 — 氣味（可延後，需獨立 PR）

### R1 訂單狀態常數單一來源

- 後端：`lib/orders.js:5`、`lib/deals.js:9`、`lib/conversations.js:9`、`routes/deal-response.js:11` 四份清單，收斂到 `lib/deal-status.js`。
- 前端：`app/10-trade-history.js:3`、`demo/views/deal-cards.js:8`、`demo/views/deal-terms.js:7` 三份文案分歧，收斂到單一 map。
- 驗收：`ACTIVE_STATUS`／`CANCELLABLE` 這類清單只保留一份定義，其餘檔案以 import 使用、不再各自宣告；前端狀態文案只剩一份 map；`deal-*.test.js` 全數通過。

### R2 加購流程重複

- `routes/deals.js:79-104` 與 `routes/deal-items.js:43-56` 的庫存守門、錯誤 payload、系統訊息抽成共用函式；尾數驗證（4 處）一併收斂。
- 驗收：`尾數必須大於等於 1` 只出現一處；`INSUFFICIENT_QUANTITY` 只在共用函式產生；`deals.test.js`、`deal-items.test.js` 通過。

### R3 卡片同步重複

- `lib/orders.js:64-74` 與 `lib/reviews.js:53-66` 抽成「依 seq 更新最新卡片」的共用 helper。
- 驗收：只剩一份「排序訊息、更新最新卡片」的實作，`syncDealCard` 與 `syncReviewCard` 都呼叫它；`deal-response.test.js`、`reviews.test.js` 通過。

### R4 評分與四捨五入重複

- `lib/reviews.js:20`／`routes/reviews.js:112` 的 Rating 計算、`market/query.js:8`／`product-title.js:3` 的 `round1` 各留一份，其餘 import。
- 驗收：評分換算（`Math.round(... * 10) / 10`）只剩一份 helper；`round1` 只有一個定義；`reviews.test.js`、`market-price.test.js`、`products.test.js` 通過。

### R5 前端格式化重複

- escape／money／date 三份（`app/05-product-view.js:3-20`、`app/10-trade-history.js:14-31`、`demo/views/html.js:3-44`）與行情快照格式化兩份（`demo/views/market.js:7-26`、`app/05-product-view.js:47-77`）收斂到單一模組。
- 驗收：`escapeHtml`、`money`、`dateTimeOf` 各只有一個定義；`grep -rn "function escape" frontend/assets/js` 只有一處；`market-card.test.js`、`trade-history.test.js`、`product-market.test.js` 通過。

### R6 Session 儲存單一擁有者

- `api/client.js:6-23` 與 `app/02-account.js:7-12` 都讀寫 `haisen_token_v1`／`haisen_user_v1`，由其中一處負責；順手修掉 `client.js:5` 指向已刪 `app.js` 的註解。
- 驗收：`grep -rn "haisen_token_v1\|haisen_user_v1" frontend/assets/js` 只出現在單一模組；登入→重整→登出的人工流程正常；`login-page.test.js`、`logout.test.js` 通過。

### R7 魚種別名雙來源

- `species.js:1` 宣稱唯一來源，但 `market/mappings.js:7-34` 重列名稱／別名（`加鱲` vs `嘉鱲`）。改為由 `species.js` 提供顯示名稱與別名，mappings 只存 code 與對照關係。
- 驗收：`grep -rn "嘉鱲\|加鱲" backend` 只在單一來源檔出現；`GET /api/species` 的名稱與別名輸出維持不變；`market-mappings.test.js`、`market-price.test.js` 通過。

### R8 `lib/orders.js` 職責拆分

- 可售數量、建立訊息、逾時掃描混在同一檔；依職責拆檔（注意 200 行上限與 `deal-status.js` 的依賴方向）。
- 驗收：拆分後每個檔案 ≤ 200 行；依賴方向單向（`deal-status.js` 不反向 require route）；`npm test` 全綠。

### R9 `tools/serve-frontend.js` 路徑檢查

- `:36` 用字串前綴比對，會放行 `frontend-evil/`；改用 `path.relative` 判斷是否逃出根目錄。
- 驗收：新增 `frontend/test/serve-frontend.test.js`（`npm test` 的 glob 會涵蓋），請求 `/../package.json` 與 `frontend-evil/x` 被拒，正常檔案仍可取得；`tools/serve-frontend.js` ≤ 200 行。

### R10 死欄位

- `routes/auth.js:19` 的 `completed_orders` 沒有寫入端點；併入 D1 階段 1 同一個 schema 清理 PR（移除，或改成 `completed_deals` 的別名）。
- 驗收：`grep -rn "completed_orders" backend frontend docs` 無結果（或只剩資料遷移註記）；`GET /api/auth/me` 回應不含該欄位；`npm test` 全綠。

## 建議順序與理由

1. 批次 1：使用者直接可見、且已有明確驗收條件。
2. 批次 2：決議已定（上下文判定，不設固定門檻）；S4 與 S5 同在對話狀態機，建議同一個 PR。
3. 批次 3：定義與文件一致性，風險低但會碰到測試與 UI 文案。
4. 批次 4：純重構，獨立 PR，避免與行為修正混在一起。

## 驗證方式（每批都要做）

- `npm test`（目前基準：255 通過）；後端測試使用暫存 `db.json`。
- 受影響檔案行數檢查（應無輸出）：`Get-ChildItem -Recurse -File -Include *.js,*.css,*.html frontend,backend,tools | Where-Object { (Get-Content -LiteralPath $_.FullName).Count -gt 200 }`。
- 人工流程：雙瀏覽器協議（S1、S2）、冷資料庫查週末行情（S3）、對話上架四種缺口（S4、S5）、編輯狀態取消上架（S5）、重量／數量消去與回問（S6）、整批＋每台斤雙價（S8）。
- 會員 API：login／register／me 回應都不含 `role`，含舊種子使用者（D1）。
- 文件同步：`docs/api/`、`docs/spec/`、對應 ticket 的 `## Comments` 與勾選狀態（依 `docs/agents/issue-tracker.md`）。

## 不在本計畫內

- **單位統一（使用者面重量改台斤）**：決議採公斤維持現行規格；若日後要改，需動提示、顯示、後端 `buildTitle`、`02-domain.md:308`、`03-flows.md:59` 與相關測試，約 15–20 個檔案，另開 ticket。
- `d2548a5`（登出清 token）與 `bedcbf8`（法規告知強調）沒有對應票，屬範圍外但合理的修正；若要補票，另開 ticket。
- `backend/db.json` 未提交的開發資料變更（city 值、`seller_terms_accepted_at`、移除 `market_reference_price`）由使用者自行決定是否提交。
