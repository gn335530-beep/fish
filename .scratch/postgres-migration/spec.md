# 以 PostgreSQL + JSONB 取代 json-server

**Status:** ready-for-agent

**Source:** 2026-11-21 對話（Q1–Q10 grilling 收斂），以及 `docs/spec`、`GLOSSARY.md`、既有 ADR 與測試。

**這份文件只定義設計，不含實作。**

## Problem Statement

目前後端把全部資料存在單一 `db.json`（json-server 的 lowdb 執行時檔）。每一次寫入都是整檔重寫，沒有交易、沒有併發控制、沒有備份；`docs/spec/07-roadmap.md` 的風險表已把它列為「上正式環境前換資料庫」。兩個請求同時寫入時可能互相覆寫；檔案損毀即全部資料遺失。

對目前「學習／作品集」的目標而言，這個持久層也缺少可展示的東西：沒有 SQL、沒有索引、沒有交易、沒有 migration、沒有可重現的測試資料庫。使用者本身感受不到資料庫，但他們會感受到資料是否可靠：訊息、訂單、協議、評價與行情必須在重啟後仍存在，而且多步驟操作不能只完成一半。

前端、API 契約與網域行為都已經穩定；這次要換的是**持久層的實作**，不是產品行為。

## Solution

把持久層從 lowdb 的 JSON 檔換成 **PostgreSQL**（單機以 docker compose 提供），用原生 `pg` 驅動、全面非同步。資料形狀保持文件導向：

- 每個集合一張表：`id` ＋ 少數抽取查詢欄（供 `WHERE`／`ORDER BY`／索引）＋ `doc JSONB`（整筆原樣，是唯一事實來源）。
- 資料存取層（store）保留現有函式名稱，只改為 async；新增 `transaction(fn)`。
- 多步驟寫入（成交確認、評價送出、交易房刪除、流水號）包進交易。
- `db.seed.json` 仍是唯一可提交的種子來源，另加 `db:seed` 腳本；schema 以版本化 migration 管理。
- `json-server` 依賴移除，`express` 成為直接依賴。
- 測試改跑真 Postgres 測試庫；既有全部測試檔（backend 與 frontend）的斷言不變。
- 文件與 ADR 同步更新。

使用者在畫面上看到的 API、ID 格式、衍生欄位、錯誤碼與聊天行為完全不變。

## User Stories

