# 08: 刪除前端舊魚種模組與 API 用戶端

**What to build:** 前端不再載入或呼叫舊的魚種 API，也不再匯入舊魚種模組。魚種查詢一律走官方代碼字典，地區功能走獨立地區模組；所有頁面與助手流程維持正常。

**Blocked by:** 04, 06, 07

**Status:** resolved

- [x] 前端沒有任何地方呼叫 `/api/species`。
- [x] 前端沒有任何地方匯入或使用舊魚種模組、`speciesById`、`speciesList`、`findSpecies`。
- [x] 各頁面不再載入舊魚種 API 用戶端。
- [x] 助手問行情、上架行情卡與地區解析仍正常運作。
- [x] 商品頁、商品列表與導購不因移除舊模組而壞掉。
- [x] 前端測試全數通過，且沒有殘留舊魚種模組的死碼引用。

## Comments

2026-10-28 完成。刪除 `frontend/assets/js/api/species.js` 與 `frontend/assets/js/demo/ai/species.js`，四個頁面移除舊 API script。上架、導購、商品諮詢與頁面載入改走官方代碼字典或商品欄位；地區仍使用 `shared/regions.js`。`main.js` 啟動時預載官方字典，失敗時流程仍可用名稱查詢。測試 fixture 不再模擬 `/api/species`。
