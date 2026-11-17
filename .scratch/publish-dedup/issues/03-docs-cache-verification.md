# 03: 文件、快取版本與最終驗收

**What to build:** 把這次防重複行為收進正式規格與部署版本：更新上架流程、資料模型、商品建立 API、草稿卡 UI、路線圖驗收條件與後端 README，讓文件與程式說同一件事。所有載入草稿卡樣式的頁面統一把樣式版本升到 `v10`，所有載入助手前端的頁面統一把進入模組版本升到 `v18`，並更新既有快取版本 e2e 的最低版本。最後跑完整測試，確認沒有超出 spec 的 API、資料或 UI 行為。

**Blocked by:** 01、02.

**Status:** resolved

- [x] `docs/spec/03-flows.md` 的 F2 步驟 12 寫明：按下確認上架後立即鎖定、重複點擊不重複建立、重送回傳同一筆商品。
- [x] `docs/spec/04-data-model.md` 的 `products` 新增內部 `client_request_id`，並註明商品 API 不外露。
- [x] `docs/spec/05-api.md` 的建立商品 API 寫明可選欄位、首次 201、重送 200、first write wins，以及既有錯誤碼不變。
- [x] `docs/spec/06-ui.md` 的草稿卡寫明「上架中…」、三個動作停用、`aria-busy` 與失敗錯誤回饋。
- [x] `docs/spec/07-roadmap.md` 新增一條驗收條件：連續點擊確認上架只會產生一筆商品。
- [x] `backend/README.md` 的建立商品端點加註同釣客、同識別碼的冪等行為。
- [x] 所有載入 `deal-cards.css` 的頁面使用一致且不低於 `v10` 的版本。
- [x] 所有載入助手前端的頁面使用一致且不低於 `v18` 的 `main.js` 版本。
- [x] 快取版本 e2e 把 `deal-cards.css` 的最低版本提高到 `v10`。
- [x] `npm test` 全綠，且發布相關的新測試確實被執行。
- [x] `npm run test:e2e` 全綠，快取版本檢查涵蓋更新後的版本。
- [x] 所有修改與新增的程式碼檔案不超過 200 行；文件與程式一致，沒有超出 spec 的額外行為。

## Comments

- 2026-11-17：同步 flows、data model、API、UI、roadmap、backend README、API README 與 spec README（v1.7）。五個載入頁面的 `deal-cards.css` 由 v9 升到 v10、`main.js` 由 v17 升到 v18；快取 e2e 最低版本提高到 v10。另修正 `assistant-offline.spec.js` 既有 selector 同時命中開啟與刪除按鈕的問題，改為限定 `data-action="room"`，讓 e2e 能驗證完整流程。`npm test` 691 通過、`npm run test:e2e` 38 通過；所有程式碼檔案皆低於 200 行。
