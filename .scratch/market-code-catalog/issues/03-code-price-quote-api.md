# 03: 代碼查價與整合行情 API

**What to build:** 讓行情可以用官方代碼查詢，並提供一次完成「名稱 → 代碼 → 價格」的整合查詢。回傳代碼、官方名稱、均價、交易日期、縣市或全國平均、來源與養殖旗標。過渡期仍保留舊的 `species_id` 查價，讓既有呼叫端不會中斷。

**Blocked by:** 02

**Status:** resolved

- [x] 用代碼 2141 查價可取得土魠的行情與官方名稱。
- [x] 用「土魠魚」加縣市查整合行情，可直接取得同一筆結果。
- [x] 整合查詢遇到多個候選時回傳 `AMBIGUOUS_SPECIES` 與候選清單。
- [x] 有代碼但當日無交易時回傳 `NO_TRADE_DATA`。
- [x] 上游失敗但本機有舊行情時，回傳舊行情與實際交易日期。
- [x] 上游失敗且沒有本機行情時回傳 `UPSTREAM_UNAVAILABLE`。
- [x] 行情回應包含 `species_code`、`official_name`、平均價、交易日期、來源與養殖旗標。
- [x] 每次價格查詢仍重抓上游，字典快取不影響價格查詢。
- [x] 過渡期仍可用舊的 `species_id` 查價。
- [x] 後端 HTTP 測試涵蓋代碼查價、整合查詢、多候選、查無交易與上游失敗回舊資料。

## Comments

2026-10-28 完成。`GET /api/market/prices?code=2141` 可用官方代碼查價；`GET /api/market/quote?q=土魠魚&region=高雄市` 完成名稱→代碼→價格。多候選回 409 `AMBIGUOUS_SPECIES` 與 `candidates`，查無回 404 `SPECIES_NOT_FOUND`，字典不可用回 503 `CATALOG_UNAVAILABLE`。行情結果新增 `species_code`、`official_name`，舊 `species_id` 查價維持可用。行情查詢以 `species_code` 讀取本機價格，價格查詢仍每次重抓上游。新增 `backend/lib/market/quote-service.js` 與 `backend/test/market-code-quote.test.js`。
