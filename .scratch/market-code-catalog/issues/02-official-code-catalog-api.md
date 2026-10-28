# 02: 官方代碼字典與查代碼 API

**What to build:** 建立官方新鮮代碼字典與查代碼端點。使用者或系統可以用官方名稱、常見別名或數字代碼查到候選魚種；多個代碼符合時回傳候選，查無時回傳明確錯誤。字典會在執行時自動同步、分頁取得全部資料、排除凍結與加工代碼、快取 24 小時，並在同步失敗時沿用舊字典。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 查詢「土魠魚」可取得官方代碼 2141（土魠）的候選。
- [x] 查詢「吳郭魚」「鮭魚」或直接輸入數字代碼，都能取得對應候選。
- [x] 查詢「石斑」這類對到多個代碼的名稱時，回傳穩定排序的候選清單，不自動選第一個。
- [x] 查無名稱時回傳 `SPECIES_NOT_FOUND`。
- [x] 字典同步會排除 `3xxx` 凍結與 `6xxx` 加工代碼，保留新鮮代碼。
- [x] 同一代碼跨日期出現多個官方名稱時，所有名稱都能查到該代碼。
- [x] 字典同步支援分頁，能取得超過單次上限的資料。
- [x] 字典快取 24 小時；同步失敗但已有舊字典時，查詢仍可用。
- [x] 完全沒有字典時回傳 `CATALOG_UNAVAILABLE`。
- [x] 候選包含代碼、官方名稱與是否養殖。
- [x] 後端 HTTP 測試涵蓋同步、分頁、過濾、別名、多候選、查無與同步失敗。

## Comments

2026-10-28 完成。新增 `GET /api/market/codes?q=`：省略 `q` 回傳完整字典；有 `q` 時回傳 `candidates`，查無回 404 `SPECIES_NOT_FOUND`。字典存於 `market_species_catalog`，同步狀態存於 `market_catalog_state`；同步範圍為最近 30 天，以 `$top=10000` 與實際回傳筆數推進 `$skip` 直到空頁，排除 3xxx／6xxx，同一代碼的所有官方名稱保留為別名。成功同步快取 24 小時；失敗或回空資料時保留舊字典，完全沒有字典回 503 `CATALOG_UNAVAILABLE`。相關程式在 `backend/lib/market/catalog-*.js` 與 `backend/routes/market-catalog.js`，測試為 `market-catalog-sync.test.js`、`market-catalog-lookup.test.js`。
