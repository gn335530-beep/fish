# 01: Playwright 視覺測試骨架與首頁 smoke

**What to build:** 建立一個可重複執行的 Playwright 視覺驗證路徑。完成後，任何人可用 `npm run test:e2e` 啟動前台與測試後端，載入首頁，開關助手面板，確認桌機與手機都沒有水平溢出。這個 ticket 也要建立後續 tickets 共用的登入 helper、行情卡固定資料 fixture 與截圖 baseline 規則；`npm test` 仍只跑既有 Node 測試。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `npm run test:e2e` 可在本機啟動前台與測試後端，跑完至少一個首頁 smoke 案例。
- [x] 首頁在 1280×800 與 390×844 沒有水平溢出；助手面板可開啟、關閉，開啟後尺寸與關閉狀態可被斷言。
- [x] 測試不呼叫真實批發行情 API；行情卡 fixture 使用固定資料。
- [x] 截圖 baseline 以改動前畫面為準；若先改程式才建立 baseline，已回到固定點重新截圖比對。
- [x] `npm test` 仍可在沒有瀏覽器的環境通過。
- [x] 新測試與設定檔不超過 200 行；過長已依頁面案例拆分。

## Comments

- 2026-11-10：新增 `playwright.config.js` 與 `e2e/`。`npm run test:e2e` 啟動測試後端（3101，每次從 seed 重建 `e2e/.data/db.json`）與靜態前台（8090），只跑 chromium 的桌面 1280×800 與手機 390×844。測試在瀏覽器層改寫 `config.js` 的 API base，不碰開發中的 3001；行情 API 由 `e2e/fixtures/market.js` 固定資料攔截，魚種字典使用 `species_code`，7／30 日各自回對應 history。已建立 seed 買家／釣客登入 helper、水平溢出斷言、面板 baseline 與 `e2e/README.md` 的 baseline 規則；商品卡 baseline 是在改 CSS 前回到固定點截圖。截圖 baseline 目前以 win32 建立，其他平台預設只跑幾何斷言，可用 `E2E_VISUALS=1` 重建。