1. 作為買家，我想在重新整理或後端重啟後仍看到我的訊息、訂單與評價，以便交易紀錄不會消失。
2. 作為釣客，我想上架、下架、重新上架與刪除商品的行為和現在完全一樣，以便我不用重新學流程。
3. 作為使用者，我想所有 API 路徑、請求與回應格式維持不變，以便前端完全不用改。
4. 作為使用者，我想商品 ID 維持 `prd_YYYYMMDD_NNN` 且硬刪後不重用，以便舊訂單與對話卡片不會指到新商品。
5. 作為使用者，我想交易房、訂單、協議與評價的 ID 格式維持不變，以便歷史資料仍可追溯。
6. 作為使用者，我想訊息 `seq` 維持全域單調遞增，以便輪詢用「大於上次序號」取增量時不漏訊息。
7. 作為使用者，我想成交確認是原子的：訂單狀態、已售尾數、雙方成交筆數與系統訊息要嘛全成功、要嘛全不變，以便不會看到半套交易。
8. 作為使用者，我想評價送出是原子的：寫入評價、重算平均星等、未到次數與黑名單要嘛全成功，以便信用分數不會算錯。
9. 作為使用者，我想刪除交易房是原子的：房間、訊息、未成交訂單與項目要嘛全刪、要嘛全留，以便不會留下孤兒資料。
10. 作為使用者，我想兩個請求同時寫入時資料不會互相覆寫，以便併發操作安全。
11. 作為使用者，我想商品的可售尾數、商品狀態與角色評分等衍生值仍是讀取時計算，以便行為與文件一致。
12. 作為使用者，我想錯誤回應（400／401／403／404／409）與現在一致，以便前端的錯誤處理不用改。
13. 作為使用者，我想上傳圖片仍掛在 `/uploads`、種子圖片仍可讀，以便商品照片不破圖。
14. 作為使用者，我想助手房的 AI 行為與交易房的真人對話行為不變，以便這次換資料庫不影響對話體驗。
15. 作為使用者，我想行情查詢仍走官方代碼字典、21 個市場對照與 90 天保留，以便行情數字與來源不變。
16. 作為使用者，我想種子示範資料（使用者、商品、對話、訂單、評價）可一鍵重建，以便重現示範情境。
17. 作為維護者，我想種子仍以 `db.seed.json` 為唯一可提交來源，以便不用維護第二份種子。
18. 作為維護者，我想有版本化的 schema migration，以便 schema 變更能追蹤、重放與回滾思路清楚。
19. 作為維護者，我想有 `db:migrate` 與 `db:seed` 兩個明確入口，以便本機與 CI 能重建環境。
20. 作為維護者，我想 `docker compose up db` 就能啟動 Postgres，以便不用手動安裝與設定資料庫。
21. 作為維護者，我想資料庫有具名 volume，以便容器重啟後資料不消失。
22. 作為開發者，我想資料存取層維持同一組函式名稱（只變 async），以便約 30 個直接依賴 store 的檔案的呼叫點是機械式改寫，而不是重新設計。
23. 作為開發者，我想資料存取集中在單一層，以便未來換引擎或調索引只改一層。
24. 作為開發者，我想查詢欄有對應索引，以便商品依地區／魚種／钓客、訊息依房間／序號、行情依代碼／日期查詢有效率。
25. 作為開發者，我想 `all()` 回傳的物件形狀與現在完全相同，以便 route 與 lib 邏輯不用理解新的資料形狀。
26. 作為開發者，我想有 `store.transaction(fn)` 邊界，以便多步驟寫入共用同一個 client。
27. 作為開發者，我想 `messages.seq` 由 Postgres 序號提供，以便併發下不重複（序號出現缺口不影響輪詢）。
28. 作為開發者，我想每日流水號計數器在交易內以鎖或唯一約束保護，以便不產生重複 ID。
29. 作為開發者，我想 `market_locations` 與 `market_fetch_state` 使用自然鍵，以便保留現有資料語意。
30. 作為開發者，我想 app 啟動是顯式 async 初始化（連線 → migration → 市場對照 → 商品正規化），以便 DB 未就緒時不會開始接收請求。
31. 作為開發者，我想移除 `json-server`、改直接依賴 `express`，以便不再為 lowdb 付費。
32. 作為開發者，我想每個程式碼檔案仍不超過 200 行，以便遵守專案規範。
33. 作為維護者，我想 `npm test` 跑在真 Postgres 測試庫上，以便測到真的 SQL、JSONB 與交易，而不是模擬器。
34. 作為維護者，我想每個測試檔有自己乾淨的測試庫（migrate ＋ fixture ＋ teardown），以便測試檔可平行執行、互不污染。
35. 作為維護者，我想既有全部測試檔的斷言維持不變，以便證明行為真的沒變。
36. 作為維護者，我想有一個專注的交易測試（commit／rollback），以便回滾語意被鎖住。
37. 作為維護者，我想 `docs/spec`、README 與 ADR 同步更新，以便文件與程式一致。
38. 作為維護者，我想有一份 ADR 記錄「為何是 Postgres＋JSONB、為何保留可讀 ID」，以便未來讀者理解取捨。
39. 作為維護者，我想 `GLOSSARY.md` 不需要改動，以便領域語彙與實作細節維持分離。

## Implementation Decisions

### 1. 引擎與部署

- 使用 **PostgreSQL 16**，以 docker compose 的單一 `db` service 提供；具名 volume 保存資料；healthcheck 用 `pg_isready`。
- 後端仍在本機以 `npm run backend` 執行，透過 `DATABASE_URL` 連線；不把 Node app 容器化。
- 移除 `json-server` 依賴；`express` 提升為直接依賴；body parsing 改用 Express 內建 JSON 解析。
- 新增 `.env.example` 記錄 `DATABASE_URL`；`.env` 仍不進版控。

### 2. 資料存取層

- 保留既有函式名稱與語意：`all`、`findById`、`insert`、`setAll`、`dropCollection`、`patch`、`remove`、`nextCode`、`nextStableCode`、`nextProductCode`、`bumpStableCode`、`nextNumericId`、`nextSeq`，全部改為 async。
- 新增 `transaction(fn)`：從連線池取一個 client，`BEGIN` 後把具交易語意的存取介面傳給 `fn`，成功 `COMMIT`、丟錯 `ROLLBACK`，最後釋放 client。
- `doc JSONB` 是唯一事實來源：`all()` 回傳 `doc`（形狀與現在相同），抽取欄位只是寫入時的投影，供查詢與索引。
- 連線池在全域初始化一次，並注入資料存取層；其他模組不直接持有 pool。
- 依 200 行規範拆分：公開 API、欄位投影／SQL、交易輔助、migration runner 各自獨立檔案。

