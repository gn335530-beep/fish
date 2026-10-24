# 08: 移除未使用 API 與前端死狀態

**What to build:** 移除沒有任何畫面或流程會呼叫的 API 函式與前端狀態，包括舊商品 API 的建立／刪除函式、未接 UI 的個人檔案更新函式，以及助手面板與 demo store 裡永遠不會用到的狀態。完成後，程式裡留下的每個匯出函式都有實際呼叫者。（規格：R-8）

**Blocked by:** 01（移除購物車與假交易路徑）、03（漁獲列表改接商品 API）、04（商品詳情改讀真實商品）

**Status:** resolved

- [x] 舊商品模型的建立與刪除函式已移除，且沒有呼叫端。
- [x] 未接 UI 的個人檔案更新函式已移除。
- [x] demo store 的 `busy`／`resetRoom` 與面板的 `setTitle`／`clearInput`／`focusInput` 等死狀態已移除。
- [x] 全專案搜尋不到指向已刪除函式的呼叫。

## Comments

- 2026-10-25：已實作。`createFish`／`deleteFish` 已隨舊 `api/fish.js` 在 ticket 05 移除。本次移除 `api/auth.js` 的 `updateProfile`、`demo/store.js` 的 `busy`／`resetRoom`、`demo/views/panel.js` 的 `setTitle`／`clearInput`／`focusInput` 與未使用的 `fm-title` 參照；另外把只在模組內部使用的 export 收回（`compressImage`、`refreshMessages`、`stopPolling`、`SLOT_ORDER`、`emptyDraft`、`round1`、卡片子函式、`TAIWAN_REGIONS`）。
