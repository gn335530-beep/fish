# 23: 行情查詢 API 與歷史序列

**What to build:** 提供公開行情查詢：依魚種與縣市找最近交易日（或指定日期前）的平均價；縣市無資料時退回同日全國平均；一律回 `trade_date`、`scope`、`region`、`source`、`source_url`、`quality`、`is_aquaculture`。平均價以交易量加權；回傳元／公斤與元／台斤（小數 1 位）。`include=history&days=7|30` 回當地縣市（或全國）最近 N 個交易日的每日平均價序列（`days` 是交易日數，回傳最多 N 筆有交易的日期），供行情卡走勢。查無資料回 `found:false`，不回 0。（規格：G-16、AC-3～AC-6、F10、ADR 0003、ADR 0004）

**Blocked by:** 22

**Status:** ready-for-human

- [x] 縣市有資料 → `scope = "city"`，平均價為該縣市市場以交易量加權；元／台斤換算正確（1237 → 742.2）。
- [x] 縣市無資料但全國有 → `scope = "national"`，標示「全國平均」。
- [x] 縣市加權只納入 `market_locations.verified = true` 的市場；全國平均納入所有市場（含未確認）。
- [x] 指定日期時取「該日或之前最近交易日」，回傳實際 `trade_date`。
- [x] 回應含 `trade_date`、`scope`、`region`、`price_per_kg`、`price_per_taijin`、`source`、`source_url`、`quality`、`is_aquaculture`；`found:false` 時不得帶價格欄位。
- [x] 完全沒有行情 → `found:false`、`reason:"NO_TRADE_DATA"`；價格欄位不得出現數字。
- [x] 上游失敗且無快取 → `found:false`、`reason:"UPSTREAM_UNAVAILABLE"`；有快取就回快取。
- [x] 未知 `species_id` → 400 `INVALID_SPECIES`；已對照但無資料 → 200 `NO_TRADE_DATA`；未對照 → 200 `NO_MAPPING`；無效縣市 → 400 `INVALID_REGION`；日期格式錯 → 400 `INVALID_DATE`。
- [x] `is_aquaculture` 正確；`include=history&days=7|30` 回最近 7／30 個交易日（最多 N 筆有交易日期）；`summary` 端點不存在。
- [x] 行情 API 公開免登入；`region` 省略回全國；`臺` 比對為 `台`。
- [x] 02／03／04／05／06／07 與測試同步。

## Comments

- 2026-10-27：已實作。`GET /api/market/prices` 在 `backend/routes/market.js`，查詢與加權在 `backend/lib/market/query.js`。