### 3. Schema

每張表都有 `doc JSONB NOT NULL` 存整筆資料，另有主鍵與抽取查詢欄：

| 表 | 主鍵 | 抽取查詢欄 |
| --- | --- | --- |
| `users` | `id` INTEGER | `username` TEXT UNIQUE |
| `products` | `id` TEXT | `seller_id`、`region`、`fish_species`、`species_code`、`listed_at`、`created_at`、`client_request_id` |
| `counters` | `id` TEXT | `value` INTEGER |
| `conversations` | `id` TEXT | `type`、`buyer_id`、`seller_id`、`last_message_at`、`user_ids` JSONB（GIN） |
| `messages` | `id` TEXT | `conversation_id`、`seq` BIGINT UNIQUE、`sender_id` TEXT、`created_at` |
| `deals` | `id` TEXT | `conversation_id`、`buyer_id`、`seller_id`、`deal_status`、`updated_at` |
| `reviews` | `id` TEXT | `deal_id`、`reviewer_id`、`target_user_id`、`reviewer_role` |
| `market_prices` | `id` TEXT | `species_code`、`trade_date` DATE、`market_name` |
| `market_species_catalog` | `id` TEXT | `species_code` INTEGER UNIQUE |
| `market_catalog_state` | `id` TEXT（`"catalog"`） | — |
| `market_locations` | `market_name` TEXT | `region`、`verified` BOOLEAN |
| `market_fetch_state` | `species_code` INTEGER | — |

- 索引至少涵蓋：`products`（`seller_id`、`region`、`fish_species`、`listed_at DESC`、`created_at`、`client_request_id`）、`messages`（`conversation_id, seq`、`seq` 唯一）、`deals`（`buyer_id`、`seller_id`、`conversation_id`、`deal_status`）、`reviews`（`deal_id, reviewer_id` 唯一、`target_user_id, reviewer_role`）、`market_prices`（`species_code, trade_date`、`trade_date`）、`conversations`（`user_ids` GIN、`last_message_at DESC`）。
- `market_locations` 以 `market_name` 為自然鍵（現況列沒有 `id` 欄位，只有 `market_name`／`region`／`verified`／`note`）；`market_fetch_state` 以 `species_code` 為自然鍵（現況 `id` 是 `mfs_<code>` 字串，另有 `species_code` 欄位；遷移後改以 `species_code` 為鍵，`mfs_` 前綴 id 不保留）。
- `reviews` 的「`deal_id` ＋ `reviewer_id` 唯一」由資料庫唯一約束把關；API 仍回原本的 409。
- `products` 的「同釣客同 `client_request_id` 只建立一筆」由部分唯一索引把關；沒有識別碼的舊資料不受影響。

### 4. ID 與序號

- 可讀 ID 全部保留：`prd_／conv_／msg_／deal_／rev_` 加上台灣日期與三位流水號。
- `counters` 表保留；每日流水號的「讀最大值 → 寫回」在交易內以 `FOR UPDATE` 或唯一約束保護，硬刪後不重用。
- `users.id` 維持整數、由既有的 max＋1 產生，並在交易內保護。
- `messages.seq` 改由 Postgres `SEQUENCE` 產生，維持全域單調遞增；序號缺口可接受，輪詢只看「大於上次序號」。
- `findById` 維持字串寬容比較（`String(row.id) === String(id)`），不因欄位型別改變行為。

### 5. Migration 與種子

- Schema 以版本化 SQL migration 管理（編號檔案 ＋ 極簡 runner），已套用的版本記錄在 `schema_migrations`。
- `db.seed.json` 仍是唯一可提交的種子來源；`db:seed` 會清空資料表再灌入，結果可重現。種子只涵蓋 7 個集合（users／products／conversations／messages／deals／reviews／counters）；5 個 market 表（market_prices／market_fetch_state／market_species_catalog／market_catalog_state／market_locations）是 runtime 由 `markets.js` 對照與官方代碼同步建立，不來自 seed，啟動流程會重新同步。
- 移除「第一次啟動時把 seed 複製成執行時 `db.json`」的機制；`backend/db.json` 不再使用。
- 啟動時的商品正規化與市場對照同步改成 async，順序為：套 migration → 同步市場對照 → 正規化商品 → 開始接收請求。

### 6. 交易邊界

以下多步驟操作包進 `transaction(fn)`：

