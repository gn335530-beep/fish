# 02: Schema、migration 與種子

**What to build:** 用版本化 migration 建立 12 張表與索引，並提供可重現的種子匯入。完成後可以用 SQL 直接查詢示範資料，但 app 仍未接上新 schema。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `npm run db:migrate` 建立 12 張表：`users`、`products`、`counters`、`conversations`、`messages`、`deals`、`reviews`、`market_prices`、`market_species_catalog`、`market_catalog_state`、`market_locations`、`market_fetch_state`
- [ ] 每張表都有主鍵、`doc JSONB NOT NULL` 與 spec 列出的抽取查詢欄；`users.id` 為整數、`market_locations` 以 `market_name` 為鍵、`market_fetch_state` 以 `species_code` 為鍵
- [ ] 索引就位：商品（釣客／地區／魚種／上架時間／建立時間／識別碼）、訊息（房間＋序號、序號唯一）、訂單（買家／釣客／房間／狀態）、評價（訂單＋評價者唯一、被評價者＋角色）、行情（代碼＋日期、日期）、對話（參與者 GIN、最後訊息時間）
- [ ] `reviews` 的「`deal_id` ＋ `reviewer_id` 唯一」與 `products` 的「同釣客同 `client_request_id` 只一筆」由唯一索引把關
- [ ] `npm run db:seed` 清空後從 `db.seed.json` 灌入，重跑結果一致
- [ ] migration 重跑具冪等性，已套用版本記錄在 `schema_migrations`
- [ ] app 仍以 lowdb 執行，尚未接上新 schema
