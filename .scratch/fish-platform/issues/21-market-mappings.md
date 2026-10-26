# 21: 系統魚種的主要新鮮代碼與市場對照

**What to build:** 建立兩份唯讀對照表：28 個系統魚種 → 一個主要新鮮官方代碼（含是否養殖），以及 21 個批發市場簡稱 → 縣市。只匯出會用到的代碼，不匯出官方全量約 400 筆。提供唯讀查詢介面（`GET /api/market/species-codes`、`GET /api/market/markets`），讓後續抓取知道要抓哪些代碼、哪個市場屬於哪個縣市。（規格：G-13、G-14）

**Blocked by:** 06（魚種單一來源）

**Status:** ready-for-human

- [x] `species_market_codes` 有 28 筆系統魚種的主要新鮮代碼；每筆有 `code`、`official_name`、`species_id`、`is_aquaculture`、`category`、`aliases`。
- [x] `1xxx` 只允許海鱸（1073）、虱目魚（1041）、鰻魚（1031）；其餘魚種用 `2xxx`／`4xxx`／`5xxx`；`3xxx` 凍結與 `6xxx` 加工一律不出現在對照表。
- [x] `is_aquaculture = true` 限海鱸、虱目魚、鰻魚、牡蠣（5012）、文蛤（5022）；香魚（2631）、白蝦（4015）為 false。
- [x] `market_locations` 有 21 個市場，每筆有市場簡稱、縣市、`verified`；未確認的市場以 `verified: false` 標記，供 #23 排除縣市加權、但仍計入全國平均。
- [x] `GET /api/market/species-codes` 與 `GET /api/market/markets` 唯讀、公開；`species-codes` 28 筆都有 `species_id`，`markets` 能區分 `verified` true／false。
- [x] 對照表的魚種識別碼與 `backend/lib/species.js` 一致，沒有另一份魚種清單。
- [x] 02／03／04／05／06／07、GLOSSARY 與測試同步。

## Comments

- 2026-10-27：已實作。對照表在 `backend/lib/market/mappings.js`，端點在 `backend/routes/market.js`；魚種清單仍只來自 `backend/lib/species.js`。