- 訂單提案、回應、取消與逾時轉換（訂單狀態 ＋ 商品保留／已售 ＋ 系統訊息）。
- 評價送出（寫入評價 ＋ 重算星等／未到次數／黑名單 ＋ 更新訂單評價狀態與卡片）。
- 交易房刪除（房間、訊息、未成交訂單與項目的級聯）。
- 商品建立（`client_request_id` 冪等檢查 ＋ 流水號 ＋ 寫入）。
- 訊息寫入（序號 ＋ 訊息 ＋ 更新房間 `last_message_at`）。

其餘單一資料列寫入不強制包交易。

### 7. 行為不變保證

- API 路徑、請求／回應格式、錯誤碼、ID 格式、衍生欄位、聊天輪詢、AI 行為、行情查詢與保留政策全部不變。
- 遵守既有 ADR：0001（交易房每組買賣方向一間）、0002（商品狀態即時推導）、0009（商品下架／刪除與 ID 不重用）等。
- 記憶體狀態（Token、AI 地區暫存、in-flight 去重）維持在記憶體，不進資料庫。

## Testing Decisions

### 什麼是好測試

- 只測**外部可觀察行為**：HTTP 請求與回應、可觀察的資料結果；不 assert SQL 字串、不 assert 資料表結構、不 mock 資料存取層。
- 既有斷言是行為契約：測試檔的斷言內容不因換資料庫而改變，只補上 async 的 `await` 與新的測試庫生命週期。

### 接縫

1. **HTTP API（主接縫，既有）**：沿用測試 client 啟動真正的 app（隨機埠）並登入測試帳號；測試用 `fetch` 打真實端點。所有「行為不變」在此驗證。
2. **資料存取層（既有 arrange 管線）**：測試沿用 `setAll／insert／patch／all` 安排與重置資料；函式名稱不變，只改成 async。
3. **`transaction`（唯一新增接縫）**：一個小型單元測試驗證成功提交與丟錯回滾。

### 測試資料庫

- `npm test` 需要先 `docker compose up -d db`。
- 每個測試檔建立自己唯一命名的 Postgres 測試庫，套 migration、灌入 fixture，結束時刪除。這與現在「每個測試檔一份暫存 db.json」的隔離語意一致，也讓測試檔能平行執行。
- 測試 client 的 `start()` 負責連線與初始化，`stop()` 負責關閉連線池。
- 需要 `CREATEDB` 權限；compose 的預設 superuser 已具備。

### 受測模組與既有先例

- 受測範圍：整個 HTTP API ＋ 資料存取層的交易邊界。
- 既有先例：`backend/test/product-lifecycle.test.js`、`backend/test/conversation-delete.test.js`、`deal-*` 系列測試（起真 app ＋ `fetch`）與其 helper。
- 交易測試可放在同一測試檔的測試庫內，不另開接縫。

## Out of Scope

- 密碼雜湊、Token 持久化、CORS 收斂、上傳檔頭驗證（Roadmap R-13）維持現狀：`users.password` 仍為明文。
- 前端任何程式碼或畫面改動。
- 完全正規化（`deal_items`、`read_at`、訊息卡片拆表）。
- 正式環境部署、備份策略、多實例、讀寫分離、連線池調校。
- 變更 API 契約、ID 格式、衍生欄位或 AI 行為。
- 引入 ORM、TypeScript 或 build step。
- 從現有開發 `db.json` 遷移真實資料；只從 `db.seed.json` 重建。
- 管理介面、資料庫 GUI、效能調校與資料保留政策變更。

## Further Notes

- **ADR-0016 待寫**：記錄「PostgreSQL＋JSONB 取代 json-server」的三項取捨（引擎、schema 形狀、同步→非同步），以及為何保留應用層可讀 ID。
- **文件同步清單**：`docs/spec/01-overview.md`（後端描述）、`docs/spec/04-data-model.md`（儲存、保留與備份）、`docs/spec/05-api.md`（json-server 預設路由的敘述）、`docs/spec/07-roadmap.md`（風險表的單檔與併發、備份列）、`backend/README.md`、`README.md`。
- `GLOSSARY.md` **不需改動**：這次是純實作變更，沒有新增領域概念。
- 主要風險與對策：async 漏 `await`（用既有測試守住、逐檔 review 寫入點）；抽取欄位的 SQL 與現有 `filter／sort` 語意漂移（`doc` 仍是唯一來源、逐一對照）；`seq` 缺口（可接受、不影響增量輪詢）。
- `messages.seq` 用 `SEQUENCE` 是本次唯一允許的「可觀察細微差異」：序號可能不連續，但單調遞增保證不變。
- 200 行規範：新的資料存取層與 migration runner 需依職責拆檔，不可為省行數壓縮。
